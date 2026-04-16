import { useState, useRef, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, getISOWeek, getDay,
} from 'date-fns';
import { playDrop } from '../../lib/sounds';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';
import { TaskChip } from '../TaskChip';
import type { Task, Priority } from '../../types';

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
  const { currentDate, tasks, selectedCompanies, hideDone, filterPriority, filterSubClient, filterTaskType, updateTask } = useTaskStore();
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

  const currentWeek = getISOWeek(currentDate);

  const getTasksForDay = (day: Date) =>
    sortByPriority(
      tasks.filter(t =>
        t.date === format(day, 'yyyy-MM-dd') &&
        selectedCompanies.includes(t.companyId) &&
        !t.archived &&
        !t.inbox &&
        (!hideDone || t.status !== 'done') &&
        (!filterPriority || t.priority === filterPriority) &&
        (!filterSubClient || t.subClientId === filterSubClient) &&
        (!filterTaskType || t.taskType === filterTaskType)
      )
    );

  const maxDayCount = Math.max(1, ...days.map(d => getTasksForDay(d).length));

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = dragTaskId.current ?? e.dataTransfer.getData('taskId');
    if (id) { updateTask(id, { date: dateStr }); playDrop(); }
    setDragOver(null);
    dragTaskId.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
        {DAY_HEADERS.map((h, i) => {
          const isWeekend = WEEKEND_IDX.includes(i);
          return (
            <div key={h} style={{
              padding: '10px 0', textAlign: 'center',
              fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
              color: isWeekend ? 'rgba(100,196,255,0.5)' : 'var(--t4)',
              borderRight: '1px solid var(--b1)',
              background: isWeekend ? 'rgba(100,196,255,0.03)' : 'transparent',
            }}>
              {h}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'grid', overflow: 'hidden', gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => {
          const weekNum = getISOWeek(week[0]);
          const isCurrentWeek = weekNum === currentWeek;

          return (
            <div key={wi} style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--b1)',
              borderLeft: isCurrentWeek ? '2px solid rgba(53,107,255,0.25)' : '2px solid transparent',
            }}>
              {week.map((day, di) => {
                const inMonth  = isSameMonth(day, currentDate);
                const todayDay = isToday(day);
                const dateStr  = format(day, 'yyyy-MM-dd');
                const dayTasks = getTasksForDay(day);
                const visible  = dayTasks.slice(0, MAX_VISIBLE);
                const hidden   = dayTasks.length - MAX_VISIBLE;
                const doneCnt  = dayTasks.filter(t => t.status === 'done').length;
                const holiday  = HOLIDAYS[dateStr];
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const isDragOver = dragOver === dateStr;

                const heatIntensity = dayTasks.length > 0 ? (dayTasks.length / maxDayCount) * 0.06 : 0;

                return (
                  <div
                    key={di}
                    style={{
                      position: 'relative', display: 'flex', flexDirection: 'column',
                      padding: '8px 6px 6px',
                      borderRight: '1px solid var(--b1)',
                      background: isDragOver
                        ? 'rgba(53,107,255,0.12)'
                        : todayDay
                        ? 'rgba(53,107,255,0.05)'
                        : isWeekend
                        ? 'rgba(100,196,255,0.025)'
                        : heatIntensity > 0
                        ? `rgba(53,107,255,${heatIntensity})`
                        : 'transparent',
                      cursor: 'pointer', minHeight: 0, overflow: 'hidden',
                      transition: 'background .15s',
                      outline: isDragOver ? '1.5px solid rgba(53,107,255,0.4)' : 'none',
                    }}
                    onClick={() => onDayClick(dateStr)}
                    onMouseEnter={e => { if (!todayDay && !isDragOver) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => {
                      if (!todayDay && !isDragOver) {
                        (e.currentTarget as HTMLElement).style.background = isWeekend
                          ? 'rgba(100,196,255,0.025)'
                          : heatIntensity > 0 ? `rgba(53,107,255,${heatIntensity})` : 'transparent';
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
                            background: todayDay ? '#356BFF' : 'transparent',
                            color: todayDay ? '#fff' : inMonth ? (isWeekend ? 'rgba(100,196,255,0.6)' : 'var(--t1)') : 'var(--t4)',
                            boxShadow: todayDay ? '0 2px 8px rgba(53,107,255,0.5)' : 'none',
                          }}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayTasks.length > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: todayDay ? '#356BFF' : 'var(--t4)' }}>
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
                          background: 'var(--modal-bg)', border: '1px solid var(--b3)',
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
