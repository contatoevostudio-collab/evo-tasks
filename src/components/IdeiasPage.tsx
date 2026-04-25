import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiPlus, FiSearch, FiX, FiLink, FiTrash2, FiGrid, FiList, FiColumns,
  FiMic, FiCheck, FiCalendar, FiArrowRight, FiRotateCcw, FiMenu,
} from 'react-icons/fi';
import { useIsMobile } from '../hooks/useMediaQuery';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, subWeeks, getISOWeek, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIdeasStore, TAG_CONFIG, STATUS_CONFIG } from '../store/ideas';
import { useTaskStore } from '../store/tasks';
import { useProposalsStore } from '../store/proposals';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import type { Idea, IdeaTag, IdeaStatus } from '../types';

const TAGS = Object.entries(TAG_CONFIG) as [IdeaTag, { label: string; color: string }][];
const STATUSES: IdeaStatus[] = ['rascunho', 'desenvolvendo', 'executada', 'arquivada'];

type ViewMode = 'grid' | 'list' | 'kanban';
type SortMode = 'date-desc' | 'date-asc' | 'alpha' | 'updated';
type Density = 'compact' | 'normal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isLikelyDuplicate(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  return intersection / Math.min(wa.size, wb.size) >= 0.7;
}

function autoLink(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(https?:\/\/[^\s]+)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    const url = match[0];
    parts.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {url.length > 32 ? url.slice(0, 32) + '…' : url}
      </a>
    );
    lastIdx = match.index + url.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function detectInlineTags(text: string): { stripped: string; foundTag: IdeaTag | null } {
  let foundTag: IdeaTag | null = null;
  const stripped = text.replace(/#(\w+)/g, (_m, tag) => {
    const lower = (tag as string).toLowerCase();
    if (lower in TAG_CONFIG) {
      foundTag = lower as IdeaTag;
      return '';
    }
    return _m;
  }).replace(/\s+/g, ' ').trim();
  return { stripped, foundTag };
}

// Stable seedable pseudo-random for "Idea of the week"
function deterministicPick<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  // Simple mulberry-like index
  const x = Math.sin(seed) * 10000;
  const idx = Math.floor((x - Math.floor(x)) * items.length);
  return items[idx % items.length];
}

