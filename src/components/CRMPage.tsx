import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiX, FiEdit2, FiTrash2, FiPhone, FiMail, FiInstagram,
  FiDollarSign, FiArrowRight, FiCheck, FiUser,
} from 'react-icons/fi';
import { parseISO, differenceInDays } from 'date-fns';
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
import type { Lead, LeadStage } from '../types';
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
  lead, stageColor, onEdit, onDelete, onMove, onConvert, dragHandleListeners, dragHandleAttributes,
}: {
  lead: Lead; stageColor: string;
  onEdit: () => void; onDelete: () => void;
  onMove: (stage: LeadStage) => void; onConvert: () => void;
  dragHandleListeners?: SyntheticListenerMap;
  dragHandleAttributes?: DraggableAttributes;
}) {
  const [showActions, setShowActions] = useState(false);
  const days = differenceInDays(new Date(), parseISO(lead.createdAt));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
        borderLeft: `3px solid ${stageColor}`,
        cursor: 'pointer',
      }}
      onClick={() => setShowActions(s => !s)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        {/* Drag handle */}
        <div
          {...dragHandleListeners}
          {...dragHandleAttributes}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'grab', color: 'var(--t4)', flexShrink: 0, marginTop: 2, padding: '0 2px', lineHeight: 1 }}
        >
          ⠿
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.name}
          </div>
          {lead.contact && (
            <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <FiUser size={9} /> {lead.contact}
            </div>
          )}
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500 }}>
            {days === 0 ? 'hoje' : `${days}d`}
          </span>
          {lead.convertedToCompanyId && (
            <span style={{ fontSize: 9, color: '#30d158', fontWeight: 700, background: 'rgba(48,209,88,0.1)', borderRadius: 4, padding: '1px 5px' }}>
              cliente
            </span>
          )}
        </div>
      </div>

      {lead.notes && (
        <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8, lineHeight: 1.5, borderTop: '1px solid var(--b1)', paddingTop: 8 }}>
          {lead.notes}
        </p>
      )}

      {/* Actions */}
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
              {/* Move to next stage */}
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
              <button onClick={e => { e.stopPropagation(); onDelete(); }}
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
  lead, onClose, onSave,
}: {
  lead?: Lead; onClose: () => void; onSave: (data: Omit<Lead, 'id' | 'createdAt'>) => void;
}) {
  const [name,      setName]      = useState(lead?.name ?? '');
  const [contact,   setContact]   = useState(lead?.contact ?? '');
  const [phone,     setPhone]     = useState(lead?.phone ?? '');
  const [email,     setEmail]     = useState(lead?.email ?? '');
  const [instagram, setInstagram] = useState(lead?.instagram ?? '');
  const [budget,    setBudget]    = useState(lead?.budget ?? '');
  const [notes,     setNotes]     = useState(lead?.notes ?? '');
  const [stage,     setStage]     = useState<LeadStage>(lead?.stage ?? 'prospeccao');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), contact: contact.trim() || undefined, phone: phone.trim() || undefined, email: email.trim() || undefined, instagram: instagram.trim() || undefined, budget: budget.trim() || undefined, notes: notes.trim() || undefined, stage, convertedToCompanyId: lead?.convertedToCompanyId });
  };

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
          style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, margin: '0 16px', background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 16, overflow: 'hidden' }}
        >
          <div style={{ height: 3, background: '#356BFF' }} />
          <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{lead ? 'Editar Lead' : 'Novo Lead'}</span>
              <button onClick={onClose} style={{ background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 7, borderRadius: 8, display: 'flex' }}><FiX size={14} /></button>
            </div>

            {/* Stage */}
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 8 }}>Etapa</span>
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
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Nome do lead *</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Clínica X, Loja Y..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
            </div>

            {/* Contact + Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Contato</label>
                <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Nome do responsável"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Orçamento</label>
                <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="ex: R$ 1.500/mês"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            {/* Phone + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>WhatsApp</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Instagram</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@perfil"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Contexto, próximos passos, observações..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
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
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 6 }}>Nome da empresa</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value.toUpperCase())}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 8 }}>Cor</label>
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
        flex: 1, overflowY: 'auto', borderRadius: 12, padding: '10px 10px',
        background: isOver ? 'color-mix(in srgb, var(--s1) 80%, #356BFF 20%)' : 'var(--s1)',
        border: isOver ? '1px solid rgba(53,107,255,0.4)' : '1px solid var(--b1)',
        transition: 'background .15s, border-color .15s',
      }}
    >
      {children}
    </div>
  );
}

// ─── Main CRMPage ──────────────────────────────────────────────────────────────
export function CRMPage() {
  const { leads, addLead, updateLead, deleteLead, moveLead, convertLead } = useTaskStore();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead,   setEditingLead]   = useState<Lead | null>(null);
  const [convertLead_,  setConvertLead_]  = useState<Lead | null>(null);
  const [activeLead,    setActiveLead]    = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const lead = leads.find(l => l.id === e.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveLead(null);
    const { over, active } = e;
    if (!over) return;
    const targetStage = over.id as LeadStage;
    const lead = leads.find(l => l.id === active.id);
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

  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.stage === 'fechado').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 32px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.5px', margin: 0 }}>CRM</h1>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 5, padding: '2px 7px' }}>
                beta
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>
              {totalLeads} lead{totalLeads !== 1 ? 's' : ''} · {closedLeads} captado{closedLeads !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #356BFF, #4F8AFF)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(53,107,255,0.35)' }}
          >
            <FiPlus size={14} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '0 24px 24px' }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', gap: 14, height: '100%', minWidth: `${STAGES.length * 240}px` }}>
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id);
              return (
                <div key={stage.id} style={{ flex: '0 0 230px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{stage.label}</span>
                      {stageLeads.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: stage.color, background: `${stage.color}18`, borderRadius: 99, padding: '1px 6px' }}>
                          {stageLeads.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
                      title="Adicionar lead nesta etapa"
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
                          onEdit={() => { setEditingLead(lead); setShowLeadModal(true); }}
                          onDelete={() => deleteLead(lead.id)}
                          onMove={(s) => moveLead(lead.id, s)}
                          onConvert={() => setConvertLead_(lead)}
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
            {activeLead && (() => {
              const stage = STAGES.find(s => s.id === activeLead.stage)!;
              return (
                <div style={{
                  background: 'var(--s1)', border: '1px solid var(--b1)',
                  borderRadius: 12, padding: '12px 14px',
                  borderLeft: `3px solid ${stage.color}`,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  opacity: 0.95,
                  fontSize: 13, fontWeight: 600, color: 'var(--t1)',
                }}>
                  {activeLead.name}
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead modal */}
      <AnimatePresence>
        {showLeadModal && (
          <LeadModal
            lead={editingLead ?? undefined}
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
