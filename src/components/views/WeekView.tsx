import { useRef, useState } from 'react';
import { format, startOfWeek, addDays, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/tasks';
import { playStatusChange } from '../../lib/sounds';
import { getTaskTitle } from '../../types';
import type { Task, Priority } from '../../types';

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
const STATUS_COLOR: Record<string, string> = { todo: 'var(--t4)', doing: '#356BFF', done: '#30d158' };
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
  const {
    currentDate, tasks, selectedCompanies, companies, subClients,
    cycleTaskStatus, hideDone, filterPriority, filterSubClient, filterTaskType,
    updateTask,
  } = useTaskStore();

  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragTaskId = useRef<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (day: Date) => {
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
      (!filterTaskType || t.taskType === filterTaskType)
    ));
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = dragTaskId.current ?? e.dataTransfer.getData('taskId');
    if (id) updateTask(id, { date: dateStr });
    setDragOver(null);
    dragTaskId.current = null;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
        {days.map((day, i) => {
          const todayDay = isToday(day);
          const dayTasks = getTasksForDay(day);
          const doneCnt  = dayTasks.filter(t => t.status === 'done').length;
          const total    = dayTasks.length;
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;

          return (
            <div key={i} style={{ borderRight: i < 6 ? '1px solid var(--b1)' : 'none', background: isWeekend ? 'rgba(100,196,255,0.025)' : 'transparent' }}>
              <div style={{ padding: '12px 0 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: isWeekend ? 'rgba(100,196,255,0.5)' : 'var(--t4)', marginBottom: 6 }}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  {total > 0 && (
                    <span style={{ marginLeft: 4, color: todayDay ? '#356BFF' : 'var(--t4)', fontWeight: 500 }}>
                      · {total}
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: '50%',
                  background: todayDay ? '#356BFF' : 'transparent',
                  color: todayDay ? '#fff' : isWeekend ? 'rgba(100,196,255,0.6)' : 'var(--t1)',
                  fontSize: 18, fontWeight: todayDay ? 700 : 300,
                }}>
                  {format(day, 'd')}
                </div>
              </div>
              {total > 0 && (
                <div style={{ height: 2, background: 'var(--b1)', margin: '0 4px' }}>
                  <div style={{
                    height: '100%', borderRadius: 1,
                    width: `${(doneCnt / total) * 100}%`,
                    background: doneCnt === total ? '#30d158' : '#356BFF',
                    transition: 'width .3s ease',
                  }} />
                </div>
              )}
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
          const isDragOver = dragOver === dateStr;

          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              style={{
                borderRight: i < 6 ? '1px solid var(--b1)' : 'none',
                background: isDragOver
                  ? 'rgba(53,107,255,0.1)'
                  : todayDay ? 'rgba(53,107,255,0.04)'
                  : isWeekend ? 'rgba(100,196,255,0.025)'
                  : 'transparent',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer', minHeight: 0,
                outline: isDragOver ? '1.5px solid rgba(53,107,255,0.4)' : 'none',
                transition: 'background .15s',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, dateStr)}
            >
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
                {dayTasks.length === 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 16, color: 'var(--t4)', fontSize: 18 }}>○</div>
                )}
                {dayTasks.map((task) => {
                  const comp  = companies.find(c => c.id === task.companyId);
                  const sub   = subClients.find(s => s.id === task.subClientId);
                  const color = task.colorOverride ?? comp?.color ?? '#356BFF';
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
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 4,
                          padding: '8px 8px', borderRadius: 8, marginBottom: 4,
                          cursor: 'pointer', transition: 'background .12s',
                          border: isOverdue ? '1px solid rgba(255,69,58,0.25)' : '1px solid transparent',
                          borderLeft: `2px solid ${color}`,
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <motion.button
                            onClick={(e) => { e.stopPropagation(); cycleTaskStatus(task.id); playStatusChange(); }}
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
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 2 }}>
                          {task.priority && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority],
                              flexShrink: 0, textTransform: 'uppercase',
                            }}>
                              {task.priority === 'media' ? 'MED' : task.priority === 'alta' ? 'ALT' : 'BAI'}
                            </span>
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
