import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiTrash2, FiCalendar } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import type { CalendarEvent, CalendarEventCategory } from '../types';

interface Props {
  event?: CalendarEvent;
  defaultDate?: string;
  defaultCategory?: CalendarEventCategory;
  onClose: () => void;
}

const CATEGORIES: { id: CalendarEventCategory; label: string; color: string }[] = [
  { id: 'agencia',  label: 'Agência',  color: '#356BFF' },
  { id: 'trabalho', label: 'Trabalho', color: '#ff9f0a' },
  { id: 'evento',   label: 'Evento',   color: '#bf5af2' },
  { id: 'pessoal',  label: 'Pessoal',  color: '#30d158' },
  { id: 'feriado',  label: 'Feriado',  color: '#ff453a' },
];

export function CalendarEventModal({ event, defaultDate, defaultCategory, onClose }: Props) {
  const { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useTaskStore();
  const isEdit = !!event;

  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle]       = useState(event?.title ?? '');
  const [date, setDate]         = useState(event?.date ?? defaultDate ?? today);
  const [time, setTime]         = useState(event?.time ?? '');
  const [category, setCategory] = useState<CalendarEventCategory>(event?.category ?? defaultCategory ?? 'evento');
  const [notes, setNotes]       = useState(event?.notes ?? '');
  const [confirmDel, setConfirmDel] = useState(false);

  const catMeta = CATEGORIES.find(c => c.id === category)!;

  const handleSave = () => {
    if (!title.trim() || !date) return;
    const payload = { title: title.trim(), date, time: time || undefined, category, notes: notes || undefined };
    if (isEdit) {
      updateCalendarEvent(event.id, payload);
    } else {
      addCalendarEvent(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    deleteCalendarEvent(event!.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        style={{
          width: 460, background: 'var(--modal-bg)',
          borderRadius: 20, padding: 28,
          border: `1px solid ${catMeta.color}30`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px ${catMeta.color}22`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${catMeta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCalendar size={15} style={{ color: catMeta.color }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>
              {isEdit ? 'Editar Evento' : 'Novo Evento'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: 4 }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
            Título
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
            placeholder="Nome do evento..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'var(--ib)', border: '1px solid var(--b2)',
              color: 'var(--t1)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>
            Categoria
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    background: active ? `${cat.color}22` : 'var(--s1)',
                    color: active ? cat.color : 'var(--t2)',
                    outline: active ? `1.5px solid ${cat.color}50` : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date + Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                background: 'var(--ib)', border: '1px solid var(--b2)',
                color: 'var(--t1)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
              Horário (opcional)
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                background: 'var(--ib)', border: '1px solid var(--b2)',
                color: 'var(--t1)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observações..."
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 10,
              background: 'var(--ib)', border: '1px solid var(--b2)',
              color: 'var(--t1)', fontSize: 13, outline: 'none', resize: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEdit ? (
            <button
              onClick={handleDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: confirmDel ? 'rgba(255,69,58,0.15)' : 'transparent',
                color: confirmDel ? '#ff453a' : 'var(--t3)',
                fontSize: 12, cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <FiTrash2 size={13} />
              {confirmDel ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: 'var(--s1)', color: 'var(--t2)',
                fontSize: 13, cursor: 'pointer', transition: 'all .15s',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: title.trim() ? catMeta.color : 'var(--s1)',
                color: title.trim() ? '#fff' : 'var(--t4)',
                fontSize: 13, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default',
                transition: 'all .15s',
                boxShadow: title.trim() ? `0 4px 14px ${catMeta.color}50` : 'none',
              }}
            >
              {isEdit ? 'Salvar' : 'Criar Evento'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
