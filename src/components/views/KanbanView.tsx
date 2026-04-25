import { useState } from 'react';
import { format, parseISO, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiLayers, FiMinimize2 } from 'react-icons/fi';
import { BsCircle, BsCircleHalf, BsCheckCircleFill } from 'react-icons/bs';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskStatus, Priority, TaskCategory } from '../../types';
import { getTaskTitle } from '../../types';
import { useTaskStore } from '../../store/tasks';
import { playDrop } from '../../lib/sounds';

interface Props {
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'todo',  label: 'A Fazer',      Icon: BsCircle,          color: '#ff9f0a' },
  { id: 'doing', label: 'Em Andamento', Icon: BsCircleHalf,      color: '#64C4FF' },
  { id: 'done',  label: 'Concluído',    Icon: BsCheckCircleFill, color: '#30d158' },
];

const PRIORITY_ORDER: Record<Priority | 'none', number> = { alta: 0, media: 1, baixa: 2, none: 3 };
const PRIORITY_COLOR: Record<Priority, string> = { alta: '#ff453a', media: '#ff9f0a', baixa: '#64C4FF' };
function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none']
  );
}

function KanbanCard({ task, onClick, compact }: { task: Task; onClick: (task: Task) => void; compact: boolean }) {
  const { companies, subClients, accentColor } = useTaskStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const company = companies.find(c => c.id === task.companyId);
  const sub = subClients.find(s => s.id === task.subClientId);
  const color = task.colorOverride ?? company?.color ?? '#636366';
  const title = getTaskTitle(task, companies, subClients);
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const done = task.status === 'done';
  const isOverdue = task.date < today && !done;
  const isTaskToday = isToday(parseISO(task.date));
  const isDeadlineSoon = task.deadline && !done && task.deadline <= tomorrow;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'opacity-30' : ''}>
      <motion.div
        className={isDeadlineSoon ? 'deadline-pulse' : ''}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          background: 'var(--s1)',
          borderRadius: 12, padding: compact ? '8px 10px' : '12px 14px',
          cursor: 'pointer', transition: 'all .15s',
        }}
        onClick={() => onClick(task)}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s1)')}
        {...attributes}
        {...listeners}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: compact ? 11 : 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--t1)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              opacity: task.status === 'done' ? 0.5 : 1,
              wordBreak: 'break-word',
            }}>
              {title}
            </p>

            {!compact && sub && <p style={{ fontSize: 11, marginTop: 3, color: 'var(--t3)' }}>{sub.name}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: compact ? 4 : 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: `${color}22`, color }}>
                {company?.name ?? '?'}
              </span>
              {task.priority && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                  background: `${PRIORITY_COLOR[task.priority]}20`,
                  color: PRIORITY_COLOR[task.priority],
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {task.priority === 'media' ? 'MED' : task.priority === 'alta' ? 'ALT' : 'BAI'}
                </span>
              )}
              {!compact && (
                <span style={{
                  fontSize: 10,
                  color: isOverdue ? '#ff453a' : isTaskToday ? accentColor : 'var(--t4)',
                  fontWeight: isOverdue || isTaskToday ? 600 : 400,
                }}>
                  {isOverdue ? '⚠ ' : ''}{format(parseISO(task.date), "d MMM", { locale: ptBR })}
                </span>
              )}
              {!compact && task.deadline && (
                <span style={{ fontSize: 10, color: '#ff9f0a', background: 'rgba(255,159,10,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                  prazo {task.deadline}
                </span>
              )}
              {!compact && task.subtasks && task.subtasks.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                  {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} ✓
                </span>
              )}
            </div>

            {!compact && task.notes && (
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {task.notes}
              </p>
            )}

            {/* Tips do subclient */}
            {sub?.tips && sub.tips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {sub.tips.map((tip, i) => (
                  <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', fontStyle: 'italic' }}>
                    ★ {tip}
                  </span>
                ))}
              </div>
            )}

            {/* Art version / legenda / referência tags */}
            {((task.versions && task.versions.length > 0) || task.copy || (task.references && task.references.length > 0)) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {task.versions?.map((v, i) => (
                  <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(53,107,255,0.15)', color: '#64C4FF', fontWeight: 600 }}>
                    {v.label}
                  </span>
                ))}
                {task.copy && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(48,209,88,0.12)', color: '#30d158', fontWeight: 600 }}>
                    Legenda
                  </span>
                )}
                {task.references && task.references.length > 0 && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(191,90,242,0.12)', color: '#bf5af2', fontWeight: 600 }}>
                    Referência
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SwimlaneCell({
  companyId, status, tasks, onTaskClick, compact,
}: {
  companyId: string; status: TaskStatus; tasks: Task[];
  onTaskClick: (task: Task) => void; compact: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `sw:${companyId}:${status}` });
  const { accentColor } = useTaskStore();
  const accentRgb = (() => { const v = accentColor.replace('#', ''); const c = v.length === 3 ? v.split('').map(x => x+x).join('') : v; return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; })();
  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? `rgba(${accentRgb}, 0.12)` : 'var(--s1)',
        border: `1px solid ${isOver ? `rgba(${accentRgb}, 0.4)` : 'var(--b2)'}`,
        boxShadow: isOver ? `0 0 18px -4px rgba(${accentRgb}, 0.4)` : 'none',
        borderRadius: 10, minHeight: 60, padding: 8,
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'background .15s, border-color .15s, box-shadow .15s',
      }}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: isOver ? accentColor : 'var(--t4)', fontWeight: isOver ? 600 : 400, transition: 'color .15s' }}>
            {isOver ? 'Solte aqui' : '—'}
          </div>
        ) : tasks.map(task => (
          <KanbanCard key={task.id} task={task} onClick={onTaskClick} compact={compact} />
        ))}
      </SortableContext>
    </div>
  );
}

