import { useRef, useState, useCallback } from 'react';
import { format, startOfWeek, addDays, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiCopy } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';
import { playStatusChange, playAdd } from '../../lib/sounds';
import { getTaskTitle } from '../../types';
import type { Task, Priority, CalendarEvent, TaskCategory } from '../../types';

/** Deterministic color from a tag string (hue derived from char codes) */
function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 58%)`;
}

const HOLIDAYS: Record<string, string> = {
  '2025-01-01': 'Ano Novo', '2025-04-18': 'Sexta-feira Santa', '2025-04-20': 'Páscoa',
  '2025-04-21': 'Tiradentes', '2025-05-01': 'Dia do Trabalho', '2025-06-19': 'Corpus Christi',
  '2025-09-07': 'Independência', '2025-10-12': 'N. Sra. Aparecida', '2025-11-02': 'Finados',
  '2025-11-15': 'Proclamação da República', '2025-11-20': 'Consciência Negra', '2025-12-25': 'Natal',
  '2026-01-01': 'Ano Novo', '2026-04-03': 'Sexta-feira Santa', '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalho', '2026-06-04': 'Corpus Christi', '2026-09-07': 'Independência',
  '2026-10-12': 'N. Sra. Aparecida', '2026-11-02': 'Finados', '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra', '2026-12-25': 'Natal',
};

// Module-level default; component shadows accentColor with store value
const accentColor = '#356BFF';

const CAT_COLOR: Record<string, string> = {
  agencia: accentColor, trabalho: '#ff9f0a', evento: '#bf5af2', pessoal: '#30d158', feriado: '#ff453a',
};

interface Props {
  onTaskClick: (task: Task) => void;
  onDayClick: (date: string) => void;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  alta: '#ff453a', media: '#ff9f0a', baixa: '#64C4FF',
};
const PRIORITY_ORDER: Record<Priority | 'none', number> = {
  alta: 0, media: 1, baixa: 2, none: 3,
};

const STATUS_NEXT: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' };
const STATUS_COLOR: Record<string, string> = { todo: 'var(--t4)', doing: accentColor, done: '#30d158' };
const STATUS_ICON: Record<string, string> = { todo: '○', doing: '◐', done: '✓' };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none'];
  });
}

export function WeekView({ onTaskClick, onDayClick }: Props) {
  const store = useTaskStore();
  const {
    currentDate, tasks, selectedCompanies, companies, subClients,
    cycleTaskStatus, hideDone, filterPriority, filterSubClient, filterTaskType,
    filterTaskCategory, setFilterTaskCategory,
    filterTags, toggleFilterTag,
    updateTask, duplicateTask, calendarEvents, calendarCategoryFilter,
  } = store;
  const accentColor = store.accentColor;
  const accentRgb = (() => { const v = accentColor.replace('#', ''); const c = v.length === 3 ? v.split('').map(x => x+x).join('') : v; return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; })();

  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragTaskId = useRef<string | null>(null);

  // Pop-done animation (#49)
  const [popDoneId, setPopDoneId] = useState<string | null>(null);
  const handleCycleTask = useCallback((task: Task) => {
    cycleTaskStatus(task.id);
    if (task.status === 'doing') {
      setPopDoneId(task.id);
      setTimeout(() => setPopDoneId(null), 500);
    }
  }, [cycleTaskStatus]);

  const showTasks = calendarCategoryFilter === 'todos' || calendarCategoryFilter === 'agencia';

  // Collect all unique tags visible this week (for filter UI)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const allWeekTags = Array.from(new Set(
    tasks
      .filter(t => days.some(d => format(d, 'yyyy-MM-dd') === t.date) && !t.archived && !t.inbox)
      .flatMap(t => t.tags ?? [])
  ));

  const getTasksForDay = (day: Date) => {
    if (!showTasks) return [];
    const dateStr = format(day, 'yyyy-MM-dd');
    return sortTasks(tasks.filter(t =>
      !t.deletedAt &&
      t.date === dateStr &&
      selectedCompanies.includes(t.companyId) &&
      !t.archived &&
      !t.inbox &&
      (!hideDone || t.status !== 'done') &&
      (!filterPriority || t.priority === filterPriority) &&
      (!filterSubClient || t.subClientId === filterSubClient) &&
      (!filterTaskType || t.taskType === filterTaskType) &&
      (!filterTaskCategory || (t.taskCategory ?? 'criacao') === filterTaskCategory) &&
      (filterTags.length === 0 || filterTags.some(tag => t.tags?.includes(tag)))
    ));
  };

  const getEventsForDay = (day: Date): { type: 'event'; event: CalendarEvent } | { type: 'holiday'; name: string } | null => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (calendarCategoryFilter === 'feriado' || calendarCategoryFilter === 'todos') {
      if (HOLIDAYS[dateStr]) return { type: 'holiday', name: HOLIDAYS[dateStr] };
    }
    return null;
  };

  const getCalendarEventsForDay = (day: Date): CalendarEvent[] => {
    if (calendarCategoryFilter === 'agencia' || calendarCategoryFilter === 'feriado') return [];
    const dateStr = format(day, 'yyyy-MM-dd');
    return calendarEvents.filter(e =>
      e.date === dateStr &&
      (calendarCategoryFilter === 'todos' || e.category === calendarCategoryFilter)
    );
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = dragTaskId.current ?? e.dataTransfer.getData('taskId');
    if (id) updateTask(id, { date: dateStr });
    setDragOver(null);
    dragTaskId.current = null;
  };

  const TASK_CATEGORIES: { id: TaskCategory; label: string; color: string }[] = [
    { id: 'criacao', label: 'Criação',  color: accentColor },
    { id: 'reuniao', label: 'Reunião',  color: '#ff9f0a' },
    { id: 'pessoal', label: 'Pessoal',  color: '#30d158' },
    { id: 'eventos', label: 'Eventos',  color: '#bf5af2' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Category filter */}
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
      {/* Tag filter row — only visible when there are tags this week */}
      {allWeekTags.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 12px 6px', flexShrink: 0, flexWrap: 'wrap' }}>
          {allWeekTags.map(tag => {
            const color = tagColor(tag);
            const active = filterTags.includes(tag);
            return (
              <button key={tag} onClick={() => toggleFilterTag(tag)}
                style={{
                  padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: active ? 700 : 400,
                  border: 'none', cursor: 'pointer', transition: 'all .15s',
                  background: active ? `${color}25` : 'transparent',
                  color: active ? color : 'var(--t4)',
                  outline: active ? `1px solid ${color}50` : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = color; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
              >
                #{tag}
              </button>
            );
          })}
          {filterTags.length > 0 && (
            <button onClick={() => filterTags.forEach(t => toggleFilterTag(t))}
              style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--t4)', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
            >
              ✕ limpar
            </button>
          )}
        </div>
      )}
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0 }}>
        {days.map((day, i) => {
          const todayDay = isToday(day);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;

          return (
            <div key={i} style={{ borderRight: i < 6 ? '1px solid var(--b1)' : 'none' }}>
              <div style={{ padding: '14px 12px 8px' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                  color: todayDay ? '#64C4FF' : isWeekend ? 'rgba(100,196,255,0.5)' : 'var(--t4)',
                  marginBottom: 4,
                }}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 300,
                  color: todayDay ? accentColor : isWeekend ? 'rgba(100,196,255,0.6)' : 'var(--t2)',
                  lineHeight: 1,
                }}>
                  {format(day, 'd')}
                </div>
                {todayDay && <div style={{ height: 2, background: accentColor, borderRadius: 1, marginTop: 6 }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {days.map((day, i) => {
          const dateStr  = format(day, 'yyyy-MM-dd');
          const todayDay = isToday(day);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;
          const dayTasks = getTasksForDay(day);
          const dayEventsInfo = getEventsForDay(day);
          const dayCalEvents = getCalendarEventsForDay(day);
          const isDragOver = dragOver === dateStr;

          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              style={{
                background: isDragOver
                  ? `rgba(${accentRgb}, 0.08)`
                  : todayDay ? 'rgba(255,159,10,0.03)'
                  : isWeekend ? 'rgba(100,196,255,0.018)'
                  : 'transparent',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer', minHeight: 0,
                borderRight: i < 6 ? '1px solid var(--b1)' : 'none',
                outline: isDragOver ? '1.5px solid rgba(${accentRgb}, 0.3)' : 'none',
                transition: 'background .15s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, dateStr)}
            >
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
                {/* Holiday banner */}
                {dayEventsInfo?.type === 'holiday' && (
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: '#ff453a',
                    background: 'rgba(255,69,58,0.12)', borderRadius: 6,
                    padding: '3px 8px', marginBottom: 4, textAlign: 'center',
                  }}>
                    🎉 {dayEventsInfo.name}
                  </div>
                )}
                {/* Calendar event chips */}
                {dayCalEvents.map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      color: CAT_COLOR[ev.category] ?? accentColor,
                      background: `${CAT_COLOR[ev.category] ?? accentColor}18`,
                      borderLeft: `2.5px solid ${CAT_COLOR[ev.category] ?? accentColor}`,
                      borderRadius: '0 6px 6px 0',
                      padding: '4px 8px', marginBottom: 4,
                      display: 'flex', alignItems: 'center', gap: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={ev.notes}
                  >
                    {ev.time && <span style={{ fontSize: 9, opacity: 0.7 }}>{ev.time}</span>}
                    {ev.title}
                  </div>
                ))}
                {dayTasks.length === 0 && dayCalEvents.length === 0 && !dayEventsInfo && (
                  <div style={{ textAlign: 'center', paddingTop: 16, color: 'var(--t4)', fontSize: 18 }}>○</div>
                )}
                {dayTasks.map((task) => {
                  const comp  = companies.find(c => c.id === task.companyId);
                  const sub   = subClients.find(s => s.id === task.subClientId);
                  const color = task.colorOverride ?? comp?.color ?? accentColor;
                  const done  = task.status === 'done';
                  const title = getTaskTitle(task, companies, subClients);
                  const today = format(new Date(), 'yyyy-MM-dd');
                  const isOverdue = task.date < today && task.status !== 'done';

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => {
                        dragTaskId.current = task.id;
                        e.dataTransfer.setData('taskId', task.id);
                        e.stopPropagation();
                      }}
                    >
                      <motion.div
                        layout
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                        className={['week-task-card', popDoneId === task.id ? 'pop-done' : ''].filter(Boolean).join(' ')}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 4,
                          padding: '8px 8px', borderRadius: 8, marginBottom: 4,
                          cursor: 'pointer', transition: 'background .12s', position: 'relative',
                          borderLeft: `2px solid ${isOverdue ? '#ff453a' : color}40`,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--s2)';
                          const btn = (e.currentTarget as HTMLElement).querySelector('.dup-btn') as HTMLElement | null;
                          if (btn) btn.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          const btn = (e.currentTarget as HTMLElement).querySelector('.dup-btn') as HTMLElement | null;
                          if (btn) btn.style.opacity = '0';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <motion.button
                            onClick={(e) => { e.stopPropagation(); handleCycleTask(task); playStatusChange(); }}
                            whileTap={{ scale: 1.5 }}
                            title={`Status: ${task.status} → ${STATUS_NEXT[task.status]}`}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: STATUS_COLOR[task.status],
                              padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center',
                              fontSize: 13, transition: 'color .15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          >
                            {STATUS_ICON[task.status]}
                          </motion.button>

                          <span style={{
                            flex: 1, fontSize: 12, fontWeight: 500, lineHeight: 1.3,
                            color: done ? 'var(--t4)' : 'var(--t1)',
                            textDecoration: done ? 'line-through' : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }} title={title}>
                            {title}
                          </span>

                          {/* #2 Duplicate button — shows on hover */}
                          <button
                            className="dup-btn"
                            onClick={e => { e.stopPropagation(); duplicateTask(task.id); playAdd(); }}
                            title="Duplicar tarefa"
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'var(--t3)', padding: 2, flexShrink: 0,
                              display: 'flex', alignItems: 'center',
                              opacity: 0, transition: 'opacity .15s, color .15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                          >
                            <FiCopy size={10} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 2, flexWrap: 'wrap' }}>
                          {task.priority && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority],
                              flexShrink: 0, textTransform: 'uppercase',
                            }}>
                              {task.priority === 'media' ? 'MED' : task.priority === 'alta' ? 'ALT' : 'BAI'}
                            </span>
                          )}
                          {/* #5 Tag chips */}
                          {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map(tag => {
                            const tc = tagColor(tag);
                            const activeTag = filterTags.includes(tag);
                            return (
                              <span
                                key={tag}
                                onClick={e => { e.stopPropagation(); toggleFilterTag(tag); }}
                                style={{
                                  fontSize: 9, padding: '1px 5px', borderRadius: 4,
                                  background: activeTag ? `${tc}30` : `${tc}14`,
                                  color: tc, cursor: 'pointer', flexShrink: 0,
                                  outline: activeTag ? `1px solid ${tc}50` : 'none',
                                  transition: 'all .12s',
                                }}
                                title={`Filtrar por #${tag}`}
                              >
                                #{tag}
                              </span>
                            );
                          })}
                          {task.tags && task.tags.length > 2 && (
                            <span style={{ fontSize: 9, color: 'var(--t4)' }}>+{task.tags.length - 2}</span>
                          )}
                          {/* Tips do subclient */}
                          {sub?.tips && sub.tips.length > 0 && (
                            <span title={sub.tips.join(' · ')} style={{ fontSize: 9, color: '#ff9f0a', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              ★ {sub.tips[0]}{sub.tips.length > 1 ? ` +${sub.tips.length - 1}` : ''}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
