import { useEffect, useState, useCallback } from 'react';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import { playStatusChange } from '../../lib/sounds';
import { useTaskStore } from '../../store/tasks';
import { getTaskTitle } from '../../types';
import type { Task, Priority, TaskCategory } from '../../types';

interface Props {
  onTaskClick: (task: Task) => void;
  onDayClick: (date: string) => void;
}

// Module-level defaults; component shadows accentColor with store value for dynamic usage
const accentColor = '#356BFF';
const accentRgb = '53,107,255';

const PRIORITY_COLOR: Record<Priority, string> = {
  alta: '#ff453a', media: '#ff9f0a', baixa: '#64C4FF',
};
const PRIORITY_ORDER: Record<Priority | 'none', number> = {
  alta: 0, media: 1, baixa: 2, none: 3,
};

const STATUS_NEXT: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' };
const STATUS_COLOR: Record<string, string> = { todo: 'var(--t4)', doing: accentColor, done: '#30d158' };
const STATUS_BG: Record<string, string> = { todo: 'var(--s1)', doing: `rgba(${accentRgb}, 0.1)`, done: 'rgba(48,209,88,0.08)' };
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
  const store = useTaskStore();
  const {
    currentDate, setCurrentDate, tasks, selectedCompanies, companies, subClients,
    cycleTaskStatus, hideDone, filterPriority, filterSubClient, filterTaskType,
    filterTaskCategory, setFilterTaskCategory,
  } = store;
  const accentColor = store.accentColor;

  // Pop-done animation (#49)
  const [popDoneId, setPopDoneId] = useState<string | null>(null);
  const handleCycleTask = useCallback((task: Task) => {
    cycleTaskStatus(task.id);
    if (task.status === 'doing') {
      setPopDoneId(task.id);
      setTimeout(() => setPopDoneId(null), 500);
    }
  }, [cycleTaskStatus]);

  const dateStr  = format(currentDate, 'yyyy-MM-dd');
  const todayDay = isToday(currentDate);

  const dayTasks = sortTasks(
    tasks.filter(t =>
      !t.deletedAt &&
      t.date === dateStr &&
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

  const allVisibleCompanies = companies.filter(c => !c.deletedAt && selectedCompanies.includes(c.id));

  const TASK_CATEGORIES: { id: TaskCategory; label: string; color: string }[] = [
    { id: 'criacao', label: 'Criação',  color: accentColor },
    { id: 'reuniao', label: 'Reunião',  color: '#ff9f0a' },
    { id: 'pessoal', label: 'Pessoal',  color: '#30d158' },
    { id: 'eventos', label: 'Eventos',  color: '#bf5af2' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Category filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 0', flexShrink: 0 }}>
        <button onClick={() => setFilterTaskCategory(null)}
          style={{ padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: filterTaskCategory === null ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: filterTaskCategory === null ? 'rgba(100,196,255,0.15)' : 'transparent', color: filterTaskCategory === null ? '#64C4FF' : 'var(--t4)' }}
          onMouseEnter={e => { if (filterTaskCategory !== null) (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
          onMouseLeave={e => { if (filterTaskCategory !== null) (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >Todos</button>
        {TASK_CATEGORIES.map(cat => {
          const active = filterTaskCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setFilterTaskCategory(cat.id)}
              style={{ padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: active ? `${cat.color}22` : 'transparent', color: active ? cat.color : 'var(--t4)' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = cat.color; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
            >{cat.label}</button>
          );
        })}
      </div>

      {/* Header */}
      <div style={{
        padding: '18px 28px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>
              {format(currentDate, 'EEEE', { locale: ptBR })}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 300, lineHeight: 1, color: todayDay ? accentColor : 'var(--t1)' }}>
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
              background: accentColor, border: 'none', color: '#fff', cursor: 'pointer', transition: 'opacity .15s',
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
                style={{ height: '100%', background: pct === 100 ? '#30d158' : accentColor, borderRadius: 2 }}
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

      {/* Tasks — one column per company */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '0 28px 16px', display: 'flex', flexDirection: 'column' }}>
        {allVisibleCompanies.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--t4)' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.3 }}>
              <rect x="10" y="8" width="28" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="16" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
              <line x1="16" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
              <circle cx="36" cy="36" r="8" fill="var(--bg)" stroke="currentColor" strokeWidth="2" />
              <line x1="33" y1="36" x2="39" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="36" y1="33" x2="36" y2="39" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Nenhuma empresa selecionada</span>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: 16, alignItems: 'flex-start', overflowY: 'auto' }}>
            {allVisibleCompanies.map(company => {
              const cTasks = dayTasks.filter(t => t.companyId === company.id);
              return (
                <div key={company.id} style={{ flex: '1 1 0', minWidth: 220, display: 'flex', flexDirection: 'column' }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingTop: 16 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: company.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: company.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {company.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>
                      {cTasks.filter(t => t.status === 'done').length}/{cTasks.length}
                    </span>
                    <div style={{ flex: 1, height: 1, background: `${company.color}25`, minWidth: 8 }} />
                  </div>

                  {/* Tasks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cTasks.map((task, i) => {
                      const done  = task.status === 'done';
                      const title = getTaskTitle(task, companies, subClients);
                      return (
                        <motion.div
                          key={task.id}
                          className={popDoneId === task.id ? 'pop-done' : ''}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.15 }}
                          onClick={() => onTaskClick(task)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 12,
                            background: STATUS_BG[task.status],
                            cursor: 'pointer', transition: 'background .12s',
                            opacity: done ? 0.7 : 1,
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = STATUS_BG[task.status])}
                        >
                          <motion.button
                            onClick={(e) => { e.stopPropagation(); handleCycleTask(task); playStatusChange(); }}
                            whileTap={{ scale: 1.4 }}
                            title={`${STATUS_LABEL[task.status]} → ${STATUS_LABEL[STATUS_NEXT[task.status]]}`}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: STATUS_COLOR[task.status], padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 16, transition: 'color .15s' }}
                          >
                            {task.status === 'done' ? '✓' : task.status === 'doing' ? '◐' : '○'}
                          </motion.button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: done ? 'var(--t4)' : 'var(--t1)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: task.deadline || task.time || task.priority ? 5 : 0, flexWrap: 'wrap' }}>
                              {task.deadline && (
                                <span style={{ fontSize: 10, color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', padding: '2px 6px', borderRadius: 4 }}>prazo {task.deadline}</span>
                              )}
                              {task.time && (
                                <span style={{ fontSize: 10, color: 'var(--t3)' }}>{task.time}</span>
                              )}
                              {task.priority && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {task.priority === 'media' ? 'MED' : task.priority === 'alta' ? 'ALT' : 'BAI'}
                                </span>
                              )}
                            </div>
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
