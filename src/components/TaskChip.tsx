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

export function TaskChip({ task, onClick, compact = false }: Props) {
  const { companies, subClients } = useTaskStore();
  const company = companies.find((c) => c.id === task.companyId);
  const sub     = subClients.find((s) => s.id === task.subClientId);
  const color   = task.colorOverride ?? company?.color ?? '#356BFF'; // #12 color override
  const title   = getTaskTitle(task, companies, subClients);
  const done    = task.status === 'done';
  const tips    = sub?.tips ?? [];

  return (
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
      title={title}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}35`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}22`)}
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
  );
}
