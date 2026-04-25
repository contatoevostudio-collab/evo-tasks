import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiX, FiEdit2, FiTrash2, FiPhone, FiMail, FiInstagram,
  FiDollarSign, FiArrowRight, FiCheck, FiUser, FiMinimize2, FiMaximize2,
  FiRotateCcw, FiArchive, FiAlertTriangle,
  FiCalendar, FiMessageCircle, FiPhoneCall, FiVideo, FiChevronDown, FiClock,
  FiMenu,
} from 'react-icons/fi';
import { useIsMobile } from '../hooks/useMediaQuery';
import { parseISO, differenceInDays, isBefore, startOfDay, format } from 'date-fns';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DraggableAttributes,
} from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { Lead, LeadStage, LeadInteraction } from '../types';
import { useTaskStore } from '../store/tasks';

// ─── Stages config ────────────────────────────────────────────────────────────
const STAGES: { id: LeadStage; label: string; color: string; desc: string }[] = [
  { id: 'prospeccao', label: 'Prospecção',   color: '#636366', desc: 'Leads identificados' },
  { id: 'contato',    label: 'Contato',      color: '#ff9f0a', desc: 'Primeiro contato feito' },
  { id: 'proposta',   label: 'Proposta',     color: '#356BFF', desc: 'Proposta enviada' },
  { id: 'negociacao', label: 'Negociação',   color: '#bf5af2', desc: 'Em negociação' },
  { id: 'fechado',    label: 'Captado',      color: '#30d158', desc: 'Contrato fechado' },
];

const COMPANY_COLORS = ['#30d158','#ff9f0a','#ff453a','#bf5af2','#356BFF','#64C4FF','#ff6b6b','#ffd60a','#ff6b35','#00c7be'];

// ─── Temperature helpers ──────────────────────────────────────────────────────
type Temperature = 'frio' | 'morno' | 'quente';

const TEMP_CONFIG: Record<Temperature, { icon: string; color: string; label: string; next: Temperature }> = {
  frio:   { icon: '🧊', color: '#64C4FF', label: 'Frio',   next: 'morno'  },
  morno:  { icon: '🌡️', color: '#ff9f0a', label: 'Morno',  next: 'quente' },
  quente: { icon: '🔥', color: '#ff453a', label: 'Quente', next: 'frio'   },
};

// ─── Interaction type config ───────────────────────────────────────────────────
const INTERACTION_TYPES: { id: LeadInteraction['type']; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'call',    label: 'Ligação',  icon: <FiPhoneCall size={10} />,    color: '#30d158' },
  { id: 'email',   label: 'Email',    icon: <FiMail size={10} />,         color: '#356BFF' },
  { id: 'meeting', label: 'Reunião',  icon: <FiVideo size={10} />,        color: '#bf5af2' },
  { id: 'message', label: 'Mensagem', icon: <FiMessageCircle size={10} />, color: '#ff9f0a' },
  { id: 'outro',   label: 'Outro',    icon: <FiClock size={10} />,        color: '#636366' },
];

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
  color: 'var(--t3)', display: 'block', marginBottom: 6,
};

