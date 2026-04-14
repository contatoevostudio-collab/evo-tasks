import { useEffect } from 'react';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';
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
const STATUS_BG: Record<string, string> = { todo: 'var(--s1)', doing: 'rgba(53,107,255,0.1)', done: 'rgba(48,209,88,0.08)' };
const STATUS_LABEL: Record<string, string> = { todo: 'A Fazer', doing: 'Em Andamento', done: 'Concluído' };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none'];
  });
}

export function DayView({ onTaskClick, onDayClick }: Props) {
  const {
    currentDate, setCurrentDate, tasks, selectedCompanies, companies, subClients,
    cycleTaskStatus, hideDone, filterPriority, filterSubClient, filterTaskType,
  } = useTaskStore();

  const dateStr  = format(currentDate, 'yyyy-MM-dd');
  const todayDay = isToday(currentDate);
  const today    = format(new Date(), 'yyyy-MM-dd');

  const dayTasks = sortTasks(
    tasks.filter(t =>
      t.date === dateStr &&
      selectedCompanies.includes(t.companyId) &&
      !t.archived &&
      (!hideDone || t.status !== 'done') &&
      (!filterPriority || t.priority === filterPriority) &&
      (!filterSubClient || t.subClientId === filterSubClient) &&
      (!filterTaskType || t.taskType === filterTaskType)
    )
  );

  const doneCnt = dayTasks.filter(t => t.status === 'done').length;
  const total   = dayTasks.length;
  const pct     = total > 0 ? (doneCnt / total) * 100 : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') setCurrentDate(addDays(currentDate, 1));
      if (e.key === 'ArrowLeft')  setCurrentDate(subDays(currentDate, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentDate, setCurrentDate]);

  const companiesWithTasks = companies
    .filter(c => dayTasks.some(t => t.companyId === c.id))
    .filter(c => selectedCompanies.includes(c.id));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--b1)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>
              {format(currentDate, 'EEEE', { locale: ptBR })}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 300, lineHeight: 1, color: todayDay ? '#356BFF' : 'var(--t1)' }}>
              {format(currentDate, "d 'de' MMMM", { locale: ptBR })}
              <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 8, color: 'var(--t4)' }}>
                {format(currentDate, 'yyyy')}
              </span>
            </h2>
          </div>
          <button
            onClick={() => onDayClick(dateStr)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: '#356BFF', border: 'none', color: '#fff', cursor: 'pointer', transition: 'opacity .15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            <FiPlus size={13} /> Nova Tarefa
          </button>
        </div>

        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: pct === 100 ? '#30d158' : '#356BFF', borderRadius: 2 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span style={{ fontSize: 11, color: pct === 100 ? '#30d158' : 'var(--t3)', fontWeight: 600, flexShrink: 0 }}>
              {doneCnt}/{total}
            </span>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
        {dayTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 10, color: 'var(--t4)' }}>
            <div style={{ fontSize: 36 }}>○</div>
            <span style={{ fontSize: 13 }}>Nenhuma tarefa para {todayDay ? 'hoje' : 'este dia'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
            {companiesWithTasks.map(company => {
              const cTasks = dayTasks.filter(t => t.companyId === company.id);
              return (
                <div key={company.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: company.color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: company.color, opacity: 0.7 }}>
                      {company.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                      {cTasks.filter(t => t.status === 'done').length}/{cTasks.length}
                    </span>
                    <div style={{ flex: 1, height: 1, background: `${company.color}20` }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cTasks.map((task, i) => {
                      const color   = task.colorOverride ?? company.color;
                      const done    = task.status === 'done';
                      const title   = getTaskTitle(task, companies, subClients);
                      const isOverdue = task.date < today && !done;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.15 }}
                          onClick={() => onTaskClick(task)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 16px', borderRadius: 12,
                            background: STATUS_BG[task.status],
                            border: `1px solid ${isOverdue ? 'rgba(255,69,58,0.3)' : 'var(--b1)'}`,
                            borderLeft: `3px solid ${done ? color + '40' : color}`,
                            cursor: 'pointer', transition: 'background .12s',
                            opacity: done ? 0.7 : 1,
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = STATUS_BG[task.status])}
                        >
                          <motion.button
                            onClick={(e) => { e.stopPropagation(); cycleTaskStatus(task.id); }}
                            whileTap={{ scale: 1.4 }}
                            title={`${STATUS_LABEL[task.status]} → ${STATUS_LABEL[STATUS_NEXT[task.status]]}`}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: STATUS_COLOR[task.status],
                              padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center',
                              fontSize: 16, transition: 'color .15s',
                            }}
                          >
                            {task.status === 'done' ? '✓' : task.status === 'doing' ? '◐' : '○'}
                          </motion.button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{
                              display: 'block', fontSize: 13, fontWeight: 500,
                              color: done ? 'var(--t4)' : 'var(--t1)',
                              textDecoration: done ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {title}
                            </span>
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, display: 'block' }}>
                                {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} etapas
                              </span>
                            )}
                            {(() => { const sub = subClients.find(s => s.id === task.subClientId); return sub?.tips && sub.tips.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                                {sub.tips.map((tip, ti) => (
                                  <span key={ti} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', fontStyle: 'italic' }}>★ {tip}</span>
                                ))}
                              </div>
                            ) : null; })()}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {task.deadline && (
                              <span style={{ fontSize: 10, color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                                prazo {task.deadline}
                              </span>
                            )}
                            {task.time && (
                              <span style={{ fontSize: 10, color: 'var(--t3)' }}>{task.time}</span>
                            )}
                            {task.priority && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                                background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority],
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                              }}>
                                {task.priority === 'media' ? 'MED' : task.priority === 'alta' ? 'ALT' : 'BAI'}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
