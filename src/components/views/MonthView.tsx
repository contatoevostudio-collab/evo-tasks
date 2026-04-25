import { useState, useRef, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, getDay,
} from 'date-fns';
import { playDrop } from '../../lib/sounds';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';
import { TaskChip } from '../TaskChip';
import type { Task, Priority, TaskCategory } from '../../types';

// Module-level default; component shadows accentColor with store value
const accentColor = '#356BFF';

const CAT_COLOR: Record<string, string> = {
  agencia: accentColor, trabalho: '#ff9f0a', evento: '#bf5af2', pessoal: '#30d158', feriado: '#ff453a',
};

interface Props {
  onTaskClick: (task: Task) => void;
  onDayClick: (date: string) => void;
}

const MAX_VISIBLE = 3;
const DAY_HEADERS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const WEEKEND_IDX = [5, 6]; // SAB, DOM (0-based in week)

// Feriados nacionais brasileiros 2025–2026
const HOLIDAYS: Record<string, string> = {
  '2025-01-01': 'Ano Novo',
  '2025-04-18': 'Sexta-feira Santa',
  '2025-04-20': 'Páscoa',
  '2025-04-21': 'Tiradentes',
  '2025-05-01': 'Dia do Trabalho',
  '2025-06-19': 'Corpus Christi',
  '2025-09-07': 'Independência',
  '2025-10-12': 'N. Sra. Aparecida',
  '2025-11-02': 'Finados',
  '2025-11-15': 'Proclamação da República',
  '2025-11-20': 'Consciência Negra',
  '2025-12-25': 'Natal',
  '2026-01-01': 'Ano Novo',
  '2026-04-03': 'Sexta-feira Santa',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência',
  '2026-10-12': 'N. Sra. Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal',
};

const PRIORITY_ORDER: Record<Priority | 'none', number> = { alta: 0, media: 1, baixa: 2, none: 3 };
function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none']
  );
}

