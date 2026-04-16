import { useState, useRef, useCallback } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, Priority } from '../types';
import { getTaskTitle } from '../types';
import { useTaskStore } from '../store/tasks';

interface Props {
  task: Task;
  onClick: (task: Task) => void;
  compact?: boolean;
}

const PRIORITY_DOT_COLOR: Record<Priority, string> = {
  alta:  '#ff453a',
  media: '#ff9f0a',
  baixa: '#64C4FF',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'A fazer',
  doing: 'Em progresso',
  done: 'Concluída',
};

export function TaskChip({ task, onClick, compact = false }: Props) {
  const { companies, subClients } = useTaskStore();
  const company = companies.find((c) => c.id === task.companyId);
  const sub     = subClients.find((s) => s.id === task.subClientId);
  const color   = task.colorOverride ?? company?.color ?? '#356BFF'; // #12 color override
  const title   = getTaskTitle(task, companies, subClients);
  const done    = task.status === 'done';
  const tips    = sub?.tips ?? [];

  // Hover card state
  const [showCard, setShowCard] = useState(false);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();

  const hasDetails = task.priority || task.deadline || task.notes || (task.subtasks && task.subtasks.length > 0) || task.estimate;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = `${color}35`;
    if (!hasDetails) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCardPos({ x: rect.left + rect.width / 2, y: rect.top });
    hoverTimeout.current = setTimeout(() => setShowCard(true), 400);
  }, [color, hasDetails]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = `${color}22`;
    clearTimeout(hoverTimeout.current);
    setShowCard(false);
  }, [color]);

  // Deadline formatting
  const deadlineInfo = task.deadline ? (() => {
    const d = new Date(task.deadline + 'T00:00:00');
    const overdue = !done && isPast(d) && !isToday(d);
    const label = isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, "d MMM", { locale: ptBR });
    return { label, overdue };
  })() : null;

  // Subtask progress
  const subtasksDone = task.subtasks?.filter(s => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const subtaskPct = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(task); }}
        className="w-full text-left rounded-md px-2 py-1 text-xs font-medium truncate leading-5 transition-all"
        style={{
          background: `${color}22`,
          color: done ? `${color}66` : color,
          textDecoration: done ? 'line-through' : 'none',
          border: `1px solid ${color}33`,
          opacity: done ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Priority dot */}
        {task.priority && (
          <span
            style={{
              width: 4, height: 4, borderRadius: '50%',
              background: PRIORITY_DOT_COLOR[task.priority],
              flexShrink: 0, display: 'inline-block',
            }}
          />
        )}

        {!compact && (
          <span className="opacity-60 flex-shrink-0">
            {done ? '✓' : task.status === 'doing' ? '◐' : '○'}
          </span>
        )}
        <span className="truncate">{title}</span>

        {/* Tips indicator */}
        {tips.length > 0 && (
          <span
            title={tips.join(' · ')}
            style={{ fontSize: 9, flexShrink: 0, color: '#ff9f0a', opacity: 0.8 }}
          >
            ★{tips.length}
          </span>
        )}

        {/* Subtask progress badge */}
        {task.subtasks && task.subtasks.length > 0 && (
          <span style={{
            fontSize: 9, flexShrink: 0, opacity: 0.6,
            color: task.subtasks.every(s => s.done) ? '#30d158' : 'inherit',
          }}>
            {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
          </span>
        )}
      </button>

      {/* Hover card tooltip */}
      {showCard && hasDetails && (
        <div
          className="hover-tooltip"
          style={{
            position: 'fixed',
            left: cardPos.x,
            top: cardPos.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9990,
            minWidth: 180,
            maxWidth: 260,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'var(--modal-bg, #1a1f2e)',
            border: '1px solid var(--b3, rgba(255,255,255,0.08))',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            fontSize: 11,
            color: 'var(--t2, #ccc)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Status + Priority row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: done ? '#30d15822' : task.status === 'doing' ? '#ff9f0a22' : 'var(--s2, rgba(255,255,255,0.05))',
              color: done ? '#30d158' : task.status === 'doing' ? '#ff9f0a' : 'var(--t3)',
            }}>
              {STATUS_LABEL[task.status]}
            </span>
            {task.priority && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                background: `${PRIORITY_DOT_COLOR[task.priority]}22`,
                color: PRIORITY_DOT_COLOR[task.priority],
              }}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}
          </div>

          {/* Deadline */}
          {deadlineInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
              <span style={{ opacity: 0.5 }}>Prazo:</span>
              <span style={{
                fontWeight: 600,
                color: deadlineInfo.overdue ? '#ff453a' : 'var(--t2)',
              }}>
                {deadlineInfo.label}
                {deadlineInfo.overdue && ' (atrasada)'}
              </span>
            </div>
          )}

          {/* Subtask progress bar */}
          {subtasksTotal > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ opacity: 0.5 }}>Subtarefas</span>
                <span style={{ fontWeight: 600, color: subtaskPct === 100 ? '#30d158' : 'inherit' }}>
                  {subtasksDone}/{subtasksTotal}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${subtaskPct}%`,
                  background: subtaskPct === 100 ? '#30d158' : color,
                  transition: 'width .2s',
                }} />
              </div>
            </div>
          )}

          {/* Estimate */}
          {task.estimate && (
            <div style={{ fontSize: 10, display: 'flex', gap: 5 }}>
              <span style={{ opacity: 0.5 }}>Estimativa:</span>
              <span style={{ fontWeight: 600 }}>{task.estimate >= 60 ? `${Math.floor(task.estimate / 60)}h${task.estimate % 60 > 0 ? ` ${task.estimate % 60}min` : ''}` : `${task.estimate}min`}</span>
            </div>
          )}

          {/* Notes preview */}
          {task.notes && (
            <div style={{
              fontSize: 10, opacity: 0.6, lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {task.notes}
            </div>
          )}
        </div>
      )}
    </>
  );
}
