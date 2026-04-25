import { useState } from 'react';
import { FiPlus, FiCheck, FiArchive, FiTrash2, FiX } from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHabitsStore, isHabitDueToday, isHabitDoneOn, todayStr, FREQUENCY_LABEL, WEEKDAYS_SHORT } from '../store/habits';
import { useTaskStore } from '../store/tasks';
import type { HabitFrequency } from '../types';

const DAYS = 7;

export function HabitosPage() {
  const { habits, toggleCompletion, archiveHabit, deleteHabit } = useHabitsStore();
  const { accentColor } = useTaskStore();
  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = subDays(today, DAYS - 1 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const active = habits.filter(h => !h.archived);
  const archived = habits.filter(h => h.archived);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Hábitos operacionais</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Rotinas e cadências da agência</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Novo hábito
        </button>
      </div>

      {active.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 36 }}>📋</span>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>Nenhum hábito ativo. Crie um para começar!</p>
          <button onClick={() => setShowNew(true)} style={{ padding: '8px 16px', borderRadius: 10, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Criar hábito
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--b1)' }}>
          {/* Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 44px)', padding: '10px 16px', borderBottom: '1px solid var(--b1)', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>Hábito</span>
            {days.map(d => {
              const isToday = d === todayStr();
              return (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: isToday ? accentColor : 'var(--t4)', fontWeight: isToday ? 700 : 500 }}>
                  <div>{format(new Date(d + 'T12:00'), 'EEE', { locale: ptBR }).slice(0, 3)}</div>
                  <div>{format(new Date(d + 'T12:00'), 'd')}</div>
                </div>
              );
            })}
          </div>

          {active.map((habit, i) => (
            <div
              key={habit.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr repeat(7, 44px)',
                padding: '8px 16px', gap: 4, alignItems: 'center',
                borderBottom: i < active.length - 1 ? '1px solid var(--b1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>{FREQUENCY_LABEL[habit.frequency]}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, flexShrink: 0, opacity: 0 }} className="habit-actions">
                  <button onClick={() => archiveHabit(habit.id)} title="Arquivar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 4 }}><FiArchive size={11} /></button>
                  <button onClick={() => { if (confirm('Excluir hábito?')) deleteHabit(habit.id); }} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 4 }}><FiTrash2 size={11} /></button>
                </div>
              </div>
              {days.map(d => {
                const done = isHabitDoneOn(habit, d);
                const due = isHabitDueToday(habit, new Date(d + 'T12:00'));
                return (
                  <button
                    key={d}
                    onClick={() => toggleCompletion(habit.id, d)}
                    title={done ? 'Desmarcar' : 'Marcar como feito'}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      cursor: 'pointer', margin: '0 auto', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: done ? `${accentColor}22` : due ? 'var(--s2)' : 'transparent',
                      color: done ? accentColor : 'var(--t4)',
                      transition: 'all .15s',
                    }}
                  >
                    {done ? <FiCheck size={13} strokeWidth={2.5} /> : due ? <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--b3)' }} /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t4)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {showArchived ? '▼' : '▶'} Arquivados ({archived.length})
          </button>
          {showArchived && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {archived.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b1)', opacity: 0.6 }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t3)' }}>{h.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--t4)' }}>{FREQUENCY_LABEL[h.frequency]}</span>
                  <button onClick={() => archiveHabit(h.id, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: accentColor, fontWeight: 600 }}>Restaurar</button>
                  <button onClick={() => { if (confirm('Excluir permanentemente?')) deleteHabit(h.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiTrash2 size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNew && <NewHabitModal accentColor={accentColor} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewHabitModal({ accentColor, onClose }: { accentColor: string; onClose: () => void }) {
  const { addHabit } = useHabitsStore();
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthlyDay, setMonthlyDay] = useState(1);

  const save = () => {
    if (!title.trim()) return;
    addHabit({
      title: title.trim(),
      frequency,
      weekdays: frequency === 'weekly' ? weekdays : undefined,
      monthlyDay: frequency === 'monthly' ? monthlyDay : undefined,
    });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>Novo hábito</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={title} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder="Ex: Revisar métricas dos clientes"
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: 6 }}>
            {(['daily', 'weekly', 'monthly'] as HabitFrequency[]).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `1px solid ${frequency === f ? accentColor : 'var(--b2)'}`,
                  background: frequency === f ? `${accentColor}18` : 'transparent',
                  color: frequency === f ? accentColor : 'var(--t3)',
                }}
              >
                {FREQUENCY_LABEL[f]}
              </button>
            ))}
          </div>

          {frequency === 'weekly' && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {WEEKDAYS_SHORT.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setWeekdays(w => w.includes(i) ? w.filter(x => x !== i) : [...w, i])}
                  style={{
                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    border: `1px solid ${weekdays.includes(i) ? accentColor : 'var(--b2)'}`,
                    background: weekdays.includes(i) ? `${accentColor}18` : 'transparent',
                    color: weekdays.includes(i) ? accentColor : 'var(--t4)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {frequency === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>Dia do mês:</span>
              <input
                type="number" min={1} max={31} value={monthlyDay}
                onChange={e => setMonthlyDay(Number(e.target.value))}
                style={{ width: 64, padding: '6px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
              />
            </div>
          )}

          <button
            onClick={save}
            style={{ padding: '10px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, marginTop: 4 }}
          >
            Criar hábito
          </button>
        </div>
      </div>
    </div>
  );
}