export function MonthView({ onTaskClick, onDayClick }: Props) {
  const store = useTaskStore();
  const { currentDate, tasks, selectedCompanies, hideDone, filterPriority, filterSubClient, filterTaskType, filterTaskCategory, setFilterTaskCategory, updateTask, calendarEvents, calendarCategoryFilter } = store;
  const accentColor = store.accentColor;
  const accentRgb = (() => { const v = accentColor.replace('#', ''); const c = v.length === 3 ? v.split('').map(x => x+x).join('') : v; return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; })();
  const [overflow, setOverflow] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragTaskId = useRef<string | null>(null);

  // Close overflow popup on outside click
  useEffect(() => {
    if (!overflow) return;
    const handler = () => setOverflow(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [overflow]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));


  const showTasks = calendarCategoryFilter === 'todos' || calendarCategoryFilter === 'agencia';

  const getTasksForDay = (day: Date) => {
    if (!showTasks) return [];
    return sortByPriority(
      tasks.filter(t =>
        !t.deletedAt &&
        t.date === format(day, 'yyyy-MM-dd') &&
        selectedCompanies.includes(t.companyId) &&
        !t.archived &&
        !t.inbox &&
        (!hideDone || t.status !== 'done') &&
        (!filterPriority || t.priority === filterPriority) &&
        (!filterSubClient || t.subClientId === filterSubClient) &&
        (!filterTaskType || t.taskType === filterTaskType) &&
        (!filterTaskCategory || (t.taskCategory ?? 'criacao') === filterTaskCategory)
      )
    );
  };

  const getCalendarEventsForDay = (day: Date) => {
    if (calendarCategoryFilter === 'agencia') return [];
    const dateStr = format(day, 'yyyy-MM-dd');
    return calendarEvents.filter(e =>
      e.date === dateStr &&
      (calendarCategoryFilter === 'todos' || e.category === calendarCategoryFilter)
    );
  };

  const maxDayCount = Math.max(1, ...days.map(d => getTasksForDay(d).length));

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = dragTaskId.current ?? e.dataTransfer.getData('taskId');
    if (id) { updateTask(id, { date: dateStr }); playDrop(); }
    setDragOver(null);
    dragTaskId.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingBottom: 8 }}>
      {/* Category filter */}
      {(() => {
        const TASK_CATEGORIES: { id: TaskCategory; label: string; color: string }[] = [
          { id: 'criacao', label: 'Criação', color: accentColor },
          { id: 'reuniao', label: 'Reunião', color: '#ff9f0a' },
          { id: 'pessoal', label: 'Pessoal', color: '#30d158' },
          { id: 'eventos', label: 'Eventos', color: '#bf5af2' },
        ];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 4px', flexShrink: 0 }}>
            {/* Todos */}
            {(() => {
              const active = filterTaskCategory === null;
              return (
                <button onClick={() => setFilterTaskCategory(null)}
                  style={{ padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: active ? 'rgba(100,196,255,0.15)' : 'transparent', color: active ? '#64C4FF' : 'var(--t4)' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                >
                  Todos
                </button>
              );
            })()}
            {TASK_CATEGORIES.map(cat => {
              const active = filterTaskCategory === cat.id;
              return (
                <button key={cat.id} onClick={() => setFilterTaskCategory(cat.id)}
                  style={{ padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: active ? `${cat.color}22` : 'transparent', color: active ? cat.color : 'var(--t4)' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = cat.color; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        );
      })()}
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0, borderBottom: '1px solid var(--b1)' }}>
        {DAY_HEADERS.map((h, i) => {
          const isWeekend = WEEKEND_IDX.includes(i);
          return (
            <div key={h} style={{
              padding: '12px 12px 10px', textAlign: 'left',
              fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
              color: isWeekend ? 'rgba(100,196,255,0.5)' : 'var(--t4)',
              borderRight: i < 6 ? '1px solid var(--b1)' : 'none',
            }}>
              {h}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'grid', overflow: 'hidden', gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => {

          return (
            <div key={wi} style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            }}>
              {week.map((day, di) => {
                const inMonth  = isSameMonth(day, currentDate);
                const todayDay = isToday(day);
                const dateStr  = format(day, 'yyyy-MM-dd');
                const dayTasks = getTasksForDay(day);
                const dayCalEvts = getCalendarEventsForDay(day);
                const showHoliday = calendarCategoryFilter === 'todos' || calendarCategoryFilter === 'feriado';
                const visible  = dayTasks.slice(0, MAX_VISIBLE);
                const hidden   = dayTasks.length - MAX_VISIBLE;
                const doneCnt  = dayTasks.filter(t => t.status === 'done').length;
                const holiday  = showHoliday ? HOLIDAYS[dateStr] : undefined;
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const isDragOver = dragOver === dateStr;

                const heatIntensity = dayTasks.length > 0 ? (dayTasks.length / maxDayCount) * 0.06 : 0;

                return (
                  <div
                    key={di}
                    style={{
                      position: 'relative', display: 'flex', flexDirection: 'column',
                      padding: '8px 6px 6px',
                      background: isDragOver
                        ? `rgba(${accentRgb}, 0.1)`
                        : todayDay
                        ? `rgba(${accentRgb}, 0.04)`
                        : isWeekend
                        ? 'rgba(100,196,255,0.018)'
                        : heatIntensity > 0
                        ? `rgba(${accentRgb}, ${heatIntensity})`
                        : 'transparent',
                      borderRight: di < 6 ? '1px solid var(--b1)' : 'none',
                      borderBottom: '1px solid var(--b1)',
                      cursor: 'pointer', minHeight: 0, overflow: 'hidden',
                      transition: 'background .15s',
                      outline: isDragOver ? '1.5px solid rgba(${accentRgb}, 0.3)' : 'none',
                    }}
                    onClick={() => onDayClick(dateStr)}
                    onMouseEnter={e => { if (!todayDay && !isDragOver) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => {
                      if (!todayDay && !isDragOver) {
                        (e.currentTarget as HTMLElement).style.background = isWeekend
                          ? 'rgba(100,196,255,0.025)'
                          : heatIntensity > 0 ? `rgba(${accentRgb}, ${heatIntensity})` : 'transparent';
                      }
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, dateStr)}
                  >
                    {/* Day number */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          title={dayTasks.length > 0 ? `${doneCnt}/${dayTasks.length} concluídas` : undefined}
                          style={{
                            fontSize: 12, fontWeight: todayDay ? 700 : 400,
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            background: todayDay ? accentColor : 'transparent',
                            color: todayDay ? '#fff' : inMonth ? (isWeekend ? 'rgba(100,196,255,0.5)' : 'var(--t1)') : 'var(--t4)',
                            boxShadow: todayDay ? '0 2px 8px rgba(${accentRgb}, 0.4)' : 'none',
                          }}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayTasks.length > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: todayDay ? accentColor : 'var(--t4)' }}>
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); onDayClick(dateStr); }}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--t4)', padding: 2, borderRadius: 4,
                          opacity: 0, transition: 'opacity .15s',
                        }}
                        className="day-add-btn"
                      >
                        <FiPlus size={11} />
                      </button>
                    </div>

                    {/* Holiday marker */}
                    {holiday && (
                      <div style={{ fontSize: 8, color: '#ff9f0a', fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={holiday}>
                        🎉 {holiday}
                      </div>
                    )}

                    {/* Calendar events */}
                    {dayCalEvts.map(ev => (
                      <div
                        key={ev.id}
                        style={{
                          fontSize: 9, fontWeight: 600,
                          color: CAT_COLOR[ev.category] ?? accentColor,
                          background: `${CAT_COLOR[ev.category] ?? accentColor}18`,
                          borderLeft: `2px solid ${CAT_COLOR[ev.category] ?? accentColor}`,
                          borderRadius: '0 4px 4px 0',
                          padding: '2px 6px', marginBottom: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={ev.title}
                        onClick={e => e.stopPropagation()}
                      >
                        {ev.title}
                      </div>
                    ))}

                    {/* Tasks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'hidden' }}>
                      {visible.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e: React.DragEvent) => {
                            dragTaskId.current = task.id;
                            e.dataTransfer.setData('taskId', task.id);
                            e.stopPropagation();
                          }}
                          style={{ cursor: 'grab' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <TaskChip task={task} onClick={onTaskClick} compact />
                        </div>
                      ))}
                      {hidden > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setOverflow(overflow === dateStr ? null : dateStr); }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--t3)', textAlign: 'left', padding: '1px 4px', transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t3)')}
                        >
                          + {hidden} mais
                        </button>
                      )}
                    </div>

                    {/* Overflow popup */}
                    {overflow === dateStr && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        style={{
                          position: 'absolute', top: 36, left: 0, zIndex: 30,
                          minWidth: 220, maxWidth: 280, padding: 12, borderRadius: 14,
                          background: 'var(--modal-bg)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 8, textTransform: 'capitalize' }}>
                          {format(day, "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {dayTasks.map(task => (
                            <TaskChip key={task.id} task={task} onClick={t => { onTaskClick(t); setOverflow(null); }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        .day-add-btn { opacity: 0 !important; }
        div:hover > div > .day-add-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