function calcStreak(ideas: Idea[]): number {
  const dates = new Set(
    ideas
      .filter((i) => !i.deletedAt)
      .map((i) => i.createdAt.slice(0, 10))
  );
  let streak = 0;
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  // If today has no idea, start counting from yesterday but don't break streak
  const todayKey = day.toISOString().slice(0, 10);
  if (!dates.has(todayKey)) {
    day.setDate(day.getDate() - 1);
  }
  while (true) {
    const key = day.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
      day.setDate(day.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ─── Sortable wrapper for pinned ideas grid ─────────────────────────────────

function SortableIdeaCardWrapper({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {children}
    </div>
  );
}

// ─── Idea Modal ─────────────────────────────────────────────────────────────

function IdeaModal({
  onClose,
  editing,
}: {
  onClose: () => void;
  editing?: Idea;
}) {
  const { addIdea, updateIdea, ideas, addSubtask, toggleSubtask, deleteSubtask } = useIdeasStore();
  const { companies } = useTaskStore();
  const allProposals = useProposalsStore(s => s.proposals);
  const linkableProposals = allProposals.filter(p => p.status !== 'rascunho');

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDesc] = useState(editing?.description ?? '');
  const [tag, setTag] = useState<IdeaTag>(editing?.tag ?? 'negocio');
  const [extraTags, setExtraTags] = useState<IdeaTag[]>(editing?.extraTags ?? []);
  const [link, setLink] = useState(editing?.link ?? '');
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
  const [status, setStatus] = useState<IdeaStatus>(editing?.status ?? 'rascunho');
  const [linkedCompanyId, setLinkedCompanyId] = useState<string>(editing?.linkedCompanyId ?? '');
  const [linkedProposalId, setLinkedProposalId] = useState<string>(editing?.linkedProposalId ?? '');
  const [reviewDate, setReviewDate] = useState<string>(editing?.reviewDate ?? '');
  const [linkedIdeaIds, setLinkedIdeaIds] = useState<string[]>(editing?.linkedIdeaIds ?? []);
  const [newSubtaskLabel, setNewSubtaskLabel] = useState('');
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  const tagColor = TAG_CONFIG[tag].color;

  // Live subtasks for current editing idea
  const currentIdea = editing ? ideas.find((i) => i.id === editing.id) : undefined;
  const subtasks = currentIdea?.subtasks ?? [];

  const possibleDuplicate = useMemo(() => {
    if (!title.trim() || editing) return null;
    const candidate = ideas.find(
      (i) => !i.deletedAt && isLikelyDuplicate(title, i.title)
    );
    return candidate ?? null;
  }, [title, ideas, editing]);

  const handleSave = () => {
    if (!title.trim()) return;
    if (possibleDuplicate && !duplicateOverride) return;
    const data: Partial<Idea> = {
      title: title.trim(),
      description: description.trim() || undefined,
      tag,
      extraTags: extraTags.length > 0 ? extraTags : undefined,
      link: link.trim() || undefined,
      pinned,
      status,
      linkedCompanyId: linkedCompanyId || undefined,
      linkedProposalId: linkedProposalId || undefined,
      reviewDate: reviewDate || undefined,
      linkedIdeaIds: linkedIdeaIds.length > 0 ? linkedIdeaIds : undefined,
    };
    if (editing) updateIdea(editing.id, data);
    else addIdea({ ...(data as Omit<Idea, 'id' | 'createdAt'>) });
    onClose();
  };

  const inputBase: React.CSSProperties = {
    width: '100%', background: 'var(--ib)', border: '1px solid var(--b2)',
    borderRadius: 10, padding: '10px 14px', color: 'var(--t1)', fontSize: 13,
    outline: 'none', resize: 'none' as const, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelSt: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
    color: 'var(--t4)', display: 'block', marginBottom: 6,
  };

  const toggleExtraTag = (id: IdeaTag) => {
    if (id === tag) return;
    setExtraTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleLinkedIdea = (id: string) => {
    setLinkedIdeaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const otherIdeas = ideas.filter((i) => !i.deletedAt && i.id !== editing?.id);

  const handleAddSubtask = () => {
    if (!editing || !newSubtaskLabel.trim()) return;
    addSubtask(editing.id, newSubtaskLabel.trim());
    setNewSubtaskLabel('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        style={{ width: 500, maxHeight: '85vh', overflowY: 'auto', background: 'var(--modal-bg)', borderRadius: 20, padding: '24px 24px 20px', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${tagColor}30` }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${tagColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tagColor}30` }}>
              <span style={{ fontSize: 17 }}>💡</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editing ? 'Editar Ideia' : 'Nova Ideia'}</span>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', borderRadius: 8, padding: 4 }}>
            <FiX size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelSt}>Título</label>
            <input
              style={{ ...inputBase, border: `1px solid ${tagColor}50`, fontSize: 14, fontWeight: 500 }}
              placeholder="Qual a ideia?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Duplicate warning */}
          {possibleDuplicate && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#ff9f0a', lineHeight: 1.5 }}>
                Parece com: <strong>"{possibleDuplicate.title}"</strong> — salvar mesmo assim?
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setDuplicateOverride(true)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #ff9f0a', background: '#ff9f0a', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Salvar mesmo assim
                </button>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label style={labelSt}>Descrição</label>
            <textarea
              style={{ ...inputBase, minHeight: 90, lineHeight: 1.6 }}
              placeholder="Desenvolva a ideia, contexto, referências... (URLs viram links no card)"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelSt}>Status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map((st) => {
                const cfg = STATUS_CONFIG[st];
                const active = status === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatus(st)}
                    style={{
                      padding: '5px 11px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 500,
                      border: `1px solid ${active ? cfg.color : 'var(--b2)'}`,
                      background: active ? `${cfg.color}18` : 'transparent',
                      color: active ? cfg.color : 'var(--t3)', cursor: 'pointer',
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary tag */}
          <div>
            <label style={labelSt}>Tag principal</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {TAGS.map(([id, cfg]) => (
                <button key={id} onClick={() => { setTag(id); setExtraTags((p) => p.filter((t) => t !== id)); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: tag === id ? 700 : 500, border: `1px solid ${tag === id ? cfg.color : 'var(--b2)'}`, background: tag === id ? `${cfg.color}18` : 'transparent', color: tag === id ? cfg.color : 'var(--t3)', cursor: 'pointer' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extra tags */}
          <div>
            <label style={labelSt}>Tags extras</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TAGS.filter(([id]) => id !== tag).map(([id, cfg]) => {
                const active = extraTags.includes(id);
                return (
                  <button key={id} onClick={() => toggleExtraTag(id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 500, border: `1px solid ${active ? cfg.color : 'var(--b1)'}`, background: active ? `${cfg.color}10` : 'transparent', color: active ? cfg.color : 'var(--t4)', cursor: 'pointer' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked company */}
          {companies.length > 0 && (
            <div>
              <label style={labelSt}>Empresa vinculada</label>
              <select
                value={linkedCompanyId}
                onChange={(e) => setLinkedCompanyId(e.target.value)}
                style={{ ...inputBase, cursor: 'pointer' }}
              >
                <option value="">— Nenhuma —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Linked proposal */}
          {linkableProposals.length > 0 && (
            <div>
              <label style={labelSt}>Vincular a proposta</label>
              <select
                value={linkedProposalId}
                onChange={(e) => setLinkedProposalId(e.target.value)}
                style={{ ...inputBase, cursor: 'pointer' }}
              >
                <option value="">— Nenhuma —</option>
                {linkableProposals.map((p) => (
                  <option key={p.id} value={p.id}>{p.clientName} — {p.service}</option>
                ))}
              </select>
            </div>
          )}

          {/* Review date */}
          <div>
            <label style={labelSt}>Revisitar em</label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer' }}
            />
          </div>

          {/* Subtasks (only when editing) */}
          {editing && (
            <div>
              <label style={labelSt}>Subtarefas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subtasks.map((st) => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                    <button
                      onClick={() => toggleSubtask(editing.id, st.id)}
                      aria-label={st.done ? 'Desmarcar subtarefa' : 'Marcar subtarefa'}
                      style={{
                        width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${st.done ? tagColor : 'var(--b3)'}`,
                        background: st.done ? tagColor : 'transparent', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      {st.done && <FiCheck size={9} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, color: st.done ? 'var(--t4)' : 'var(--t1)', textDecoration: st.done ? 'line-through' : 'none' }}>
                      {st.label}
                    </span>
                    <button
                      onClick={() => deleteSubtask(editing.id, st.id)}
                      aria-label="Excluir subtarefa"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex' }}
                    >
                      <FiX size={11} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Adicionar subtarefa..."
                    value={newSubtaskLabel}
                    onChange={(e) => setNewSubtaskLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                    style={{ ...inputBase, padding: '7px 10px', fontSize: 12 }}
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskLabel.trim()}
                    aria-label="Adicionar subtarefa"
                    style={{ padding: '0 12px', borderRadius: 8, border: 'none', background: tagColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: newSubtaskLabel.trim() ? 1 : 0.4 }}
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Linked ideas */}
          {otherIdeas.length > 0 && (
            <div>
              <label style={labelSt}>Ideias relacionadas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 140, overflowY: 'auto', border: '1px solid var(--b1)', borderRadius: 8, padding: 5, background: 'var(--ib)' }}>
                {otherIdeas.slice(0, 30).map((other) => {
                  const active = linkedIdeaIds.includes(other.id);
                  const cfg = TAG_CONFIG[other.tag];
                  return (
                    <button
                      key={other.id}
                      onClick={() => toggleLinkedIdea(other.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 6,
                        border: `1px solid ${active ? cfg.color : 'transparent'}`,
                        background: active ? `${cfg.color}10` : 'transparent',
                        color: 'var(--t1)', textAlign: 'left', cursor: 'pointer', fontSize: 11,
                      }}
                    >
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {other.title}
                      </span>
                      {active && <FiCheck size={11} color={cfg.color} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link */}
          <div>
            <label style={labelSt}>Link (opcional)</label>
            <div style={{ position: 'relative' }}>
              <FiLink size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', pointerEvents: 'none' }} />
              <input style={{ ...inputBase, paddingLeft: 34 }} placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          </div>

          {/* Pin */}
          <button
            onClick={() => setPinned(!pinned)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${pinned ? tagColor : 'var(--b2)'}`, background: pinned ? `${tagColor}10` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${pinned ? tagColor : 'var(--b3)'}`, background: pinned ? tagColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {pinned && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>📌 Fixar no topo</span>
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || (possibleDuplicate !== null && !duplicateOverride)}
          style={{
            width: '100%', marginTop: 20, padding: '13px 0', borderRadius: 12, border: 'none',
            background: tagColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            opacity: !title.trim() || (possibleDuplicate !== null && !duplicateOverride) ? 0.4 : 1,
            letterSpacing: '0.2px',
          }}
        >
          {editing ? 'Salvar Alterações' : 'Salvar Ideia'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Confirm Delete Modal ───────────────────────────────────────────────────

function ConfirmDeleteModal({
  count,
  onCancel,
  onConfirm,
  hard,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  hard?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        style={{ width: 380, background: 'var(--modal-bg)', borderRadius: 16, padding: 22, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${hard ? '#ff453a40' : '#ff9f0a40'}` }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
          {hard
            ? `Apagar ${count > 1 ? `${count} ideias` : 'ideia'} permanentemente?`
            : `Mover ${count > 1 ? `${count} ideias` : 'ideia'} para a lixeira?`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.55, marginBottom: 18 }}>
          {hard
            ? 'Esta ação não pode ser desfeita.'
            : 'Você pode restaurar pela lixeira nos próximos 30 dias.'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: hard ? '#ff453a' : '#ff9f0a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {hard ? 'Apagar' : 'Mover'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Idea Card (grid) ───────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: Idea;
  density: Density;
  bulkMode: boolean;
  selected: boolean;
  companyName?: string;
  companyColor?: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleSelect: () => void;
  onConvert: () => void;
}

function IdeaCard({
  idea, density, bulkMode, selected, companyName, companyColor,
  onEdit, onDelete, onTogglePin, onToggleSelect, onConvert,
}: IdeaCardProps) {
  const cfg = TAG_CONFIG[idea.tag];
  const stCfg = STATUS_CONFIG[idea.status ?? 'rascunho'];
  const [hovered, setHovered] = useState(false);

  const compact = density === 'compact';
  const subtasks = idea.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.done).length;

  const reviewDateObj = idea.reviewDate ? parseISO(idea.reviewDate) : null;
  const reviewOverdue = reviewDateObj ? differenceInDays(new Date(), reviewDateObj) > 0 : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
      style={{
        background: selected ? `${cfg.color}12` : (hovered ? `${cfg.color}0d` : 'var(--s1)'),
        border: `1px solid ${selected ? cfg.color : (hovered ? cfg.color + '60' : 'var(--b2)')}`,
        borderRadius: 14,
        padding: compact ? '12px 14px 10px 16px' : '14px 16px 12px 18px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .15s',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: cfg.color }} />

      {/* Bulk select checkbox (top-left, on hover or in bulk mode) */}
      {(bulkMode || hovered) && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          aria-label={selected ? 'Desselecionar' : 'Selecionar'}
          style={{
            position: 'absolute', top: 8, left: 8,
            width: 18, height: 18, borderRadius: 5,
            border: `1.5px solid ${selected ? cfg.color : 'var(--b3)'}`,
            background: selected ? cfg.color : 'rgba(0,0,0,0.35)',
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: bulkMode || selected ? 1 : 0.7, zIndex: 2,
          }}
        >
          {selected && <FiCheck size={10} color="#fff" strokeWidth={3} />}
        </button>
      )}

      {/* Tag row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: bulkMode || hovered ? 22 : 0, transition: 'padding .15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: cfg.color }}>{cfg.label}</span>
          {(idea.extraTags ?? []).map((t) => (
            <div key={t} title={TAG_CONFIG[t].label} style={{ width: 6, height: 6, borderRadius: '50%', background: TAG_CONFIG[t].color }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Status badge */}
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: stCfg.color, background: `${stCfg.color}18`, border: `1px solid ${stCfg.color}30`, borderRadius: 99, padding: '2px 7px' }}>
            {stCfg.label}
          </span>
          {idea.pinned && <span style={{ fontSize: 11, opacity: 0.7 }}>📌</span>}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4, marginBottom: idea.description && !compact ? 8 : 10 }}>
        {idea.title}
      </div>

      {/* Description preview */}
      {idea.description && !compact && (
        <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.55, marginBottom: 10, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {autoLink(idea.description)}
        </div>
      )}

      {/* Company badge */}
      {companyName && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 99, background: `${companyColor}15`, border: `1px solid ${companyColor}30`, marginBottom: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: companyColor }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: companyColor, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{companyName}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${cfg.color}15`, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>
            {format(parseISO(idea.createdAt), 'd MMM', { locale: ptBR })}
          </span>
          {subtasks.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--t3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <FiCheck size={9} /> {subDone}/{subtasks.length}
            </span>
          )}
          {reviewDateObj && (
            <span style={{ fontSize: 10, color: reviewOverdue ? '#ff453a' : 'var(--t3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <FiCalendar size={9} /> {format(reviewDateObj, 'd MMM', { locale: ptBR })}
            </span>
          )}
          {idea.convertedToTodoId && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#356BFF', background: 'rgba(53,107,255,0.12)', padding: '1px 6px', borderRadius: 99 }}>
              → TO-DO
            </span>
          )}
          {idea.linkedProposalId && (
            <span title="Vinculada a uma proposta" style={{ fontSize: 10, color: '#356BFF', background: 'rgba(53,107,255,0.12)', padding: '1px 6px', borderRadius: 99 }}>
              📄
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {idea.link && (
            <a href={idea.link} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: cfg.color, textDecoration: 'none', opacity: 0.85 }}>
              <FiLink size={10} /> link
            </a>
          )}
          {hovered && !idea.convertedToTodoId && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvert(); }}
              title="Converter para To-Do"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, border: '1px solid #356BFF40', background: 'rgba(53,107,255,0.1)', color: '#356BFF', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}
            >
              <FiArrowRight size={9} /> To-Do
            </button>
          )}
          {hovered && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                title={idea.pinned ? 'Desafixar' : 'Fixar'}
                aria-label={idea.pinned ? 'Desafixar' : 'Fixar'}
                style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                📌
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                aria-label="Excluir"
                style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}>
                <FiTrash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Idea List Row ──────────────────────────────────────────────────────────

interface IdeaListRowProps {
  idea: Idea;
  bulkMode: boolean;
  selected: boolean;
  companyName?: string;
  companyColor?: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleSelect: () => void;
}

function IdeaListRow({ idea, bulkMode, selected, companyName, companyColor, onEdit, onDelete, onTogglePin, onToggleSelect }: IdeaListRowProps) {
  const cfg = TAG_CONFIG[idea.tag];
  const stCfg = STATUS_CONFIG[idea.status ?? 'rascunho'];
  const [hovered, setHovered] = useState(false);
  const subtasks = idea.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.done).length;

  return (
    <div
      onClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        background: selected ? `${cfg.color}10` : (hovered ? 'var(--s2)' : 'transparent'),
        borderBottom: '1px solid var(--b1)', cursor: 'pointer', position: 'relative',
        transition: 'background .15s',
      }}
    >
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: cfg.color, opacity: hovered || selected ? 1 : 0.5 }} />

      {/* Bulk checkbox */}
      {(bulkMode || hovered) && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          aria-label={selected ? 'Desselecionar' : 'Selecionar'}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${selected ? cfg.color : 'var(--b3)'}`,
            background: selected ? cfg.color : 'transparent',
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {selected && <FiCheck size={9} color="#fff" strokeWidth={3} />}
        </button>
      )}

      {/* Pinned indicator */}
      {idea.pinned && <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0 }}>📌</span>}

      {/* Tag dot */}
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />

      {/* Title */}
      <span style={{ flex: 1, fontSize: 13, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {idea.title}
      </span>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <span style={{ fontSize: 10, color: 'var(--t3)', display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <FiCheck size={9} /> {subDone}/{subtasks.length}
        </span>
      )}

      {/* Status badge */}
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: stCfg.color, background: `${stCfg.color}18`, border: `1px solid ${stCfg.color}30`, borderRadius: 99, padding: '2px 6px', flexShrink: 0 }}>
        {stCfg.label}
      </span>

      {/* Company */}
      {companyName && (
        <span style={{ fontSize: 9, fontWeight: 700, color: companyColor, opacity: 0.85, flexShrink: 0 }}>{companyName}</span>
      )}

      {/* Date */}
      <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
        {format(parseISO(idea.createdAt), 'd MMM', { locale: ptBR })}
      </span>

      {/* Link */}
      {idea.link && (
        <a href={idea.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          style={{ color: cfg.color, opacity: 0.8, display: 'flex', flexShrink: 0 }}>
          <FiLink size={11} />
        </a>
      )}

      {/* Hover actions */}
      {hovered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            aria-label={idea.pinned ? 'Desafixar' : 'Fixar'}
            style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            📌
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Excluir"
            style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}>
            <FiTrash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function IdeiasPage() {
  const {
    ideas, addIdea, deleteIdea, togglePin, updateIdea, permanentDelete, restoreIdea, setStatus, reorderPinned,
  } = useIdeasStore();
  const { accentColor, companies, addTodoItem } = useTaskStore();

  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<IdeaTag | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editIdea, setEditIdea] = useState<Idea | undefined>();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [density, setDensity] = useState<Density>('normal');

  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; hard?: boolean } | null>(null);

  // Quick capture
  const [quickText, setQuickText] = useState('');
  const [quickTag, setQuickTag] = useState<IdeaTag>('negocio');
  const [recording, setRecording] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<unknown>(null);

  // Drag-drop state for kanban
  const [dragOverCol, setDragOverCol] = useState<IdeaStatus | null>(null);
  const dragItemId = useRef<string | null>(null);

  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem('evo-ideas-quick-draft');
      if (draft) setQuickText(draft);
    } catch { /* ignore */ }
  }, []);

  // Persist draft
  useEffect(() => {
    try {
      if (quickText) localStorage.setItem('evo-ideas-quick-draft', quickText);
      else localStorage.removeItem('evo-ideas-quick-draft');
    } catch { /* ignore */ }
  }, [quickText]);

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const handleVoice = () => {
    if (!speechSupported) return;
    if (recording) {
      const r = recogRef.current as { stop?: () => void } | null;
      r?.stop?.();
      setRecording(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor() as {
      lang: string; continuous: boolean; interimResults: boolean;
      start: () => void; stop: () => void;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      onerror: (e: unknown) => void;
    };
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
      }
      setQuickText((prev) => (prev ? prev + ' ' : '') + txt);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recogRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch { setRecording(false); }
  };

  const handleQuickSave = () => {
    const raw = quickText.trim();
    if (!raw) return;
    const { stripped, foundTag } = detectInlineTags(raw);
    const finalTitle = stripped || raw;
    const finalTag = foundTag ?? quickTag;
    addIdea({ title: finalTitle, tag: finalTag, pinned: false, status: 'rascunho' });
    setQuickText('');
    try { localStorage.removeItem('evo-ideas-quick-draft'); } catch { /* ignore */ }
  };

  // Active (non-deleted) ideas
  const visibleIds = useVisibleWorkspaceIds();
  const activeIdeas = useMemo(() => ideas.filter((i) => !i.deletedAt && isInLens(i, visibleIds)), [ideas, visibleIds]);
  const trashedIdeas = useMemo(() => ideas.filter((i) => i.deletedAt), [ideas]);

  const sortIdeas = useCallback((list: Idea[]) => {
    const arr = [...list];
    arr.sort((a, b) => {
      // Pinned always first (unless trash view)
      if (!showTrash) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.pinned && b.pinned) {
          const ao = a.pinOrder ?? 0;
          const bo = b.pinOrder ?? 0;
          if (ao !== bo) return ao - bo;
        }
      }
      switch (sortMode) {
        case 'date-asc':
          return a.createdAt.localeCompare(b.createdAt);
        case 'alpha':
          return a.title.localeCompare(b.title, 'pt-BR');
        case 'updated':
          return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
        case 'date-desc':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return arr;
  }, [sortMode, showTrash]);

  const filteredActive = useMemo(() => {
    let list = activeIdeas;
    if (filterTag) {
      list = list.filter(
        (i) => i.tag === filterTag || (i.extraTags ?? []).includes(filterTag)
      );
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    return sortIdeas(list);
  }, [activeIdeas, filterTag, search, sortIdeas]);

  const countByTag = useMemo(() => {
    const map: Record<string, number> = {};
    activeIdeas.forEach((i) => {
      map[i.tag] = (map[i.tag] ?? 0) + 1;
      (i.extraTags ?? []).forEach((t) => { map[t] = (map[t] ?? 0) + 1; });
    });
    return map;
  }, [activeIdeas]);

  const countByStatus = useMemo(() => {
    const map: Record<IdeaStatus, number> = { rascunho: 0, desenvolvendo: 0, executada: 0, arquivada: 0 };
    activeIdeas.forEach((i) => {
      const s = (i.status ?? 'rascunho') as IdeaStatus;
      map[s] += 1;
    });
    return map;
  }, [activeIdeas]);

  // Stats: this week vs last week
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const thisWeekCount = useMemo(() =>
    activeIdeas.filter((i) =>
      isWithinInterval(parseISO(i.createdAt), { start: thisWeekStart, end: thisWeekEnd })
    ).length,
    [activeIdeas, thisWeekStart, thisWeekEnd]
  );
  const lastWeekCount = useMemo(() =>
    activeIdeas.filter((i) =>
      isWithinInterval(parseISO(i.createdAt), { start: lastWeekStart, end: lastWeekEnd })
    ).length,
    [activeIdeas, lastWeekStart, lastWeekEnd]
  );
  const weekDelta = thisWeekCount - lastWeekCount;

  const streak = useMemo(() => calcStreak(ideas), [ideas]);

  // "Idea of the week"
  const ideaOfWeek = useMemo(() => {
    if (activeIdeas.length < 5) return null;
    const candidates = activeIdeas.filter((i) =>
      !i.pinned && differenceInDays(now, parseISO(i.createdAt)) >= 7
    );
    if (candidates.length === 0) return null;
    const seed = getISOWeek(now);
    return deterministicPick(candidates, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdeas]);

  const pinnedIdeas = useMemo(
    () => sortIdeas(activeIdeas.filter((i) => i.pinned)),
    [activeIdeas, sortIdeas]
  );

  const top5Pinned = pinnedIdeas.slice(0, 5);

  // ─── Action helpers ─────────────────────────────────────────────────────

  const companyById = (id?: string) => companies.find((c) => c.id === id);

  const handleConvert = (idea: Idea) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    addTodoItem(idea.title, today, 'todo', undefined, undefined);
    updateIdea(idea.id, { status: 'desenvolvendo', convertedToTodoId: 'created' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkMode = selectedIds.size > 0;

  const handleBulkChangeTag = (newTag: IdeaTag) => {
    selectedIds.forEach((id) => updateIdea(id, { tag: newTag }));
    clearSelection();
  };
  const handleBulkChangeStatus = (newStatus: IdeaStatus) => {
    selectedIds.forEach((id) => setStatus(id, newStatus));
    clearSelection();
  };
  const handleBulkArchive = () => {
    selectedIds.forEach((id) => setStatus(id, 'arquivada'));
    clearSelection();
  };
  const handleBulkDelete = () => {
    setPendingDelete({ ids: [...selectedIds] });
  };

  // ─── Drag-drop kanban ───────────────────────────────────────────────────

  const handleStatusDrop = (e: React.DragEvent, target: IdeaStatus) => {
    e.preventDefault();
    const id = dragItemId.current ?? e.dataTransfer.getData('ideaId');
    if (id) setStatus(id, target);
    setDragOverCol(null);
    dragItemId.current = null;
  };

  // ─── Drag-drop pinned reorder ───────────────────────────────────────────

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handlePinnedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = pinnedIdeas.map((i) => i.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(ids, oldIdx, newIdx);
    reorderPinned(next);
  };

  // ─── UI ─────────────────────────────────────────────────────────────────

  const statChips: { label: string; value: string | number; rgb: string; color: string }[] = [
    { label: 'Total',        value: activeIdeas.length, rgb: '53,107,255',  color: '#356BFF' },
    { label: 'Pinadas',      value: pinnedIdeas.length, rgb: '255,159,10',  color: '#ff9f0a' },
    { label: 'Esta semana',  value: thisWeekCount,      rgb: '48,209,88',   color: '#30d158' },
    { label: 'Em dev',       value: countByStatus.desenvolvendo, rgb: '53,107,255',  color: '#356BFF' },
  ];

  const renderEmptyState = (msg: string, hint?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 240, gap: 10, color: 'var(--t4)' }}>
      <span style={{ fontSize: 38, opacity: 0.3 }}>💡</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{msg}</span>
      {hint && <span style={{ fontSize: 11, opacity: 0.5 }}>{hint}</span>}
    </div>
  );

  const cardCommonProps = (idea: Idea) => {
    const company = companyById(idea.linkedCompanyId);
    return {
      idea,
      density,
      bulkMode,
      selected: selectedIds.has(idea.id),
      companyName: company?.name,
      companyColor: company?.color,
      onEdit: () => { setEditIdea(idea); setShowModal(true); },
      onDelete: () => setPendingDelete({ ids: [idea.id] }),
      onTogglePin: () => togglePin(idea.id),
      onToggleSelect: () => toggleSelect(idea.id),
      onConvert: () => handleConvert(idea),
    };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ Compact sticky header ═══════════════════════════════════════════ */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Abrir menu lateral"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}
            >
              <FiMenu size={14} />
            </button>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Criativo</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Ideias</div>
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {statChips.map((k) => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 9, padding: '6px 10px' }}>
            <FiSearch size={12} style={{ color: 'var(--t4)' }} />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 12, width: 110 }}
            />
          </div>

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--s1)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer', outline: 'none' }}
          >
            <option value="date-desc">Recentes</option>
            <option value="date-asc">Antigas</option>
            <option value="alpha">A–Z</option>
            <option value="updated">Atualizadas</option>
          </select>

          {/* View mode segmented */}
          <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 8, padding: 2, gap: 1 }}>
            {([
              { id: 'grid' as const,    icon: <FiGrid size={11} />,    label: 'Grade' },
              { id: 'list' as const,    icon: <FiList size={11} />,    label: 'Lista' },
              { id: 'kanban' as const,  icon: <FiColumns size={11} />, label: 'Kanban' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                aria-label={m.label}
                title={m.label}
                style={{
                  padding: '5px 9px', borderRadius: 6, border: 'none',
                  background: viewMode === m.id ? accentColor : 'transparent',
                  color: viewMode === m.id ? '#fff' : 'var(--t3)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'all .15s',
                }}
              >
                {m.icon}
              </button>
            ))}
          </div>

          {/* Density */}
          <button
            onClick={() => setDensity((d) => d === 'compact' ? 'normal' : 'compact')}
            title={density === 'compact' ? 'Modo normal' : 'Modo compacto'}
            style={{
              padding: '6px 9px', borderRadius: 8, border: `1px solid ${density === 'compact' ? accentColor : 'var(--b2)'}`,
              background: density === 'compact' ? `${accentColor}15` : 'var(--s1)',
              color: density === 'compact' ? accentColor : 'var(--t3)',
              cursor: 'pointer', fontSize: 10, fontWeight: 700,
            }}
          >
            {density === 'compact' ? 'COMPACTO' : 'NORMAL'}
          </button>

          {/* + Nova */}
          <button
            onClick={() => { setEditIdea(undefined); setShowModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: accentColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <FiPlus size={12} /> Nova
          </button>
        </div>
      </div>

      {/* ═══ Body: sidebar + main ═══════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
        )}
        {/* ─── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{
          ...(isMobile ? {
            position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
            width: 280,
            background: 'var(--app-bg, #1c1c1e)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .25s ease',
            boxShadow: sidebarOpen ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          } : {
            width: 220,
            background: 'rgba(0,0,0,0.14)',
          }),
          flexShrink: 0,
          borderRight: '1px solid var(--b2)',
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu lateral"
              style={{ alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
            >
              <FiX size={13} />
            </button>
          )}
          {/* Card 1 — Filtros (tags) */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Filtros</div>
            <button
              onClick={() => { setFilterTag(null); if (isMobile) setSidebarOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 8px', borderRadius: 7, marginBottom: 4, cursor: 'pointer',
                border: '1px solid transparent',
                background: filterTag === null ? `${accentColor}18` : 'transparent',
                color: filterTag === null ? accentColor : 'var(--t2)',
                fontSize: 11, fontWeight: filterTag === null ? 700 : 500, textAlign: 'left',
              }}
            >
              <span>Todas</span>
              <span style={{ opacity: 0.7 }}>{activeIdeas.length}</span>
            </button>
            {TAGS.map(([id, cfg]) => {
              const active = filterTag === id;
              return (
                <button
                  key={id}
                  onClick={() => { setFilterTag(active ? null : id); if (isMobile) setSidebarOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 7, marginBottom: 3, cursor: 'pointer',
                    border: '1px solid transparent',
                    background: active ? `${cfg.color}18` : 'transparent',
                    color: active ? cfg.color : 'var(--t2)',
                    fontSize: 11, fontWeight: active ? 700 : 500, textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                    {cfg.label}
                  </span>
                  <span style={{ opacity: 0.7 }}>{countByTag[id] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Card 2 — Status */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Status</div>
            {STATUSES.map((st) => {
              const cfg = STATUS_CONFIG[st];
              const count = countByStatus[st];
              const pct = activeIdeas.length > 0 ? (count / activeIdeas.length) * 100 : 0;
              return (
                <div key={st} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? cfg.color : 'var(--t4)' }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card 3 — Pinadas */}
          {top5Pinned.length > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>📌 Pinadas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {top5Pinned.map((p) => {
                  const cfg = TAG_CONFIG[p.tag];
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setEditIdea(p); setShowModal(true); if (isMobile) setSidebarOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px',
                        borderRadius: 6, background: 'transparent', border: '1px solid transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${cfg.color}10`; (e.currentTarget as HTMLElement).style.borderColor = `${cfg.color}30`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 4 — Esta semana */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Esta semana</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>{thisWeekCount}</span>
              {weekDelta !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: weekDelta > 0 ? '#30d158' : '#ff453a' }}>
                  {weekDelta > 0 ? `+${weekDelta}` : weekDelta}
                </span>
              )}
              <span style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>vs sem. ant.</span>
            </div>
          </div>

          {/* Card 5 — Streak */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Sequência</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>{streak}</div>
                <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{streak === 1 ? 'dia' : 'dias seguidos'}</div>
              </div>
            </div>
          </div>

          {/* Card 6 — Ideia da semana */}
          {ideaOfWeek && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: `1px solid ${TAG_CONFIG[ideaOfWeek.tag].color}30`, padding: '12px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: TAG_CONFIG[ideaOfWeek.tag].color, marginBottom: 8 }}>✨ Ideia da semana</div>
              <div style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>{ideaOfWeek.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: TAG_CONFIG[ideaOfWeek.tag].color }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: TAG_CONFIG[ideaOfWeek.tag].color, textTransform: 'uppercase' }}>{TAG_CONFIG[ideaOfWeek.tag].label}</span>
              </div>
              <button
                onClick={() => { setEditIdea(ideaOfWeek); setShowModal(true); }}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1px solid ${TAG_CONFIG[ideaOfWeek.tag].color}40`, background: `${TAG_CONFIG[ideaOfWeek.tag].color}10`, color: TAG_CONFIG[ideaOfWeek.tag].color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Revisitar
              </button>
            </div>
          )}

          {/* Card 7 — Lixeira */}
          {trashedIdeas.length > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: `1px solid ${showTrash ? '#ff453a40' : 'var(--b2)'}`, padding: '12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: showTrash ? '#ff453a' : 'var(--t3)' }}>Lixeira</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: showTrash ? '#ff453a' : 'var(--t4)' }}>{trashedIdeas.length}</span>
              </div>
              <button
                onClick={() => setShowTrash((s) => !s)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1px solid ${showTrash ? '#ff453a40' : 'var(--b2)'}`, background: showTrash ? 'rgba(255,69,58,0.08)' : 'transparent', color: showTrash ? '#ff453a' : 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {showTrash ? 'Voltar para ideias' : 'Ver lixeira'}
              </button>
            </div>
          )}
        </aside>

        {/* ─── Main content ────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!showTrash && (
            <>
              {/* Quick capture */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--s1)', border: `1px solid ${TAG_CONFIG[quickTag].color}35`, borderRadius: 14, padding: '10px 14px', flexShrink: 0, transition: 'border-color .2s' }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
                <input
                  ref={quickRef}
                  placeholder="O que passou pela sua cabeça? (use #dev, #design… para auto-tag)"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickSave()}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 13 }}
                />
                {/* Tag swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {TAGS.map(([id, cfg]) => (
                    <button key={id} onClick={() => setQuickTag(id)} title={cfg.label} aria-label={cfg.label}
                      style={{
                        width: quickTag === id ? 18 : 12,
                        height: quickTag === id ? 18 : 12,
                        borderRadius: '50%',
                        background: cfg.color,
                        border: `2px solid ${quickTag === id ? 'var(--t1)' : 'transparent'}`,
                        cursor: 'pointer', flexShrink: 0, outline: 'none', padding: 0,
                        transition: 'all .15s',
                      }} />
                  ))}
                </div>
                {speechSupported && (
                  <button
                    onClick={handleVoice}
                    title={recording ? 'Parar gravação' : 'Ditar ideia'}
                    aria-label={recording ? 'Parar gravação' : 'Ditar ideia'}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: '1px solid var(--b2)',
                      background: recording ? 'rgba(255,69,58,0.15)' : 'var(--ib)',
                      color: recording ? '#ff453a' : 'var(--t3)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiMic size={12} />
                  </button>
                )}
                {quickText.trim() && (
                  <button onClick={handleQuickSave}
                    style={{ padding: '5px 12px', borderRadius: 7, background: TAG_CONFIG[quickTag].color, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    Salvar
                  </button>
                )}
              </div>

              {/* Bulk action bar */}
              {bulkMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${accentColor}10`, border: `1px solid ${accentColor}40`, borderRadius: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                    {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>•</span>
                  <select
                    onChange={(e) => { if (e.target.value) handleBulkChangeTag(e.target.value as IdeaTag); e.target.value = ''; }}
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--b2)', background: 'var(--s1)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}
                  >
                    <option value="">Mudar tag…</option>
                    {TAGS.map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}
                  </select>
                  <select
                    onChange={(e) => { if (e.target.value) handleBulkChangeStatus(e.target.value as IdeaStatus); e.target.value = ''; }}
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--b2)', background: 'var(--s1)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}
                  >
                    <option value="">Mudar status…</option>
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_CONFIG[st].label}</option>)}
                  </select>
                  <button
                    onClick={handleBulkArchive}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #ff9f0a40', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Arquivar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #ff453a40', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Deletar
                  </button>
                  <button
                    onClick={clearSelection}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    Limpar
                  </button>
                </div>
              )}

              {/* ─── View mode rendering ─────────────────────────────── */}
              {filteredActive.length === 0 ? (
                renderEmptyState(
                  search ? 'Nenhuma ideia encontrada' : 'Nenhuma ideia ainda',
                  search ? 'Tente outra busca' : 'Use o campo acima para capturar uma ideia rapidamente'
                )
              ) : viewMode === 'grid' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Pinned section (only if no filter/search and pinned exist) */}
                  {pinnedIdeas.length > 0 && !search && !filterTag && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        📌 Pinadas
                      </div>
                      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handlePinnedDragEnd}>
                        <SortableContext items={pinnedIdeas.map((i) => i.id)} strategy={rectSortingStrategy}>
                          <motion.div
                            layout
                            style={{
                              display: 'grid',
                              gridTemplateColumns: density === 'compact' ? 'repeat(auto-fill, minmax(180px, 1fr))' : 'repeat(auto-fill, minmax(240px, 1fr))',
                              gap: 12,
                            }}
                          >
                            {pinnedIdeas.map((idea) => (
                              <SortableIdeaCardWrapper key={idea.id} id={idea.id}>
                                <IdeaCard {...cardCommonProps(idea)} />
                              </SortableIdeaCardWrapper>
                            ))}
                          </motion.div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}

                  {/* Other ideas */}
                  {(() => {
                    const others = filteredActive.filter((i) => !i.pinned || search || filterTag);
                    if (others.length === 0) return null;
                    return (
                      <div>
                        {pinnedIdeas.length > 0 && !search && !filterTag && (
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Todas</div>
                        )}
                        <motion.div
                          layout
                          style={{
                            display: 'grid',
                            gridTemplateColumns: density === 'compact' ? 'repeat(auto-fill, minmax(180px, 1fr))' : 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: 12,
                          }}
                        >
                          <AnimatePresence mode="popLayout">
                            {others.map((idea) => (
                              <IdeaCard key={idea.id} {...cardCommonProps(idea)} />
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })()}
                </div>
              ) : viewMode === 'list' ? (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 12, overflow: 'hidden' }}>
                  {filteredActive.map((idea) => {
                    const company = companyById(idea.linkedCompanyId);
                    return (
                      <IdeaListRow
                        key={idea.id}
                        idea={idea}
                        bulkMode={bulkMode}
                        selected={selectedIds.has(idea.id)}
                        companyName={company?.name}
                        companyColor={company?.color}
                        onEdit={() => { setEditIdea(idea); setShowModal(true); }}
                        onDelete={() => setPendingDelete({ ids: [idea.id] })}
                        onTogglePin={() => togglePin(idea.id)}
                        onToggleSelect={() => toggleSelect(idea.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Kanban */
                <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'auto', minHeight: 0 }}>
                  {STATUSES.map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const items = filteredActive.filter((i) => (i.status ?? 'rascunho') === st);
                    const isDragOver = dragOverCol === st;
                    return (
                      <div
                        key={st}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(st); }}
                        onDragLeave={() => setDragOverCol((c) => (c === st ? null : c))}
                        onDrop={(e) => handleStatusDrop(e, st)}
                        style={{
                          flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column',
                          background: 'var(--s1)', borderRadius: 14,
                          border: `1px solid ${isDragOver ? `${cfg.color}55` : 'var(--b2)'}`,
                          overflow: 'hidden', position: 'relative',
                          transition: 'border-color .15s, background .15s',
                          ...(isDragOver ? { background: `${cfg.color}10` } : {}),
                        }}
                      >
                        {/* Top accent bar */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cfg.color, boxShadow: `0 0 12px ${cfg.color}66` }} />

                        {/* Header */}
                        <div style={{ padding: '14px 14px 10px', flexShrink: 0, borderBottom: '1px solid var(--b1)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}aa` }} />
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t1)', flex: 1 }}>{cfg.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: items.length > 0 ? cfg.color : 'var(--t4)', background: items.length > 0 ? `${cfg.color}18` : 'transparent', borderRadius: 99, padding: '1px 7px' }}>{items.length}</span>
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {items.length === 0 ? (
                            <div style={{ flex: 1, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 11, opacity: 0.5 }}>
                              Arraste para cá
                            </div>
                          ) : (
                            items.map((idea) => (
                              <div
                                key={idea.id}
                                draggable
                                onDragStart={(e) => { dragItemId.current = idea.id; e.dataTransfer.setData('ideaId', idea.id); }}
                                onDragEnd={() => { dragItemId.current = null; setDragOverCol(null); }}
                              >
                                <IdeaCard {...cardCommonProps(idea)} />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {showTrash && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>Lixeira <span style={{ color: 'var(--t4)', fontWeight: 500 }}>({trashedIdeas.length})</span></span>
                <button
                  onClick={() => setShowTrash(false)}
                  style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--b2)', background: 'var(--s1)', color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Voltar
                </button>
              </div>
              {trashedIdeas.length === 0 ? (
                renderEmptyState('Lixeira vazia')
              ) : (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 12, overflow: 'hidden' }}>
                  {trashedIdeas.map((t) => {
                    const cfg = TAG_CONFIG[t.tag];
                    return (
                      <div
                        key={t.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--b1)' }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>
                          {t.deletedAt ? format(parseISO(t.deletedAt), "d MMM 'às' HH:mm", { locale: ptBR }) : ''}
                        </span>
                        <button
                          onClick={() => restoreIdea(t.id)}
                          title="Restaurar"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: '1px solid #30d15840', background: 'rgba(48,209,88,0.1)', color: '#30d158', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          <FiRotateCcw size={10} /> Restaurar
                        </button>
                        <button
                          onClick={() => setPendingDelete({ ids: [t.id], hard: true })}
                          title="Apagar permanentemente"
                          aria-label="Apagar permanentemente"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: '1px solid #ff453a40', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          <FiTrash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <IdeaModal
            onClose={() => { setShowModal(false); setEditIdea(undefined); }}
            editing={editIdea}
          />
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDeleteModal
            count={pendingDelete.ids.length}
            hard={pendingDelete.hard}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              if (pendingDelete.hard) {
                pendingDelete.ids.forEach((id) => permanentDelete(id));
              } else {
                pendingDelete.ids.forEach((id) => deleteIdea(id));
              }
              clearSelection();
              setPendingDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