// ─── TemperatureBadge ─────────────────────────────────────────────────────────
function TemperatureBadge({ temperature, onCycle }: { temperature?: Temperature; onCycle: (t: Temperature) => void }) {
  if (!temperature) {
    return (
      <button
        onClick={e => { e.stopPropagation(); onCycle('frio'); }}
        title="Definir temperatura"
        style={{ background: 'var(--s2)', border: '1px dashed var(--b2)', cursor: 'pointer', fontSize: 10, color: 'var(--t4)', padding: '2px 8px', borderRadius: 99, lineHeight: 1.4, transition: 'all .15s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'}
      >
        + temp
      </button>
    );
  }
  const cfg = TEMP_CONFIG[temperature];
  return (
    <button
      onClick={e => { e.stopPropagation(); onCycle(cfg.next); }}
      title={`Temperatura: ${cfg.label} — clique para mudar`}
      style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4, color: cfg.color, transition: 'all .15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${cfg.color}28`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = `${cfg.color}18`}
    >
      {cfg.label}
    </button>
  );
}

// ─── FollowUpBadge ────────────────────────────────────────────────────────────
function FollowUpBadge({ date, onSave, onClear }: { date?: string; onSave: (d: string) => void; onClear: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(date ?? '');
  const today = startOfDay(new Date());

  if (editing) {
    return (
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <input
          type="date"
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave(val); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{ ...inputStyle, padding: '2px 6px', fontSize: 11, width: 'auto', borderRadius: 6 }}
        />
        <button
          onClick={() => { onSave(val); setEditing(false); }}
          style={{ background: '#356BFF', border: 'none', borderRadius: 5, color: '#fff', fontSize: 10, padding: '2px 7px', cursor: 'pointer', fontWeight: 600 }}
        >
          OK
        </button>
        {date && (
          <button
            onClick={() => { onClear(); setEditing(false); }}
            aria-label="Remover follow-up"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff453a', fontSize: 10, padding: '2px 4px' }}
          >
            <FiX size={10} />
          </button>
        )}
      </div>
    );
  }

  if (!date) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        title="Definir próximo follow-up"
        aria-label="Definir próximo follow-up"
        style={{ background: 'transparent', border: '1px dashed var(--b2)', cursor: 'pointer', fontSize: 10, color: 'var(--t4)', padding: '1px 6px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3 }}
      >
        <FiCalendar size={9} />
      </button>
    );
  }

  const parsed = parseISO(date);
  const isOverdue = isBefore(parsed, today);
  const color = isOverdue ? '#ff453a' : '#30d158';
  const label = format(parsed, 'dd/MM');

  return (
    <button
      onClick={e => { e.stopPropagation(); setVal(date); setEditing(true); }}
      title={`Follow-up: ${date}${isOverdue ? ' — ATRASADO' : ''}`}
      style={{ background: `${color}15`, border: `1px solid ${color}44`, cursor: 'pointer', fontSize: 10, color, padding: '1px 6px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
    >
      <FiCalendar size={9} />
      {label}
    </button>
  );
}

// ─── Interaction Timeline (inside expanded card) ───────────────────────────────
function InteractionTimeline({ lead, onAdd, onDelete }: {
  lead: Lead;
  onAdd: (i: Omit<LeadInteraction, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [note, setNote]     = useState('');
  const [type, setType]     = useState<LeadInteraction['type']>('call');
  const [date, setDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const interactions = (lead.interactions ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = () => {
    if (!note.trim()) return;
    onAdd({ note: note.trim(), type, date });
    setNote('');
    setShowForm(false);
  };

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, borderTop: '1px solid var(--b1)', paddingTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t3)' }}>
          Histórico {interactions.length > 0 && `(${interactions.length})`}
        </span>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: showForm ? 'rgba(53,107,255,0.15)' : 'var(--s2)', border: `1px solid ${showForm ? 'rgba(53,107,255,0.4)' : 'var(--b2)'}`, color: showForm ? '#356BFF' : 'var(--t3)', cursor: 'pointer' }}
        >
          <FiPlus size={9} /> Adicionar
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 10 }}
          >
            <div style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {INTERACTION_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: type === t.id ? `${t.color}20` : 'transparent', border: `1px solid ${type === t.id ? t.color : 'var(--b2)'}`, color: type === t.id ? t.color : 'var(--t3)', transition: 'all .12s' }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              {/* Date + note */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ ...inputStyle, padding: '5px 8px', fontSize: 11, width: 120 }}
                />
                <input
                  autoFocus
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Nota da interação..."
                  style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: 11 }}
                />
                <button
                  onClick={handleAdd}
                  disabled={!note.trim()}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: note.trim() ? '#356BFF' : 'var(--s2)', border: 'none', color: note.trim() ? '#fff' : 'var(--t4)', cursor: note.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {interactions.length === 0 && !showForm && (
        <p style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', padding: '8px 0' }}>Nenhuma interação ainda</p>
      )}
      {interactions.map(i => {
        const typeCfg = INTERACTION_TYPES.find(t => t.id === i.type)!;
        return (
          <div key={i.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${typeCfg.color}20`, border: `1px solid ${typeCfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeCfg.color, flexShrink: 0, marginTop: 1 }}>
              {typeCfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: typeCfg.color }}>{typeCfg.label}</span>
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{format(parseISO(i.date), 'dd/MM/yy')}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--t2)', margin: 0, lineHeight: 1.4 }}>{i.note}</p>
            </div>
            <button
              onClick={() => onDelete(i.id)}
              aria-label="Excluir interação"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, borderRadius: 4, flexShrink: 0, display: 'flex' }}
            >
              <FiTrash2 size={9} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Draggable Lead Card ──────────────────────────────────────────────────────