function Column({
  status, tasks, onTaskClick, onAddTask, label, Icon, color, compact,
}: {
  status: TaskStatus; tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  label: string; Icon: React.ElementType; color: string;
  compact: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { companies, accentColor } = useTaskStore();
  const accentRgb = (() => { const v = accentColor.replace('#', ''); const c = v.length === 3 ? v.split('').map(x => x+x).join('') : v; return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; })();

  const companyCounts = companies
    .map(c => ({ company: c, count: tasks.filter(t => t.companyId === c.id).length }))
    .filter(x => x.count > 0);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minWidth: compact ? 220 : 280, maxWidth: compact ? 320 : 400, borderRadius: 16, overflow: 'hidden',
      background: isOver ? `rgba(${accentRgb}, 0.08)` : 'var(--s1)',
      transition: 'all 0.15s',
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={13} style={{ color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: `${color}22`, color }}>
            {tasks.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {companyCounts.map(({ company, count }) => (
            <span key={company.id} title={`${company.name}: ${count}`} style={{
              fontSize: 9, fontWeight: 700, color: company.color,
              background: `${company.color}18`, borderRadius: 99, padding: '1px 5px',
            }}>{count}</span>
          ))}
          <button onClick={() => onAddTask(status)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 5, borderRadius: 7, transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}>
            <FiPlus size={13} />
          </button>
        </div>
      </div>

      <div ref={setNodeRef} style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: compact ? 5 : 8, minHeight: 100 }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map(task => (
              <KanbanCard key={task.id} task={task} onClick={onTaskClick} compact={compact} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 11, color: 'var(--t4)', borderRadius: 10, border: '1.5px dashed var(--b2)', minHeight: 80, padding: 16 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.35 }}>
              {status === 'todo' && <>
                <rect x="6" y="8" width="20" height="3" rx="1.5" fill="currentColor" />
                <rect x="6" y="14" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.6" />
                <rect x="6" y="20" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
              </>}
              {status === 'doing' && <>
                <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
                <path d="M16 6a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </>}
              {status === 'done' && <>
                <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
                <path d="M11 16.5l3.5 3.5 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </>}
            </svg>
            <span>{status === 'todo' ? 'Nenhuma pendência' : status === 'doing' ? 'Nada em progresso' : 'Nenhuma concluída'}</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>Arraste tarefas aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanView({ onTaskClick, onAddTask }: Props) {
  const store = useTaskStore();
  const {
    tasks, selectedCompanies, updateTaskStatus, hideDone, filterPriority,
    filterSubClient, filterTaskType, filterTaskCategory, setFilterTaskCategory,
    companies, subClients, kanbanOrder, setKanbanOrder,
  } = store;
  const accentColor = store.accentColor;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [swimlanes, setSwimlanes] = useState(false);
  const [compact, setCompact] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredTasks = tasks.filter(t =>
    !t.deletedAt &&
    selectedCompanies.includes(t.companyId) &&
    !t.archived &&
    !t.inbox &&
    (!filterPriority || t.priority === filterPriority) &&
    (!filterSubClient || t.subClientId === filterSubClient) &&
    (!filterTaskType || t.taskType === filterTaskType) &&
    (!filterTaskCategory || (t.taskCategory ?? 'criacao') === filterTaskCategory)
  );

  const getColumnTasks = (status: TaskStatus) => {
    const col = filteredTasks.filter(t => t.status === status && (!hideDone || status !== 'done'));
    const order = kanbanOrder[status];
    if (!order || order.length === 0) return sortByPriority(col);
    const ordered = order.map(id => col.find(t => t.id === id)).filter(Boolean) as Task[];
    const unordered = col.filter(t => !order.includes(t.id));
    return [...ordered, ...sortByPriority(unordered)];
  };

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasks.find(t => t.id === e.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    playDrop();
    const activeId = active.id as string;
    const overId = over.id as string;
    const validStatuses: TaskStatus[] = ['todo', 'doing', 'done'];

    const activeTaskObj = tasks.find(t => t.id === activeId);
    if (!activeTaskObj) return;

    // Swimlane cell droppable — "sw:companyId:status"
    if (overId.startsWith('sw:')) {
      const parts = overId.split(':');
      const newStatus = parts[2] as TaskStatus;
      if (!validStatuses.includes(newStatus)) return;
      if (activeTaskObj.status === newStatus) return;
      updateTaskStatus(activeId, newStatus);
      setKanbanOrder(activeTaskObj.status, kanbanOrder[activeTaskObj.status].filter(id => id !== activeId));
      setKanbanOrder(newStatus, [...kanbanOrder[newStatus].filter(id => id !== activeId), activeId]);
      return;
    }

    if (validStatuses.includes(overId as TaskStatus)) {
      // Dropped on column droppable (non-swimlane mode)
      const newStatus = overId as TaskStatus;
      if (activeTaskObj.status === newStatus) return;

      updateTaskStatus(activeId, newStatus);
      // Remove from old column, deduplicate then append to new column
      setKanbanOrder(activeTaskObj.status, kanbanOrder[activeTaskObj.status].filter(id => id !== activeId));
      setKanbanOrder(newStatus, [...kanbanOrder[newStatus].filter(id => id !== activeId), activeId]);
    } else {
      // Dropped on a task card
      const overTaskObj = tasks.find(t => t.id === overId);
      if (!overTaskObj) return;

      if (activeTaskObj.status === overTaskObj.status) {
        // Same column — reorder
        const colTasks = getColumnTasks(activeTaskObj.status);
        const oldIdx = colTasks.findIndex(t => t.id === activeId);
        const newIdx = colTasks.findIndex(t => t.id === overId);
        if (oldIdx !== -1 && newIdx !== -1) {
          setKanbanOrder(activeTaskObj.status, arrayMove(colTasks.map(t => t.id), oldIdx, newIdx));
        }
      } else {
        // Different column — change status and insert near the target card
        const newStatus = overTaskObj.status;
        updateTaskStatus(activeId, newStatus);
        // Remove from old column
        setKanbanOrder(activeTaskObj.status, kanbanOrder[activeTaskObj.status].filter(id => id !== activeId));
        // Insert at position of over card in new column (deduplicated)
        const colTasks = getColumnTasks(newStatus);
        const insertIdx = colTasks.findIndex(t => t.id === overId);
        const newOrder = colTasks.map(t => t.id).filter(id => id !== activeId);
        newOrder.splice(insertIdx !== -1 ? insertIdx : newOrder.length, 0, activeId);
        setKanbanOrder(newStatus, newOrder);
      }
    }
  };

  // Active companies with tasks for swimlane mode (excluindo lixeira)
  const activeCompanies = companies.filter(c =>
    !c.deletedAt && selectedCompanies.includes(c.id) && filteredTasks.some(t => t.companyId === c.id)
  );

  // KPIs (calculados a partir de filteredTasks, sem o hideDone)
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(addDays(new Date(), -7), 'yyyy-MM-dd');
  const kpiTotalOpen = filteredTasks.filter(t => t.status !== 'done').length;
  const kpiOverdue = filteredTasks.filter(t => t.status !== 'done' && t.date < today).length;
  const kpiHighPrio = filteredTasks.filter(t => t.status !== 'done' && t.priority === 'alta').length;
  const kpiDoneWeek = filteredTasks.filter(t => t.status === 'done' && t.date >= weekAgo).length;
  const kpiDoing = filteredTasks.filter(t => t.status === 'doing').length;

  const accentRgbLocal = (() => { const v = accentColor.replace('#', ''); const c = v.length === 3 ? v.split('').map(x => x+x).join('') : v; return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; })();

  const KPIS = [
    { label: 'Aberto',      value: kpiTotalOpen, color: accentColor, rgb: accentRgbLocal },
    { label: 'Atrasadas',   value: kpiOverdue,   color: '#ff453a',   rgb: '255,69,58' },
    { label: 'Em andamento', value: kpiDoing,    color: '#64C4FF',   rgb: '100,196,255' },
    { label: 'Alta prio',   value: kpiHighPrio,  color: '#ff9f0a',   rgb: '255,159,10' },
    { label: 'Feitas 7d',   value: kpiDoneWeek,  color: '#30d158',   rgb: '48,209,88' },
  ];

  const toggleBtn = (active: boolean, onClick: () => void, title: string, Icon: React.ElementType, label: string) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        background: active ? `${accentColor}22` : 'var(--s1)',
        border: active ? `1px solid ${accentColor}55` : '1px solid var(--b2)',
        color: active ? accentColor : 'var(--t3)',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <Icon size={11} /> {label}
    </button>
  );

  const TASK_CATEGORIES: { id: TaskCategory; label: string; color: string }[] = [
    { id: 'criacao', label: 'Criação',  color: accentColor },
    { id: 'reuniao', label: 'Reunião',  color: '#ff9f0a' },
    { id: 'pessoal', label: 'Pessoal',  color: '#30d158' },
    { id: 'eventos', label: 'Eventos',  color: '#bf5af2' },
  ];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
      {/* KPI bar */}
      <div style={{ padding: '10px 24px 0', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 10,
            background: 'var(--s1)', border: `1px solid rgba(${k.rgb}, 0.2)`,
            backgroundImage: `radial-gradient(circle at 110% 100%, rgba(${k.rgb}, 0.12), transparent 65%)`,
            boxShadow: `0 0 14px -6px rgba(${k.rgb}, 0.3)`,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>{k.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: k.color, textShadow: k.value > 0 ? `0 0 6px rgba(${k.rgb}, 0.5)` : 'none' }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ padding: '10px 24px 0', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Category filters */}
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
        <div style={{ flex: 1 }} />
        {toggleBtn(compact, () => setCompact(s => !s), 'Modo compacto', FiMinimize2, 'Compacto')}
        {toggleBtn(swimlanes, () => setSwimlanes(s => !s), 'Agrupar por empresa', FiLayers, 'Swimlanes')}
      </div>

      {!swimlanes ? (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ display: 'flex', gap: 16, height: '100%', padding: '12px 24px 20px', minWidth: 'max-content' }}>
            {COLUMNS.map(({ id, label, Icon, color }) => (
              <Column
                key={id} status={id}
                tasks={getColumnTasks(id)}
                onTaskClick={onTaskClick}
                onAddTask={onAddTask}
                label={label} Icon={Icon} color={color}
                compact={compact}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '12px 24px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 1fr)', gap: 10, marginBottom: 8, position: 'sticky', top: 0, zIndex: 1 }}>
            <div />
            {COLUMNS.map(({ label, color, Icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10 }}>
                <Icon size={12} style={{ color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
              </div>
            ))}
          </div>
          {activeCompanies.map(company => (
            <div key={company.id} style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 1fr)', gap: 10, marginBottom: 10, alignItems: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: `${company.color}10`, border: `1px solid ${company.color}25`, borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: company.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
              </div>
              {COLUMNS.map(({ id: status }) => {
                const colTasks = sortByPriority(
                  filteredTasks.filter(t => t.companyId === company.id && t.status === status && (!hideDone || status !== 'done'))
                );
                return (
                  <SwimlaneCell
                    key={status}
                    companyId={company.id}
                    status={status}
                    tasks={colTasks}
                    onTaskClick={onTaskClick}
                    compact={compact}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeTask && (() => {
          const company = companies.find(c => c.id === activeTask.companyId);
          const sub = subClients.find(s => s.id === activeTask.subClientId);
          const color = activeTask.colorOverride ?? company?.color ?? '#636366';
          return (
            <div style={{
              background: 'var(--s2)',
              border: `1px solid ${accentColor}`,
              borderRadius: 12,
              padding: compact ? '8px 10px' : '12px 14px',
              width: compact ? 220 : 280,
              boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 24px -4px ${accentColor}66`,
              cursor: 'grabbing',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: compact ? 11 : 13, fontWeight: 500, lineHeight: 1.4, color: 'var(--t1)', wordBreak: 'break-word' }}>
                    {getTaskTitle(activeTask, companies, subClients)}
                  </p>
                  {!compact && sub && <p style={{ fontSize: 11, marginTop: 3, color: 'var(--t3)' }}>{sub.name}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: compact ? 4 : 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: `${color}22`, color }}>
                      {company?.name ?? '?'}
                    </span>
                    {activeTask.priority && (
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                        background: `${PRIORITY_COLOR[activeTask.priority]}20`,
                        color: PRIORITY_COLOR[activeTask.priority],
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {activeTask.priority === 'media' ? 'MED' : activeTask.priority === 'alta' ? 'ALT' : 'BAI'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
