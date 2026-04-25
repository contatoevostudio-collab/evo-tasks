import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FiPlus, FiSearch, FiX, FiTrash2, FiCopy, FiCheck, FiSend, FiUpload, FiImage,
  FiMessageCircle, FiArrowLeft, FiExternalLink, FiArchive, FiFolder, FiFolderPlus, FiLink,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useContentApprovalsStore, APPROVAL_STATUS_CONFIG, CONTENT_TYPE_LABELS } from '../store/contentApprovals';
import { useVisibleWorkspaceIds, isInLens, useWorkspacesStore } from '../store/workspaces';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import type { ContentApproval, ContentType, ApprovalStatus, ContentAsset, ApprovalFolder, FolderPeriod } from '../types';

const TYPE_OPTIONS: ContentType[] = ['card', 'carrossel', 'reels', 'story', 'video', 'apresentacao', 'moodboard', 'site', 'identidade', 'outro'];

export function AprovacoesPage() {
  const { companies } = useTaskStore();
  const visibleIds = useVisibleWorkspaceIds();
  const activeWorkspaceId = useWorkspacesStore(s => s.activeWorkspaceId);
  const { approvals, folders, addApproval, deleteApproval } = useContentApprovalsStore();
  const [view, setView] = useState<'approvals' | 'folders'>('approvals');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'todos'>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [managingFolderId, setManagingFolderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return approvals
      .filter(a => isInLens(a, visibleIds))
      .filter(a => showArchived ? !!a.deletedAt : !a.deletedAt)
      .filter(a => statusFilter === 'todos' || a.status === statusFilter)
      .filter(a => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return a.title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [approvals, visibleIds, showArchived, statusFilter, search]);

  const stats = useMemo(() => {
    const inLens = approvals.filter(a => isInLens(a, visibleIds) && !a.deletedAt);
    return {
      total: inLens.length,
      enviados: inLens.filter(a => a.status === 'enviado' || a.status === 'visualizado').length,
      pendentes: inLens.filter(a => a.status === 'alteracao').length,
      aprovados: inLens.filter(a => a.status === 'aprovado' || a.status === 'postado').length,
    };
  }, [approvals, visibleIds]);

  const editing = editingId ? approvals.find(a => a.id === editingId) : null;

  const handleNew = () => {
    if (companies.filter(c => !c.deletedAt).length === 0) {
      alert('Crie uma empresa primeiro');
      return;
    }
    setShowNew(true);
  };

  const handleNewFolder = () => {
    if (companies.filter(c => !c.deletedAt).length === 0) {
      alert('Crie uma empresa primeiro');
      return;
    }
    setShowNewFolder(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Agência</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Aprovações</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Total', value: stats.total, color: '#64C4FF', rgb: '100,196,255' },
            { label: 'Enviados', value: stats.enviados, color: '#356BFF', rgb: '53,107,255' },
            { label: 'Alteração', value: stats.pendentes, color: '#ff9f0a', rgb: '255,159,10' },
            { label: 'Aprovados', value: stats.aprovados, color: '#30d158', rgb: '48,209,88' },
          ].map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 9, padding: '6px 10px' }}>
            <FiSearch size={12} style={{ color: 'var(--t4)' }} />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 12, width: 130 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 0 }}>
                <FiX size={11} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 9, padding: 2, gap: 2 }}>
            {(['approvals', 'folders'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: view === v ? 'var(--s2)' : 'transparent', color: view === v ? 'var(--t1)' : 'var(--t4)', transition: 'all .12s' }}
              >
                {v === 'approvals' ? <><FiImage size={11} /> Aprovações</> : <><FiFolder size={11} /> Pastas</>}
              </button>
            ))}
          </div>

          {view === 'folders' ? (
            <button onClick={handleNewFolder}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <FiFolderPlus size={12} /> Nova pasta
            </button>
          ) : (
            <button onClick={handleNew}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <FiPlus size={12} /> Nova aprovação
            </button>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ padding: '10px 20px', flexShrink: 0, borderBottom: '1px solid var(--b1)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['todos', 'rascunho', 'enviado', 'visualizado', 'alteracao', 'aprovado', 'postado'] as const).map(opt => {
          const active = statusFilter === opt;
          const cfg = opt !== 'todos' ? APPROVAL_STATUS_CONFIG[opt] : { label: 'Todos', color: 'var(--t2)', rgb: '255,255,255' };
          return (
            <button key={opt}
              onClick={() => setStatusFilter(opt)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                background: active ? `rgba(${cfg.rgb || '255,255,255'},0.14)` : 'transparent',
                border: `1px solid ${active ? cfg.color : 'var(--b2)'}`,
                color: active ? cfg.color : 'var(--t3)', cursor: 'pointer', transition: 'all .12s',
              }}
            >{cfg.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowArchived(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}
        >
          <FiArchive size={11} /> {showArchived ? 'Voltar ativos' : 'Lixeira'}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
        {view === 'folders' ? (
          <FolderGridView
            folders={folders.filter(f => !f.deletedAt && isInLens(f, visibleIds))}
            approvals={approvals}
            companies={companies}
            onManage={(id) => setManagingFolderId(id)}
          />
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
            <div style={{ fontSize: 56, opacity: 0.4 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Nenhuma aprovação</div>
            <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
              Crie um item, faça upload de assets e gere link público pra cliente revisar.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <AnimatePresence>
              {filtered.map(a => (
                <ApprovalCard key={a.id}
                  approval={a}
                  companyName={companies.find(c => c.id === a.clientId)?.name ?? '?'}
                  onClick={() => setEditingId(a.id)}
                  onDelete={() => deleteApproval(a.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewApprovalModal
            onClose={() => setShowNew(false)}
            onCreated={(id) => { setShowNew(false); setEditingId(id); }}
            workspaceId={activeWorkspaceId ?? undefined}
            companies={companies.filter(c => !c.deletedAt)}
            addApproval={addApproval}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editing && (
          <ApprovalEditor key={editing.id} approval={editing} onClose={() => setEditingId(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewFolder && (
          <NewFolderModal
            onClose={() => setShowNewFolder(false)}
            workspaceId={activeWorkspaceId ?? undefined}
            companies={companies.filter(c => !c.deletedAt)}
          />
        )}
      </AnimatePresence>
      {managingFolderId && (
        <FolderManagerModal
          folderId={managingFolderId}
          onClose={() => setManagingFolderId(null)}
        />
      )}
    </div>
  );
}

// ─── Folder helpers ────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<FolderPeriod, string> = {
  semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', livre: 'Livre',
};
const PERIOD_COLORS: Record<FolderPeriod, string> = {
  semanal: '#356BFF', quinzenal: '#bf5af2', mensal: '#30d158', livre: '#636366',
};

// ─── Folder grid ───────────────────────────────────────────────────────────
function FolderGridView({ folders, approvals, companies, onManage }: {
  folders: ApprovalFolder[];
  approvals: ContentApproval[];
  companies: { id: string; name: string; color: string }[];
  onManage: (id: string) => void;
}) {
  const { deleteFolder } = useContentApprovalsStore();
  const [copied, setCopied] = useState<string | null>(null);

  const copyFolderLink = (f: ApprovalFolder) => {
    const url = `${window.location.origin}${window.location.pathname}#pasta=${f.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(f.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (folders.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
      <div style={{ fontSize: 52, opacity: 0.3 }}>📁</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Nenhuma pasta</div>
      <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320 }}>
        Crie uma pasta para agrupar aprovações por cliente e período, e envie um link único pro cliente revisar tudo de uma vez.
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {folders.map(folder => {
        const company = companies.find(c => c.id === folder.clientId);
        const folderApprovals = approvals.filter(a => folder.approvalIds.includes(a.id) && !a.deletedAt);
        const total = folderApprovals.length;
        const approved = folderApprovals.filter(a => a.status === 'aprovado' || a.status === 'postado').length;
        const pending = folderApprovals.filter(a => a.status === 'alteracao').length;
        const sent = folderApprovals.filter(a => a.status === 'enviado' || a.status === 'visualizado').length;
        const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
        const periodColor = PERIOD_COLORS[folder.period];
        const initial = company?.name?.[0]?.toUpperCase() ?? '?';
        const clientColor = company?.color ?? '#636366';

        return (
          <motion.div key={folder.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            whileHover={{ y: -2 }}
          >
            {/* Top: client + period */}
            <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${clientColor}20`, border: `2px solid ${clientColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: clientColor, flexShrink: 0 }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{company?.name ?? '—'}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 999, background: `${periodColor}18`, color: periodColor, border: `1px solid ${periodColor}30`, flexShrink: 0 }}>
                {PERIOD_LABELS[folder.period]}
              </span>
            </div>

            {/* Progress */}
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginBottom: 6 }}>
                <span>{total} {total === 1 ? 'peça' : 'peças'}</span>
                <span style={{ color: pct === 100 ? '#30d158' : 'var(--t4)' }}>{approved}/{total} aprovadas</span>
              </div>
              <div style={{ height: 4, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#30d158' : '#356BFF', borderRadius: 2, transition: 'width .3s' }} />
              </div>
              {(pending > 0 || sent > 0) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {sent > 0 && <span style={{ fontSize: 9, color: '#356BFF' }}>{sent} aguardando</span>}
                  {pending > 0 && <span style={{ fontSize: 9, color: '#ff9f0a' }}>{pending} com alteração</span>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ borderTop: '1px solid var(--b1)', padding: '10px 12px', display: 'flex', gap: 6 }}>
              <button onClick={() => onManage(folder.id)}
                style={{ flex: 1, padding: '7px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Gerenciar
              </button>
              <button onClick={() => copyFolderLink(folder)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: copied === folder.id ? 'rgba(48,209,88,0.12)' : 'var(--s2)', border: `1px solid ${copied === folder.id ? 'rgba(48,209,88,0.3)' : 'var(--b2)'}`, color: copied === folder.id ? '#30d158' : 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {copied === folder.id ? <FiCheck size={11} /> : <FiLink size={11} />}
                {copied === folder.id ? 'Copiado!' : 'Enviar link'}
              </button>
              <button onClick={() => { if (confirm('Excluir pasta?')) deleteFolder(folder.id); }}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
              ><FiTrash2 size={12} /></button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── New Folder Modal ───────────────────────────────────────────────────────
function NewFolderModal({ onClose, workspaceId, companies }: {
  onClose: () => void;
  workspaceId?: string;
  companies: { id: string; name: string; color: string }[];
}) {
  const { addFolder } = useContentApprovalsStore();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(companies[0]?.id ?? '');
  const [period, setPeriod] = useState<FolderPeriod>('semanal');

  const create = () => {
    if (!name.trim() || !clientId) return;
    addFolder({ workspaceId, clientId, name: name.trim(), period });
    onClose();
  };

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-md mx-4 rounded-[20px]"
        style={{ background: 'var(--modal-bg)' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
      >
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Nova pasta de aprovação</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)' }}>Nome da pasta</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} placeholder="Ex: Semana 18 — Maio" style={inp} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)' }}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inp}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)' }}>Período</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['semanal', 'quinzenal', 'mensal', 'livre'] as FolderPeriod[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1px solid ${period === p ? PERIOD_COLORS[p] : 'var(--b2)'}`, background: period === p ? `${PERIOD_COLORS[p]}18` : 'transparent', color: period === p ? PERIOD_COLORS[p] : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >{PERIOD_LABELS[p]}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={create} disabled={!name.trim() || !clientId}
              style={{ padding: '8px 18px', borderRadius: 9, background: name.trim() ? '#356BFF' : 'var(--s2)', border: 'none', color: name.trim() ? '#fff' : 'var(--t4)', fontSize: 12, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed' }}
            >Criar pasta</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Folder Manager Modal ───────────────────────────────────────────────────
function FolderManagerModal({ folderId, onClose }: { folderId: string; onClose: () => void }) {
  const { folders, approvals, addApprovalToFolder, removeApprovalFromFolder, updateFolder } = useContentApprovalsStore();
  const { companies } = useTaskStore();
  const folder = useMemo(() => folders.find(f => f.id === folderId), [folders, folderId]);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(folder?.name ?? '');

  if (!folder) return null;

  const company = companies.find(c => c.id === folder.clientId);
  const clientColor = company?.color ?? '#636366';
  const inFolder = approvals.filter(a => folder.approvalIds.includes(a.id) && !a.deletedAt);
  const available = approvals.filter(a => !folder.approvalIds.includes(a.id) && !a.deletedAt && a.clientId === folder.clientId);

  const saveName = () => {
    if (nameVal.trim() && nameVal.trim() !== folder.name) updateFolder(folder.id, { name: nameVal.trim() });
    setEditingName(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 20, width: 540, maxHeight: '84vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${clientColor}20`, border: `2px solid ${clientColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: clientColor, flexShrink: 0 }}>
            {company?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            {editingName ? (
              <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
                style={{ fontSize: 15, fontWeight: 700, background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 6, padding: '3px 8px', color: 'var(--t1)', outline: 'none', width: '100%' }}
              />
            ) : (
              <div onClick={() => setEditingName(true)} style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', cursor: 'text' }}>{folder.name}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{company?.name} · <span style={{ color: PERIOD_COLORS[folder.period] }}>{PERIOD_LABELS[folder.period]}</span></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* In folder */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 8 }}>
              Na pasta ({inFolder.length})
            </div>
            {inFolder.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t4)', padding: '10px 0' }}>Nenhuma aprovação adicionada ainda.</div>
            ) : inFolder.map(a => {
              const cfg = APPROVAL_STATUS_CONFIG[a.status];
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: 5 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: a.assets[0]?.url ? `url(${a.assets[0].url}) center/cover` : 'var(--s2)', flexShrink: 0, border: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!a.assets[0]?.url && <FiImage size={12} style={{ color: 'var(--t4)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <button onClick={() => { if (confirm('Remover desta pasta?')) removeApprovalFromFolder(folder.id, a.id); }}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  ><FiX size={12} /></button>
                </div>
              );
            })}
          </div>

          {/* Available to add */}
          {available.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 8 }}>
                Adicionar ({available.length} disponíveis)
              </div>
              {available.map(a => {
                const cfg = APPROVAL_STATUS_CONFIG[a.status];
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b1)', marginBottom: 5 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: a.assets[0]?.url ? `url(${a.assets[0].url}) center/cover` : 'var(--s2)', flexShrink: 0, border: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!a.assets[0]?.url && <FiImage size={12} style={{ color: 'var(--t4)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <button onClick={() => addApprovalToFolder(folder.id, a.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(53,107,255,0.12)', border: '1px solid rgba(53,107,255,0.3)', color: '#356BFF', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >+ Adicionar</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────
function ApprovalCard({ approval, companyName, onClick, onDelete }: {
  approval: ContentApproval; companyName: string; onClick: () => void; onDelete: () => void;
}) {
  const cfg = APPROVAL_STATUS_CONFIG[approval.status];
  const cover = approval.assets[0]?.url;
  const commentsCount = approval.assets.reduce((sum, a) => sum + (a.comments?.length ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      style={{
        background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform .12s, border-color .12s',
        display: 'flex', flexDirection: 'column',
      }}
      whileHover={{ y: -2 }}
    >
      <div style={{ height: 120, background: cover ? `url(${cover}) center/cover` : 'var(--ib)', borderBottom: '1px solid var(--b1)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!cover && <FiImage size={28} style={{ color: 'var(--t4)' }} />}
        <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}40`, backdropFilter: 'blur(8px)' }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{approval.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--t4)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</span>
          <span>·</span>
          <span>{CONTENT_TYPE_LABELS[approval.type]}</span>
          {commentsCount > 0 && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <FiMessageCircle size={9} /> {commentsCount}
              </span>
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'var(--t4)' }}>{format(parseISO(approval.createdAt), "d MMM", { locale: ptBR })}</span>
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm('Mover pra lixeira?')) onDelete(); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, display: 'flex' }}
          ><FiTrash2 size={11} /></button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── New modal ─────────────────────────────────────────────────────────────
function NewApprovalModal({ onClose, onCreated, workspaceId, companies, addApproval }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  workspaceId?: string;
  companies: { id: string; name: string }[];
  addApproval: (p: Omit<ContentApproval, 'id' | 'createdAt' | 'shareToken'>) => string;
}) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(companies[0]?.id ?? '');
  const [type, setType] = useState<ContentType>('carrossel');
  const [postDate, setPostDate] = useState('');

  const submit = () => {
    if (!title.trim() || !clientId) return;
    const id = addApproval({
      workspaceId,
      clientId,
      title: title.trim(),
      type,
      assets: [],
      status: 'rascunho',
      postDate: postDate || undefined,
    });
    onCreated(id);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md mx-4 rounded-[20px] glass-panel"
        style={{ background: 'var(--modal-bg)' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
      >
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Nova aprovação</div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Título</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Carrossel Black Friday"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13 }}
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Tipo de conteúdo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TYPE_OPTIONS.map(t => (
                <button key={t} onClick={() => setType(t)}
                  style={{
                    padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                    background: type === t ? 'rgba(53,107,255,0.16)' : 'var(--s1)',
                    border: `1px solid ${type === t ? 'rgba(53,107,255,0.4)' : 'var(--b2)'}`,
                    color: type === t ? '#356BFF' : 'var(--t3)', cursor: 'pointer',
                  }}
                >{CONTENT_TYPE_LABELS[t]}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Data de postagem</label>
            <input type="date" value={postDate} onChange={e => setPostDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13 }}
            />
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>Aparece no Calendário Editorial a partir desta data</div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={submit} disabled={!title.trim() || !clientId}
              style={{ padding: '8px 18px', borderRadius: 9, background: title.trim() ? '#356BFF' : 'var(--s2)', border: 'none', color: title.trim() ? '#fff' : 'var(--t4)', fontSize: 12, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}
            >Criar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────
function ApprovalEditor({ approval, onClose }: { approval: ContentApproval; onClose: () => void }) {
  const { user } = useAuthStore();
  const { updateApproval, addAsset, removeAsset, addComment, resolveComment, markSent, markViewed, requestChanges, approve, markPosted, deleteApproval } = useContentApprovalsStore();
  const { companies } = useTaskStore();
  const company = companies.find(c => c.id === approval.clientId);
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cfg = APPROVAL_STATUS_CONFIG[approval.status];
  const shareUrl = `${window.location.origin}${window.location.pathname}#aprovar=${approval.shareToken}`;


  const handleStatusChange = (s: ApprovalStatus) => {
    switch (s) {
      case 'enviado': markSent(approval.id); handleCopyLink(); break;
      case 'visualizado': markViewed(approval.id); break;
      case 'alteracao': {
        const fb = prompt('Feedback / motivo da alteração (opcional):') ?? '';
        requestChanges(approval.id, fb);
        break;
      }
      case 'aprovado': approve(approval.id); break;
      case 'postado': markPosted(approval.id); break;
      default: updateApproval(approval.id, { status: s }); break;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}: muito grande (max 5MB)`);
          continue;
        }
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
        const path = `${user.id}/${approval.id}/${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const { error } = await supabase.storage.from('content-assets').upload(path, file, { cacheControl: '3600' });
        if (error) { console.error('upload err:', error); alert('Falha no upload'); continue; }
        const { data: { publicUrl } } = supabase.storage.from('content-assets').getPublicUrl(path);
        addAsset(approval.id, { url: publicUrl });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = () => {
    markSent(approval.id);
    handleCopyLink();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 glass-backdrop" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-4xl mx-4 rounded-[20px] glass-panel"
        style={{ background: 'var(--modal-bg)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex' }}>
            <FiArrowLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={approval.title} onChange={e => updateApproval(approval.id, { title: e.target.value })}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--t1)', fontSize: 16, fontWeight: 700, outline: 'none' }}
            />
            <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>{company?.name ?? '?'}</span>
              <span>·</span>
              <span>{CONTENT_TYPE_LABELS[approval.type]}</span>
              <span>·</span>
              <span style={{ padding: '1px 7px', borderRadius: 999, background: `${cfg.color}22`, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={handleCopyLink} title="Copiar link público"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
            {copied ? <FiCheck size={11} style={{ color: '#30d158' }} /> : <FiCopy size={11} />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          {approval.status === 'rascunho' && (
            <button onClick={handleSend}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#356BFF', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <FiSend size={11} /> Enviar pro cliente
            </button>
          )}
          <button onClick={() => { if (confirm('Mover pra lixeira?')) { deleteApproval(approval.id); onClose(); } }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, display: 'flex' }}>
            <FiTrash2 size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Asset preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--b1)' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              {approval.assets[activeAssetIdx]
                ? <AssetView asset={approval.assets[activeAssetIdx]}
                    onAddComment={(area) => {
                      const text = prompt('Comentário:');
                      if (text && text.trim()) {
                        addComment(approval.id, approval.assets[activeAssetIdx].id, { area, text: text.trim(), fromClient: false });
                      }
                    }}
                    onResolve={(commentId) => resolveComment(approval.id, approval.assets[activeAssetIdx].id, commentId)}
                  />
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--t4)' }}>
                    <FiImage size={56} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum asset ainda</div>
                  </div>
                )
              }
            </div>

            {/* Asset thumbs */}
            <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid var(--b1)', display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
              {approval.assets.map((a, idx) => (
                <button key={a.id} onClick={() => setActiveAssetIdx(idx)}
                  style={{
                    flexShrink: 0, width: 56, height: 56, borderRadius: 8,
                    background: `url(${a.url}) center/cover`,
                    border: idx === activeAssetIdx ? '2px solid #356BFF' : '2px solid transparent',
                    cursor: 'pointer', position: 'relative',
                  }}
                >
                  {(a.comments?.length ?? 0) > 0 && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#ff9f0a', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.comments?.length}
                    </span>
                  )}
                </button>
              ))}
              <label style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, border: '2px dashed var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer', color: 'var(--t3)' }}>
                {uploading
                  ? <div style={{ width: 14, height: 14, border: '2px solid var(--b2)', borderTopColor: 'var(--t2)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <FiUpload size={16} />}
                <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {approval.assets[activeAssetIdx] && (
                <button onClick={() => { if (confirm('Remover asset?')) { removeAsset(approval.id, approval.assets[activeAssetIdx].id); setActiveAssetIdx(0); } }}
                  style={{ marginLeft: 'auto', flexShrink: 0, padding: 8, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                  <FiTrash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Comments + info side */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Link público</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input readOnly value={shareUrl}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 7, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, fontFamily: 'monospace', outline: 'none' }}
                />
                <a href={shareUrl} target="_blank" rel="noreferrer"
                  style={{ padding: 6, borderRadius: 7, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)', display: 'flex' }}>
                  <FiExternalLink size={11} />
                </a>
              </div>
              {approval.feedback && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#ff9f0a', marginBottom: 4 }}>Feedback do cliente</div>
                  <div style={{ fontSize: 11, color: 'var(--t1)' }}>{approval.feedback}</div>
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Mudar status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(Object.keys(APPROVAL_STATUS_CONFIG) as ApprovalStatus[]).map(s => {
                  const c = APPROVAL_STATUS_CONFIG[s];
                  const isActive = approval.status === s;
                  return (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      style={{
                        padding: '4px 9px', borderRadius: 999, fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                        background: isActive ? `${c.color}22` : 'transparent',
                        border: `1px solid ${isActive ? c.color : 'var(--b2)'}`,
                        color: isActive ? c.color : 'var(--t4)',
                      }}
                    >{c.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Data de postagem */}
            <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Data de postagem</div>
              <input type="date" value={approval.postDate ?? ''}
                onChange={e => updateApproval(approval.id, { postDate: e.target.value || undefined })}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
              />
              {approval.postDate && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>Aparece no Calendário Editorial</div>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Comentários do asset atual</div>
              {(approval.assets[activeAssetIdx]?.comments?.length ?? 0) === 0
                ? <div style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>Nenhum comentário. Clica na imagem pra adicionar.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {approval.assets[activeAssetIdx]?.comments?.map(c => (
                      <div key={c.id} style={{
                        padding: '8px 10px', borderRadius: 8,
                        background: c.fromClient ? 'rgba(255,159,10,0.08)' : 'var(--s1)',
                        border: `1px solid ${c.fromClient ? 'rgba(255,159,10,0.25)' : 'var(--b2)'}`,
                        opacity: c.resolved ? 0.55 : 1,
                      }}>
                        <div style={{ fontSize: 10, color: c.fromClient ? '#ff9f0a' : 'var(--t3)', fontWeight: 600, marginBottom: 3 }}>
                          {c.fromClient ? 'Cliente' : 'Você'} · {format(parseISO(c.createdAt), "d MMM HH:mm", { locale: ptBR })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--t1)', textDecoration: c.resolved ? 'line-through' : 'none' }}>{c.text}</div>
                        <button onClick={() => resolveComment(approval.id, approval.assets[activeAssetIdx].id, c.id)}
                          style={{ marginTop: 4, fontSize: 10, color: c.resolved ? 'var(--t4)' : '#30d158', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {c.resolved ? '✓ Resolvido — desfazer' : 'Marcar resolvido'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Asset view (with click-to-comment) ────────────────────────────────────
function AssetView({ asset, onAddComment, onResolve }: {
  asset: ContentAsset;
  onAddComment: (area: { x: number; y: number }) => void;
  onResolve: (commentId: string) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddComment({ x, y });
  };

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(asset.url);

  return (
    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
      {isVideo
        ? <video src={asset.url} controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
        : (
          <div onClick={handleClick} style={{ cursor: 'crosshair', position: 'relative' }}>
            <img src={asset.url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, display: 'block' }} />
            {asset.comments?.filter(c => c.area).map((c, i) => (
              <button key={c.id}
                onClick={(e) => { e.stopPropagation(); onResolve(c.id); }}
                title={c.text}
                style={{
                  position: 'absolute', left: `${c.area!.x}%`, top: `${c.area!.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: c.resolved ? '#30d158' : c.fromClient ? '#ff9f0a' : '#356BFF',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  border: '2px solid #fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >{i + 1}</button>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── Vista pública para o cliente ──────────────────────────────────────────
export function PublicApprovalView({ token, onBack }: { token: string; onBack: () => void }) {
  const { approvals, markViewed, requestChanges, approve, addComment } = useContentApprovalsStore();
  const approval = approvals.find(a => a.shareToken === token && !a.deletedAt);
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (approval?.status === 'enviado') markViewed(approval.id);
  }, [approval?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddComment = (area: { x: number; y: number }) => {
    if (!approval) return;
    const text = prompt('Comentário (será ancorado neste ponto):');
    if (text?.trim()) addComment(approval.id, approval.assets[activeIdx].id, { area, text: text.trim(), fromClient: true });
  };

  const handleRequestChanges = () => {
    if (!approval) return;
    const fb = feedback.trim() || (prompt('Descreva o que precisa ser alterado:') ?? '');
    if (!fb) return;
    requestChanges(approval.id, fb);
    setSubmitted(true);
  };

  const handleApprove = () => {
    if (!approval) return;
    approve(approval.id);
    setSubmitted(true);
  };

  const dark: React.CSSProperties = { minHeight: '100vh', background: '#080810', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 };

  if (!approval) return (
    <div style={dark}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Aprovação não encontrada</div>
      <div style={{ fontSize: 13, color: '#888', textAlign: 'center', maxWidth: 340 }}>Este link pode ter expirado ou o conteúdo foi removido.</div>
      <button onClick={onBack} style={{ marginTop: 8, padding: '10px 22px', borderRadius: 10, background: '#356BFF', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>← Voltar</button>
    </div>
  );

  const decided = approval.status === 'aprovado' || approval.status === 'postado';
  const altRequested = approval.status === 'alteracao';

  if (submitted || decided) return (
    <div style={dark}>
      <div style={{ fontSize: 60 }}>{decided ? '✅' : '📝'}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{decided ? 'Conteúdo aprovado!' : 'Alterações solicitadas'}</div>
      <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
        {decided ? 'Obrigado! A equipe foi notificada.' : 'Obrigado! A equipe vai revisar e retornar em breve.'}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#356BFF,#64C4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>✓</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{approval.title}</div>
          <div style={{ fontSize: 11, color: '#777', marginTop: 1 }}>{CONTENT_TYPE_LABELS[approval.type]} · Aguardando sua aprovação</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 60px', gap: 20, overflowY: 'auto' }}>
        {approval.assets.length > 0 ? (
          <>
            <div style={{ width: '100%', maxWidth: 700 }}>
              <AssetView asset={approval.assets[activeIdx]} onAddComment={handleAddComment} onResolve={() => {}} />
            </div>
            {approval.assets.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {approval.assets.map((a, i) => (
                  <button key={a.id} onClick={() => setActiveIdx(i)}
                    style={{ width: 52, height: 52, borderRadius: 8, background: `url(${a.url}) center/cover`, border: i === activeIdx ? '2px solid #356BFF' : '2px solid #2a2a3e', cursor: 'pointer', flexShrink: 0 }}
                  />
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#555', textAlign: 'center' }}>Clique na imagem para adicionar um comentário ancorado naquele ponto</div>
          </>
        ) : (
          <div style={{ padding: 40, color: '#555', fontSize: 14 }}>Nenhum asset disponível ainda.</div>
        )}

        {/* Feedback */}
        <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#666' }}>Feedback geral (opcional)</label>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Escreva seu feedback..." rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, background: '#111', border: '1px solid #2a2a3e', color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none' }}
          />
        </div>

        {!altRequested && (
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 700 }}>
            <button onClick={handleRequestChanges}
              style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.4)', color: '#ff9f0a', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >Pedir alteração</button>
            <button onClick={handleApprove}
              style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(48,209,88,0.14)', border: '1px solid rgba(48,209,88,0.4)', color: '#30d158', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >✓ Aprovar</button>
          </div>
        )}
        {altRequested && (
          <div style={{ width: '100%', maxWidth: 700, padding: 16, borderRadius: 12, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', fontSize: 13, color: '#ff9f0a', textAlign: 'center' }}>
            Alterações já solicitadas. Aguardando revisão.
            {approval.feedback && <div style={{ marginTop: 6, fontSize: 12, color: '#aaa' }}>"{approval.feedback}"</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista pública da PASTA de aprovação ────────────────────────────────────
export function PublicApprovalFolderView({ token, onBack: _onBack }: { token: string; onBack: () => void }) {
  const { approvals, folders } = useContentApprovalsStore();
  const { companies } = useTaskStore();
  const folder = folders.find(f => f.shareToken === token && !f.deletedAt);
  const [viewingToken, setViewingToken] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!folder) return (
    <div style={{ minHeight: '100vh', background: '#07070f', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <div style={{ fontSize: 48, opacity: 0.4 }}>📁</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Pasta não encontrada</div>
      <div style={{ fontSize: 13, color: '#444', textAlign: 'center', maxWidth: 340 }}>Este link pode ter expirado ou a pasta foi removida.</div>
    </div>
  );

  if (viewingToken) {
    return <PublicApprovalView token={viewingToken} onBack={() => setViewingToken(null)} />;
  }

  const company = companies.find(c => c.id === folder.clientId);
  const clientColor = company?.color ?? '#356BFF';
  const initial = company?.name?.[0]?.toUpperCase() ?? '?';
  const folderApprovals = approvals.filter(a => folder.approvalIds.includes(a.id) && !a.deletedAt);
  const total = folderApprovals.length;
  const approved = folderApprovals.filter(a => a.status === 'aprovado' || a.status === 'postado').length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  const handleOpen = (a: ContentApproval) => {
    setViewingToken(a.shareToken);
  };

  return (
    <div style={{ background: '#07070f', color: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Client header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `${clientColor}20`, border: `2px solid ${clientColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: clientColor, flexShrink: 0 }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 4, fontWeight: 600 }}>
              {PERIOD_LABELS[folder.period]}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{folder.name}</h1>
            <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>{company?.name}</div>
          </div>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div style={{ marginBottom: 32, padding: '16px 20px', borderRadius: 14, background: '#0e0e1a', border: '1px solid #1e1e32' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555', marginBottom: 10 }}>
              <span>{total} {total === 1 ? 'peça' : 'peças'} para revisar</span>
              <span style={{ color: pct === 100 ? '#30d158' : '#444' }}>{approved} de {total} aprovadas</span>
            </div>
            <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#30d158' : '#356BFF', borderRadius: 3, transition: 'width .4s' }} />
            </div>
          </div>
        )}

        {/* Approval items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {folderApprovals.map((a, i) => {
            const cfg = APPROVAL_STATUS_CONFIG[a.status];
            const cover = a.assets[0]?.url;
            const isDone = a.status === 'aprovado' || a.status === 'postado';
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: '#0e0e1a', border: `1px solid ${isDone ? 'rgba(48,209,88,0.2)' : '#1e1e32'}`, cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
                onClick={() => handleOpen(a)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#13131f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0e0e1a'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', flexShrink: 0, width: 22, textAlign: 'right' }}>{i + 1}.</div>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: cover ? `url(${cover}) center/cover` : '#181828', border: '1px solid #1e1e32', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!cover && <FiImage size={18} style={{ color: '#2a2a3e' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? '#e0e0f0' : '#c0c0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{CONTENT_TYPE_LABELS[a.type]}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 12, color: '#333' }}>›</span>
                </div>
              </div>
            );
          })}
        </div>

        {total === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#333', fontSize: 13 }}>
            Nenhuma peça adicionada a esta pasta ainda.
          </div>
        )}

        <div style={{ marginTop: 48, textAlign: 'center', fontSize: 11, color: '#1a1a2a' }}>Powered by EvoStudio</div>
      </div>
    </div>
  );
}