function DraggableLeadCard(props: Parameters<typeof LeadCard>[0]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.lead.id });
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <LeadCard {...props} dragHandleListeners={listeners} dragHandleAttributes={attributes} />
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({
  lead, stageColor: _stageColor, compact, onEdit, onDelete, onMove, onConvert,
  onUpdateLead, onAddInteraction, onDeleteInteraction,
  dragHandleListeners, dragHandleAttributes,
}: {
  lead: Lead; stageColor: string; compact?: boolean;
  onEdit: () => void; onDelete: () => void;
  onMove: (stage: LeadStage) => void; onConvert: () => void;
  onUpdateLead: (updates: Partial<Lead>) => void;
  onAddInteraction: (i: Omit<LeadInteraction, 'id'>) => void;
  onDeleteInteraction: (id: string) => void;
  dragHandleListeners?: SyntheticListenerMap;
  dragHandleAttributes?: DraggableAttributes;
}) {
  const [showActions, setShowActions]     = useState(false);
  const [showHistory, setShowHistory]     = useState(false);
  const { companies } = useTaskStore();
  const days = differenceInDays(new Date(), parseISO(lead.createdAt));

  // Linked company badge
  const linkedCompany = lead.linkedCompanyId ? companies.find(c => c.id === lead.linkedCompanyId) : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'relative',
        background: 'var(--s1)',
        borderRadius: compact ? 8 : 12,
        padding: compact ? '6px 10px 6px 13px' : '12px 14px 12px 17px',
        marginBottom: compact ? 4 : 8,
        cursor: 'pointer',
        border: '1px solid var(--b1)',
        overflow: 'hidden',
        transition: 'border-color .15s, background .15s',
      }}
      onClick={() => setShowActions(s => !s)}
      onMouseLeave={() => { if (!showHistory) setShowActions(false); }}
    >
      {/* Left accent bar in stage color */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: _stageColor, opacity: 0.7 }} />

      {/* ── Row 1: drag + name + badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Drag handle */}
        <div
          {...dragHandleListeners}
          {...dragHandleAttributes}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'grab', color: 'var(--t4)', flexShrink: 0, lineHeight: 1 }}
        >
          ⠿
        </div>

        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.name}
        </div>

        {/* Temperature badge */}
        <TemperatureBadge
          temperature={lead.temperature}
          onCycle={(t) => onUpdateLead({ temperature: t })}
        />

        {/* Follow-up calendar — always visible next to temperature */}
        <div onClick={e => e.stopPropagation()}>
          <FollowUpBadge
            date={lead.nextFollowUp}
            onSave={(d) => onUpdateLead({ nextFollowUp: d })}
            onClear={() => onUpdateLead({ nextFollowUp: undefined })}
          />
        </div>

        {!compact && lead.convertedToCompanyId && (
          <span style={{ fontSize: 9, color: '#30d158', fontWeight: 700, background: 'rgba(48,209,88,0.1)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
            cliente
          </span>
        )}
        {!compact && (
          <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500, flexShrink: 0 }}>
            {days === 0 ? 'hoje' : `${days}d`}
          </span>
        )}
      </div>

      {/* ── Row 2: contact + linked company ── */}
      {!compact && (lead.contact || linkedCompany || (lead.linkedProposalIds && lead.linkedProposalIds.length > 0)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
          {lead.contact && (
            <span style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiUser size={9} /> {lead.contact}
            </span>
          )}
          {linkedCompany && (
            <span style={{ fontSize: 10, fontWeight: 700, color: linkedCompany.color, background: `${linkedCompany.color}18`, border: `1px solid ${linkedCompany.color}40`, borderRadius: 5, padding: '1px 6px' }}>
              {linkedCompany.name}
            </span>
          )}
          {lead.linkedProposalIds && lead.linkedProposalIds.length > 0 && (
            <span title={`${lead.linkedProposalIds.length} proposta${lead.linkedProposalIds.length === 1 ? '' : 's'}`}
              style={{ fontSize: 10, fontWeight: 700, color: '#356BFF', background: 'rgba(53,107,255,0.12)', border: '1px solid rgba(53,107,255,0.30)', borderRadius: 5, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              📄 {lead.linkedProposalIds.length}
            </span>
          )}
        </div>
      )}

      {/* ── Row 3: contact links ── */}
      {!compact && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {lead.phone && (
            <span style={{ fontSize: 10, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FiPhone size={9} /> {lead.phone}
            </span>
          )}
          {lead.instagram && (
            <span style={{ fontSize: 10, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FiInstagram size={9} /> {lead.instagram}
            </span>
          )}
          {lead.email && (
            <span style={{ fontSize: 10, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FiMail size={9} /> {lead.email}
            </span>
          )}
          {lead.budget && (
            <span style={{ fontSize: 10, color: '#30d158', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
              <FiDollarSign size={9} /> {lead.budget}
            </span>
          )}
        </div>
      )}

      {/* ── Row 4: interactions count ── */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {(lead.interactions?.length ?? 0) > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setShowHistory(s => !s); }}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: showHistory ? 'rgba(53,107,255,0.15)' : 'transparent', border: `1px solid ${showHistory ? 'rgba(53,107,255,0.4)' : 'var(--b1)'}`, color: showHistory ? '#356BFF' : 'var(--t3)', cursor: 'pointer' }}
            >
              <FiMessageCircle size={9} /> {lead.interactions!.length}
            </button>
          )}
        </div>
      )}

      {!compact && lead.notes && !showActions && (
        <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8, lineHeight: 1.5, paddingTop: 8, borderTop: '1px solid var(--b1)' }}>
          {lead.notes}
        </p>
      )}

      {/* ── Interaction history (expanded inline) ── */}
      <AnimatePresence>
        {showHistory && !compact && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <InteractionTimeline
              lead={lead}
              onAdd={onAddInteraction}
              onDelete={onDeleteInteraction}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions (click-to-reveal) ── */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--b1)' }}>
              <button onClick={e => { e.stopPropagation(); onEdit(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer' }}>
                <FiEdit2 size={9} /> Editar
              </button>
              {/* Show add interaction button too */}
              <button onClick={e => { e.stopPropagation(); setShowActions(false); setShowHistory(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer' }}>
                <FiMessageCircle size={9} /> Histórico
              </button>
              {/* Move to stage buttons */}
              {STAGES.map((s, idx) => {
                const cur = STAGES.findIndex(x => x.id === lead.stage);
                if (s.id === lead.stage || idx < cur) return null;
                return (
                  <button key={s.id} onClick={e => { e.stopPropagation(); onMove(s.id); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${s.color}14`, border: `1px solid ${s.color}44`, color: s.color, cursor: 'pointer' }}>
                    <FiArrowRight size={9} /> {s.label}
                  </button>
                );
              })}
              {lead.stage === 'fechado' && !lead.convertedToCompanyId && (
                <button onClick={e => { e.stopPropagation(); onConvert(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.4)', color: '#30d158', cursor: 'pointer' }}>
                  <FiCheck size={9} /> Virar Cliente
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); onDelete(); }} aria-label="Excluir lead"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 10, background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer' }}>
                <FiTrash2 size={9} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Lead Modal (create/edit) ──────────────────────────────────────────────────
function LeadModal({
  lead, onClose, onSave, companies,
}: {
  lead?: Lead; onClose: () => void; onSave: (data: Omit<Lead, 'id' | 'createdAt'>) => void;
  companies: { id: string; name: string; color: string }[];
}) {
  const [name,            setName]            = useState(lead?.name ?? '');
  const [contact,         setContact]         = useState(lead?.contact ?? '');
  const [phone,           setPhone]           = useState(lead?.phone ?? '');
  const [email,           setEmail]           = useState(lead?.email ?? '');
  const [instagram,       setInstagram]       = useState(lead?.instagram ?? '');
  const [budget,          setBudget]          = useState(lead?.budget ?? '');
  const [notes,           setNotes]           = useState(lead?.notes ?? '');
  const [stage,           setStage]           = useState<LeadStage>(lead?.stage ?? 'prospeccao');
  const [linkedCompanyId, setLinkedCompanyId] = useState(lead?.linkedCompanyId ?? '');
  const [nextFollowUp,    setNextFollowUp]    = useState(lead?.nextFollowUp ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      contact: contact.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      instagram: instagram.trim() || undefined,
      budget: budget.trim() || undefined,
      notes: notes.trim() || undefined,
      stage,
      temperature: lead?.temperature,
      nextFollowUp: nextFollowUp || undefined,
      interactions: lead?.interactions,
      linkedCompanyId: linkedCompanyId || undefined,
      convertedToCompanyId: lead?.convertedToCompanyId,
    });
  };

  const selectedCompany = companies.find(c => c.id === linkedCompanyId);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, margin: '0 16px', background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 16, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ height: 3, background: '#356BFF' }} />
          <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{lead ? 'Editar Lead' : 'Novo Lead'}</span>
              <button onClick={onClose} aria-label="Fechar" style={{ background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 7, borderRadius: 8, display: 'flex' }}><FiX size={14} /></button>
            </div>

            {/* Stage */}
            <div>
              <span style={labelStyle}>Etapa</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {STAGES.map(s => (
                  <button key={s.id} onClick={() => setStage(s.id)}
                    style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: stage === s.id ? `${s.color}22` : 'var(--s1)', border: `1px solid ${stage === s.id ? s.color : 'var(--b1)'}`, color: stage === s.id ? s.color : 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>Nome do lead *</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Clínica X, Loja Y..."
                style={inputStyle} />
            </div>

            {/* Contact + Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Contato</label>
                <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nome do responsável" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Orçamento</label>
                <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="ex: R$ 1.500/mês" style={inputStyle} />
              </div>
            </div>

            {/* Phone + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Instagram</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@perfil" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
            </div>

            {/* Next follow-up */}
            <div>
              <label style={labelStyle}>Próximo Follow-up</label>
              <input type="date" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)} style={inputStyle} />
            </div>

            {/* Link to existing company (#39) */}
            <div>
              <label style={labelStyle}>Vincular empresa</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={linkedCompanyId}
                  onChange={e => setLinkedCompanyId(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
                >
                  <option value="">Nenhuma</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--t3)', display: 'flex' }}>
                  <FiChevronDown size={14} />
                </div>
                {selectedCompany && (
                  <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: selectedCompany.color }} />
                )}
              </div>
              {selectedCompany && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: selectedCompany.color, background: `${selectedCompany.color}18`, border: `1px solid ${selectedCompany.color}40`, borderRadius: 5, padding: '2px 8px' }}>
                    {selectedCompany.name}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Contexto, próximos passos, observações..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: name.trim() ? '#356BFF' : 'var(--s2)', border: 'none', color: name.trim() ? '#fff' : 'var(--t4)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                {lead ? 'Salvar' : 'Criar Lead'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Convert Lead Modal ────────────────────────────────────────────────────────
function ConvertModal({ lead, onClose, onConvert }: { lead: Lead; onClose: () => void; onConvert: (name: string, color: string) => void }) {
  const [name,  setName]  = useState(lead.name.toUpperCase());
  const [color, setColor] = useState(COMPANY_COLORS[0]);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360, margin: '0 16px', background: 'var(--modal-bg)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 16, padding: '20px 22px' }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>Converter em Cliente</div>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
            Isso vai criar uma nova empresa na aba Empresas.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Nome da empresa</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value.toUpperCase())}
              style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Cor</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COMPANY_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--t1)' : '2px solid transparent', cursor: 'pointer', transition: 'transform .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => { onConvert(name, color); onClose(); }} disabled={!name.trim()}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#30d158', border: 'none', color: '#fff', cursor: 'pointer' }}>
              Criar Cliente
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────────────────
function DroppableColumn({ stageId, children }: { stageId: LeadStage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1, overflowY: 'auto', padding: '10px 10px',
        background: isOver ? 'rgba(53,107,255,0.06)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main CRMPage ──────────────────────────────────────────────────────────────
export function CRMPage() {
  const {
    leads, companies, addLead, updateLead, deleteLead, moveLead, convertLead,
    addLeadInteraction, deleteLeadInteraction,
    restoreLead, permanentlyDeleteLead, showToast, hideToast,
  } = useTaskStore();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead,   setEditingLead]   = useState<Lead | null>(null);
  const [convertLead_,  setConvertLead_]  = useState<Lead | null>(null);
  const [activeLead,    setActiveLead]    = useState<Lead | null>(null);
  const [compact,       setCompact]       = useState(false);
  const [showTrash,     setShowTrash]     = useState(false);
  const [confirmPermaId, setConfirmPermaId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Active leads (not in trash)
  const activeLeads = leads.filter(l => !l.deletedAt);

  // Trash: only items deleted within last 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const trashedLeads = leads
    .filter(l => l.deletedAt && new Date(l.deletedAt).getTime() >= cutoff)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  const handleDragStart = (e: DragStartEvent) => {
    const lead = activeLeads.find(l => l.id === e.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveLead(null);
    const { over, active } = e;
    if (!over) return;
    const targetStage = over.id as LeadStage;
    const lead = activeLeads.find(l => l.id === active.id);
    if (lead && lead.stage !== targetStage) {
      moveLead(lead.id, targetStage);
    }
  };

  const handleSaveLead = (data: Omit<Lead, 'id' | 'createdAt'>) => {
    if (editingLead) {
      updateLead(editingLead.id, data);
    } else {
      addLead(data);
    }
    setShowLeadModal(false);
    setEditingLead(null);
  };

  const handleSoftDelete = (id: string) => {
    deleteLead(id);
    showToast('Lead movido para a lixeira', () => {
      restoreLead(id);
      hideToast();
    });
    setTimeout(hideToast, 5000);
  };
  void handleSoftDelete;

  const handleRestore = (id: string) => {
    restoreLead(id);
    showToast('Lead restaurado');
    setTimeout(hideToast, 3000);
  };

  const handlePermaDelete = (id: string) => {
    permanentlyDeleteLead(id);
    setConfirmPermaId(null);
    showToast('Lead deletado permanentemente');
    setTimeout(hideToast, 3000);
  };

  const totalLeads = activeLeads.length;
  const closedLeads = activeLeads.filter(l => l.stage === 'fechado').length;

  // Follow-up overdue count
  const today = startOfDay(new Date());
  const overdueCount = leads.filter(l => l.nextFollowUp && isBefore(parseISO(l.nextFollowUp), today)).length;

  const todayKey = format(today, 'yyyy-MM-dd');
  const overdueLeads = leads.filter(l => l.nextFollowUp && isBefore(parseISO(l.nextFollowUp), today)).slice(0, 5);
  const todayLeads = leads.filter(l => l.nextFollowUp === todayKey);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Compact sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Pipeline</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>CRM</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 5, padding: '2px 6px' }}>beta</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { label: 'Leads', value: totalLeads, color: '#64C4FF', rgb: '100,196,255' },
            { label: 'Captados', value: closedLeads, color: '#30d158', rgb: '48,209,88' },
            ...(overdueCount > 0 ? [{ label: 'Atrasados', value: overdueCount, color: '#ff453a', rgb: '255,69,58' }] : []),
          ] as { label: string; value: number; color: string; rgb: string }[]).map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
          <button
            onClick={() => setShowTrash(t => !t)}
            title={showTrash ? 'Voltar para o pipeline' : `Lixeira (${trashedLeads.length})`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: showTrash ? 'rgba(255,69,58,0.12)' : 'var(--s2)', border: `1px solid ${showTrash ? 'rgba(255,69,58,0.3)' : 'var(--b2)'}`, color: showTrash ? '#ff453a' : 'var(--t3)', cursor: 'pointer', transition: 'all .15s', fontSize: 11, fontWeight: 600 }}
          >
            <FiArchive size={12} /> Lixeira{trashedLeads.length > 0 ? ` (${trashedLeads.length})` : ''}
          </button>
          <button onClick={() => setCompact(c => !c)} title={compact ? 'Modo normal' : 'Modo compacto'} aria-label={compact ? 'Modo normal' : 'Modo compacto'}
            style={{ display: 'flex', alignItems: 'center', padding: '6px 9px', borderRadius: 8, background: compact ? 'rgba(53,107,255,0.12)' : 'var(--s2)', border: `1px solid ${compact ? 'rgba(53,107,255,0.3)' : 'var(--b2)'}`, color: compact ? '#356BFF' : 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}>
            {compact ? <FiMaximize2 size={12} /> : <FiMinimize2 size={12} />}
          </button>
          <button onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(53,107,255,0.35)' }}>
            <FiPlus size={13} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Trash view */}
      {showTrash ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {trashedLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t4)', fontSize: 14 }}>
              Lixeira vazia
              <div style={{ fontSize: 11, marginTop: 6 }}>Leads ficam aqui por 30 dias antes de serem removidos definitivamente.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>
                {trashedLeads.length} lead{trashedLeads.length !== 1 ? 's' : ''} na lixeira · removido{trashedLeads.length !== 1 ? 's' : ''} automaticamente após 30 dias
              </div>
              {trashedLeads.map(lead => {
                const stage = STAGES.find(s => s.id === lead.stage);
                const days = lead.deletedAt ? differenceInDays(new Date(), parseISO(lead.deletedAt)) : 0;
                const isConfirming = confirmPermaId === lead.id;
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--s1)', border: '1px solid var(--b2)',
                      borderLeft: `3px solid ${stage?.color ?? '#636366'}55`,
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        {stage && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: `${stage.color}18`, color: stage.color, fontWeight: 600 }}>
                            {stage.label}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                          deletado há {days === 0 ? 'menos de 1 dia' : `${days} dia${days !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>

                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <FiAlertTriangle size={11} style={{ color: '#ff453a' }} />
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>Excluir permanentemente?</span>
                        <button
                          onClick={() => handlePermaDelete(lead.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: '#ff453a', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >Excluir</button>
                        <button
                          onClick={() => setConfirmPermaId(null)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}
                        >Cancelar</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => handleRestore(lead.id)}
                          title="Restaurar lead"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .15s', display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#30d158'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                        ><FiRotateCcw size={13} /></button>
                        <button
                          onClick={() => setConfirmPermaId(lead.id)}
                          title="Excluir permanentemente"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .15s', display: 'flex' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                        ><FiTrash2 size={13} /></button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      /* Body: sidebar + kanban */
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
        )}
        {/* Sidebar */}
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
          {/* Card A — Funil por etapa */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Funil</div>
            {STAGES.map(stage => {
              const count = leads.filter(l => l.stage === stage.id).length;
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              return (
                <div key={stage.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} />
                      {stage.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? stage.color : 'var(--t4)' }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: stage.color, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card B — Temperaturas */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Temperatura</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(Object.keys(TEMP_CONFIG) as Array<keyof typeof TEMP_CONFIG>).map(t => {
                const cfg = TEMP_CONFIG[t];
                const count = leads.filter(l => l.temperature === t).length;
                return (
                  <div key={t} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: cfg.color, marginTop: 3, opacity: 0.9 }}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card C — Follow-ups atrasados */}
          {overdueLeads.length > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid rgba(255,69,58,0.25)', padding: '12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#ff453a' }}>⚠ Atrasados</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ff453a' }}>{overdueLeads.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {overdueLeads.map(l => {
                  const days = differenceInDays(today, parseISO(l.nextFollowUp!));
                  const stage = STAGES.find(s => s.id === l.stage)!;
                  return (
                    <button key={l.id} onClick={() => { setEditingLead(l); setShowLeadModal(true); if (isMobile) setSidebarOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 7, background: 'rgba(255,69,58,0.05)', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,58,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#ff453a', flexShrink: 0 }}>{days}d</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card D — Hoje */}
          {todayLeads.length > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid rgba(53,107,255,0.25)', padding: '12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#356BFF' }}>📅 Hoje</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#356BFF' }}>{todayLeads.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {todayLeads.map(l => {
                  const stage = STAGES.find(s => s.id === l.stage)!;
                  return (
                    <button key={l.id} onClick={() => { setEditingLead(l); setShowLeadModal(true); if (isMobile) setSidebarOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 7, background: 'rgba(53,107,255,0.05)', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.05)'; }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Kanban board */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '14px 18px 18px', position: 'relative' }}>
          {totalLeads === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, pointerEvents: 'none', zIndex: 5 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>🎯</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Comece a captar leads</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                Adicione possíveis clientes pra acompanhar todo o pipeline — do primeiro contato até o fechamento.
              </div>
              <button onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#356BFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', pointerEvents: 'auto', boxShadow: '0 4px 14px rgba(53,107,255,0.35)' }}>
                <FiPlus size={13} /> Novo Lead
              </button>
            </div>
          )}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 14, height: '100%', minWidth: `${STAGES.length * 280}px`, opacity: totalLeads === 0 ? 0.35 : 1, transition: 'opacity .2s' }}>
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.id);
                return (
                  <div key={stage.id} style={{
                    flex: '0 0 264px', display: 'flex', flexDirection: 'column', height: '100%',
                    background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {/* Top accent bar in stage color */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stage.color, boxShadow: `0 0 12px ${stage.color}66` }} />

                    {/* Column header */}
                    <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color, boxShadow: `0 0 6px ${stage.color}aa` }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t1)' }}>{stage.label}</span>
                        {stageLeads.length > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: `${stage.color}18`, borderRadius: 99, padding: '1px 7px' }}>{stageLeads.length}</span>
                        )}
                      </div>
                      <button
                        onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
                        title="Adicionar lead nesta etapa"
                        aria-label="Adicionar lead nesta etapa"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 3, borderRadius: 6, transition: 'color .15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = stage.color)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                      >
                        <FiPlus size={13} />
                      </button>
                    </div>

                    {/* Column body (droppable) */}
                    <DroppableColumn stageId={stage.id}>
                      <AnimatePresence>
                        {stageLeads.length === 0 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t4)', fontSize: 12 }}>
                            {stage.desc}
                          </motion.div>
                        )}
                        {stageLeads.map(lead => (
                          <DraggableLeadCard
                            key={lead.id}
                            lead={lead}
                            stageColor={stage.color}
                            compact={compact}
                            onEdit={() => { setEditingLead(lead); setShowLeadModal(true); }}
                            onDelete={() => deleteLead(lead.id)}
                            onMove={(s) => moveLead(lead.id, s)}
                            onConvert={() => setConvertLead_(lead)}
                            onUpdateLead={(updates) => updateLead(lead.id, updates)}
                            onAddInteraction={(i) => addLeadInteraction(lead.id, i)}
                            onDeleteInteraction={(iid) => deleteLeadInteraction(lead.id, iid)}
                          />
                        ))}
                      </AnimatePresence>
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeLead && (
                <div style={{
                  background: 'var(--s1)',
                  borderRadius: 12, padding: '12px 14px',
                  border: '1px solid var(--b2)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  opacity: 0.95,
                  fontSize: 13, fontWeight: 600, color: 'var(--t1)',
                }}>
                  {activeLead.name}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      )}

      {/* Lead modal */}
      <AnimatePresence>
        {showLeadModal && (
          <LeadModal
            lead={editingLead ?? undefined}
            companies={companies}
            onClose={() => { setShowLeadModal(false); setEditingLead(null); }}
            onSave={handleSaveLead}
          />
        )}
      </AnimatePresence>

      {/* Convert modal */}
      <AnimatePresence>
        {convertLead_ && (
          <ConvertModal
            lead={convertLead_}
            onClose={() => setConvertLead_(null)}
            onConvert={(name, color) => convertLead(convertLead_!.id, name, color)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
