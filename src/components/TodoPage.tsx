import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiX, FiCheck, FiCalendar, FiColumns, FiList, FiGrid, FiArchive, FiChevronDown, FiChevronRight as FiExpand, FiMenu } from 'react-icons/fi';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../store/tasks';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { TodoItemStatus, TodoContext, Priority, TodoItem } from '../types';

type TodoLayout = 'kanban' | 'calendar' | 'table' | 'list';
type SortMode = 'date-asc' | 'date-desc' | 'priority' | 'context';

const COLUMNS: { id: TodoItemStatus; label: string; color: string }[] = [
  { id: 'standby', label: 'Stand-by',     color: 'var(--t4)' },
  { id: 'todo',    label: 'To Do',        color: '#ff9f0a' },
  { id: 'doing',   label: 'Em Progresso', color: '#356BFF' },
  { id: 'done',    label: 'Feito',        color: '#30d158' },
];

const CONTEXTS: { id: TodoContext; label: string; color: string }[] = [
  { id: 'trabalho', label: 'Trabalho', color: '#356BFF' },
  { id: 'pessoal',  label: 'Pessoal',  color: '#30d158' },
  { id: 'urgente',  label: 'Urgente',  color: '#ff453a' },
];

const CONTEXT_COLOR: Record<TodoContext, string> = {
  trabalho: '#356BFF',
  pessoal:  '#30d158',
  urgente:  '#ff453a',
};

const PRIORITY_ORDER: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function getWeekDays(ref: Date): Date[] {
  const mon = startOfWeek(ref, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

function toDateStr(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function sortItems(items: TodoItem[], mode: SortMode): TodoItem[] {
  const arr = [...items];
  if (mode === 'date-asc')  return arr.sort((a, b) => a.date.localeCompare(b.date));
  if (mode === 'date-desc') return arr.sort((a, b) => b.date.localeCompare(a.date));
  if (mode === 'context')   return arr.sort((a, b) => {
    const ca = a.context ? CONTEXTS.findIndex(c => c.id === a.context) : 99;
    const cb = b.context ? CONTEXTS.findIndex(c => c.id === b.context) : 99;
    return ca - cb;
  });
  if (mode === 'priority')  return arr.sort((a, b) => {
    // urgente context first, then by priority field
    const ctxA = a.context === 'urgente' ? 0 : 1;
    const ctxB = b.context === 'urgente' ? 0 : 1;
    if (ctxA !== ctxB) return ctxA - ctxB;
    const pA = PRIORITY_ORDER[a.priority ?? 'baixa'] ?? 3;
    const pB = PRIORITY_ORDER[b.priority ?? 'baixa'] ?? 3;
    return pA - pB;
  });
  return arr;
}

// ─── AddRow ────────────────────────────────────────────────────────────────────

interface AddRowProps {
  placeholder?: string;
  onSave: (text: string, context?: TodoContext, priority?: Priority) => void;
  onCancel: () => void;
  showMeta?: boolean;
}

function AddRow({ placeholder = 'Nova tarefa...', onSave, onCancel, showMeta = false }: AddRowProps) {
  const [text, setText] = useState('');
  const [ctx, setCtx] = useState<TodoContext | undefined>(undefined);
  const [pri, setPri] = useState<Priority | undefined>(undefined);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = () => {
    if (text.trim()) onSave(text.trim(), ctx, pri);
    else onCancel();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Context dot picker */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {CONTEXTS.map(c => (
            <button key={c.id} onClick={() => setCtx(ctx === c.id ? undefined : c.id)} title={c.label}
              style={{
                width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                background: c.color,
                opacity: ctx === c.id ? 1 : 0.25,
                transition: 'opacity .15s',
              }}
            />
          ))}
        </div>
        <input
          ref={ref} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
          placeholder={placeholder}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--t1)', padding: 0 }}
        />
        {showMeta && (
          <select value={pri ?? ''} onChange={e => setPri((e.target.value as Priority) || undefined)}
            style={{ fontSize: 10, background: 'var(--s2)', border: 'none', color: 'var(--t3)', borderRadius: 6, padding: '2px 4px', cursor: 'pointer', outline: 'none' }}>
            <option value=''>Prioridade</option>
            <option value='alta'>Alta</option>
            <option value='media'>Média</option>
            <option value='baixa'>Baixa</option>
          </select>
        )}
        <button onClick={submit} aria-label="Confirmar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#30d158', padding: 2, display: 'flex' }}>
          <FiCheck size={11} />
        </button>
        <button onClick={onCancel} aria-label="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex' }}>
          <FiX size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── SubTask Panel ─────────────────────────────────────────────────────────────

interface SubTaskPanelProps {
  item: TodoItem;
}

function SubTaskPanel({ item }: SubTaskPanelProps) {
  const { addTodoSubTask, toggleTodoSubTask, deleteTodoSubTask } = useTaskStore();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const submit = () => {
    if (newLabel.trim()) { addTodoSubTask(item.id, newLabel.trim()); setNewLabel(''); }
    setAdding(false);
  };

  const subtasks = item.subtasks ?? [];

  return (
    <div style={{ paddingLeft: 22, paddingBottom: 6 }}>
      {subtasks.map(st => (
        <div key={st.id}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}
          onMouseEnter={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.st-del'); if (d) d.style.opacity = '1'; }}
          onMouseLeave={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.st-del'); if (d) d.style.opacity = '0'; }}
        >
          <button onClick={() => toggleTodoSubTask(item.id, st.id)} aria-label={st.done ? 'Desmarcar subtarefa' : 'Marcar subtarefa'}
            style={{
              width: 11, height: 11, borderRadius: 3, flexShrink: 0,
              background: st.done ? '#30d158' : 'transparent',
              border: `1.5px solid ${st.done ? '#30d158' : 'var(--t4)'}`,
              cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}>
            {st.done && <FiCheck size={7} color="#fff" strokeWidth={3} />}
          </button>
          <span style={{ flex: 1, fontSize: 11, color: st.done ? 'var(--t4)' : 'var(--t3)', textDecoration: st.done ? 'line-through' : 'none', lineHeight: 1.4 }}>
            {st.label}
          </span>
          <button className="st-del" onClick={() => deleteTodoSubTask(item.id, st.id)} aria-label="Excluir subtarefa"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0, display: 'flex', opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
            <FiX size={9} />
          </button>
        </div>
      ))}

      {adding ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
          <div style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, border: '1.5px solid var(--t4)' }} />
          <input
            ref={inputRef} value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setNewLabel(''); } }}
            placeholder="Nova subtarefa..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--t1)', padding: 0 }}
          />
          <button onClick={submit} aria-label="Confirmar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#30d158', padding: 0, display: 'flex' }}><FiCheck size={10} /></button>
          <button onClick={() => { setAdding(false); setNewLabel(''); }} aria-label="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0, display: 'flex' }}><FiX size={10} /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 11, padding: '3px 0', transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
          + subtarefa
        </button>
      )}
    </div>
  );
}

// ─── Subtask Progress Pill ─────────────────────────────────────────────────────

function SubTaskPill({ item }: { item: TodoItem }) {
  const subtasks = item.subtasks ?? [];
  if (subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.done).length;
  const all = subtasks.length;
  const pct = all > 0 ? (done / all) * 100 : 0;
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 999,
      background: done === all ? '#30d15820' : 'var(--s2)',
      color: done === all ? '#30d158' : 'var(--t4)',
      border: `1px solid ${done === all ? '#30d15840' : 'var(--b1)'}`,
      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0,
      transition: 'all .2s',
    }}>
      <span style={{
        width: 24, height: 3, borderRadius: 99,
        background: 'var(--b1)', overflow: 'hidden', display: 'inline-block',
      }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: done === all ? '#30d158' : '#356BFF', borderRadius: 99, transition: 'width .3s' }} />
      </span>
      {done}/{all}
    </span>
  );
}

// ─── Context Dot ───────────────────────────────────────────────────────────────

function ContextDot({ context }: { context?: TodoContext }) {
  if (!context) return null;
  return (
    <span title={context} style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: CONTEXT_COLOR[context],
      boxShadow: `0 0 4px ${CONTEXT_COLOR[context]}80`,
    }} />
  );
}

// ─── Kanban Todo Row ───────────────────────────────────────────────────────────

interface KanbanRowProps {
  item: TodoItem;
  colId: TodoItemStatus;
  colColor: string;
}

function KanbanRow({ item, colId, colColor }: KanbanRowProps) {
  const { toggleTodoItem, deleteTodoItem, archiveTodoItem, convertTodoToTask, showToast } = useTaskStore();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const subtasks = item.subtasks ?? [];

  const handleConvert = () => {
    convertTodoToTask(item.id);
    showToast('Convertido para tarefa!');
  };

  return (
    <div style={{ borderBottom: expanded ? '1px solid var(--b1)' : 'none' }}>
      <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('todoId', item.id); }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 14px', cursor: 'grab', transition: 'background .12s', background: hovered ? 'var(--s2)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(o => !o)}
          aria-label={subtasks.length > 0 ? (expanded ? 'Recolher subtarefas' : 'Expandir subtarefas') : 'Subtarefas'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
            color: subtasks.length > 0 ? 'var(--t3)' : 'transparent', marginTop: 1, flexShrink: 0, transition: 'color .15s',
            transform: expanded ? 'rotate(90deg)' : 'none',
          }}
          title={subtasks.length > 0 ? (expanded ? 'Recolher' : 'Expandir subtarefas') : undefined}
        >
          <FiExpand size={9} />
        </button>

        {/* Check circle */}
        <button
          onClick={() => toggleTodoItem(item.id)}
          aria-label={colId === 'done' ? 'Desmarcar tarefa' : 'Marcar como feito'}
          style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            background: colId === 'done' ? '#30d158' : 'transparent',
            border: `1.5px solid ${colColor}`,
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          {colId === 'done' && <FiCheck size={8} color="#fff" strokeWidth={3} />}
        </button>

        {/* Context dot */}
        <div style={{ marginTop: 3, flexShrink: 0 }}>
          <ContextDot context={item.context} />
        </div>

        {/* Text */}
        <span style={{
          flex: 1, fontSize: 12, color: colId === 'done' ? 'var(--t4)' : 'var(--t2)',
          lineHeight: 1.45, textDecoration: colId === 'done' ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}>
          {item.text}
        </span>

        {/* Subtask pill */}
        <SubTaskPill item={item} />

        {/* Convert to task button */}
        <button
          onClick={handleConvert}
          title="Converter para tarefa"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#356BFF',
            fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 5,
            display: hovered ? 'flex' : 'none', alignItems: 'center', gap: 2, flexShrink: 0,
            opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            whiteSpace: 'nowrap',
          }}>
          → Tarefa
        </button>

        {/* Archive / Delete */}
        {colId === 'done' ? (
          <button className="del-btn" onClick={() => archiveTodoItem(item.id)} title="Arquivar" aria-label="Arquivar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity .15s', flexShrink: 0 }}>
            <FiArchive size={10} />
          </button>
        ) : (
          <button className="del-btn" onClick={() => deleteTodoItem(item.id)} aria-label="Excluir"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity .15s', flexShrink: 0 }}>
            <FiX size={10} />
          </button>
        )}
      </div>

      {/* Subtask expand panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="subtasks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <SubTaskPanel item={item} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── List/Table Row (shared hover logic) ──────────────────────────────────────

interface ListRowProps {
  item: TodoItem;
  fontSize?: number;
}

function ListRow({ item, fontSize = 13 }: ListRowProps) {
  const { toggleTodoItem, deleteTodoItem, archiveTodoItem, convertTodoToTask, showToast } = useTaskStore();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const st = item.status as TodoItemStatus;
  const col = COLUMNS.find(c => c.id === st) ?? COLUMNS[1];

  const handleConvert = () => {
    convertTodoToTask(item.id);
    showToast('Convertido para tarefa!');
  };

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 0', borderBottom: '1px solid var(--b1)', transition: 'background .12s', background: hovered ? 'var(--s2)' : 'transparent' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(o => !o)}
          aria-label={(item.subtasks?.length ?? 0) > 0 ? (expanded ? 'Recolher subtarefas' : 'Expandir subtarefas') : 'Subtarefas'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
            color: (item.subtasks?.length ?? 0) > 0 ? 'var(--t3)' : 'transparent', flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s, color .15s',
          }}
        >
          <FiExpand size={9} />
        </button>

        <button onClick={() => toggleTodoItem(item.id)} aria-label={st === 'done' ? 'Desmarcar tarefa' : 'Marcar como feito'}
          style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: st === 'done' ? '#30d158' : 'transparent', border: `1.5px solid ${col.color}`, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
          {st === 'done' && <FiCheck size={8} color="#fff" strokeWidth={3} />}
        </button>

        <ContextDot context={item.context} />

        <span style={{ flex: 1, fontSize, color: st === 'done' ? 'var(--t4)' : 'var(--t1)', textDecoration: st === 'done' ? 'line-through' : 'none' }}>{item.text}</span>

        <SubTaskPill item={item} />

        <span style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }}>{item.date}</span>

        {/* Convert button */}
        {hovered && (
          <button onClick={handleConvert} title="Converter para tarefa"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#356BFF', fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
            → Tarefa
          </button>
        )}

        {st === 'done' ? (
          <button onClick={() => archiveTodoItem(item.id)} title="Arquivar" aria-label="Arquivar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity .15s', flexShrink: 0 }}>
            <FiArchive size={10} />
          </button>
        ) : (
          <button onClick={() => deleteTodoItem(item.id)} aria-label="Excluir"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: hovered ? 1 : 0, transition: 'opacity .15s', flexShrink: 0 }}>
            <FiX size={10} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="subtasks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <SubTaskPanel item={item} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function TodoPage() {
  const {
    todoItems, addTodoItem, toggleTodoItem, deleteTodoItem, archiveTodoItem,
    moveTodoItem, convertTodoToTask, showToast,
  } = useTaskStore();

  const [layout, setLayout] = useState<TodoLayout>('kanban');
  const [weekRef, setWeekRef] = useState(new Date());
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TodoItemStatus | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [contextFilter, setContextFilter] = useState<TodoContext | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('date-asc');
  const dragItemId = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const days = getWeekDays(weekRef);
  const weekStart = days[0];
  const weekEnd = days[6];
  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "d 'de' MMM, yyyy", { locale: ptBR })}`;
  const today = toDateStr(new Date());

  const LAYOUTS: { id: TodoLayout; icon: React.ReactNode; label: string }[] = [
    { id: 'kanban',   icon: <FiColumns size={13} />,  label: 'Kanban' },
    { id: 'calendar', icon: <FiCalendar size={13} />, label: 'Calendário' },
    { id: 'table',    icon: <FiGrid size={13} />,     label: 'Tabela' },
    { id: 'list',     icon: <FiList size={13} />,     label: 'Lista' },
  ];

  // Apply context filter + sort
  const filterAndSort = (items: TodoItem[]) => {
    let filtered = contextFilter ? items.filter(i => i.context === contextFilter) : items;
    return sortItems(filtered, sortMode);
  };

  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: 'date-asc',  label: 'Data ↑' },
    { id: 'date-desc', label: 'Data ↓' },
    { id: 'priority',  label: 'Prioridade' },
    { id: 'context',   label: 'Contexto' },
  ];

  // Stat chips data (used in header)
  const visibleIds = useVisibleWorkspaceIds();
  const activeAll = todoItems.filter(t => !t.archived && isInLens(t, visibleIds));
  const todoCount = activeAll.filter(t => t.status === 'todo').length;
  const doingCount = activeAll.filter(t => t.status === 'doing').length;
  const doneCount = activeAll.filter(t => t.status === 'done').length;
  const overdueCount = activeAll.filter(t => t.status !== 'done' && t.status !== 'standby' && t.date < today).length;
  const headerChips = [
    { label: 'A fazer', value: todoCount, color: '#ff9f0a', rgb: '255,159,10' },
    { label: 'Doing', value: doingCount, color: '#356BFF', rgb: '53,107,255' },
    { label: 'Feito', value: doneCount, color: '#30d158', rgb: '48,209,88' },
    ...(overdueCount > 0 ? [{ label: 'Atrasadas', value: overdueCount, color: '#ff453a', rgb: '255,69,58' }] : []),
  ];

  // Sidebar data
  const totalActive = activeAll.length;
  const todayItems = activeAll.filter(t => t.date === today && t.status !== 'standby');
  const todayDone = todayItems.filter(t => t.status === 'done').length;
  const overdueItems = activeAll.filter(t => t.status !== 'done' && t.status !== 'standby' && t.date < today).slice(0, 5);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Compact sticky header ── */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Abrir menu lateral"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}
            >
              <FiMenu size={14} />
            </button>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Pessoal</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>To Do</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {headerChips.map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}

          {/* Sort dropdown */}
          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
            style={{ fontSize: 11, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
            {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          {/* Layout switcher */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--s2)', borderRadius: 8, padding: 2, border: '1px solid var(--b2)' }}>
            {LAYOUTS.map(({ id, icon, label }) => (
              <button key={id} onClick={() => { setLayout(id); setAddingFor(null); }} title={label} aria-label={label}
                style={{ padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', background: layout === id ? 'var(--s1)' : 'transparent', color: layout === id ? 'var(--t1)' : 'var(--t4)', transition: 'all .15s' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-pane body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
        )}
        {/* Sidebar */}
        <aside style={{
          ...(isMobile ? {
            position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
            width: 280,
            background: 'var(--app-bg, #1c1c1e)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .25s ease',
            boxShadow: sidebarOpen ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          } : {
            width: 220,
            background: 'rgba(0,0,0,0.14)',
          }),
          flexShrink: 0,
          borderRight: '1px solid var(--b2)',
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu lateral"
              style={{ alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
            >
              <FiX size={13} />
            </button>
          )}
          {/* Card A — Contextos */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Contextos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => { setContextFilter(null); if (isMobile) setSidebarOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: !contextFilter ? 'var(--s2)' : 'transparent', border: 'none', cursor: 'pointer', color: !contextFilter ? 'var(--t1)' : 'var(--t4)', fontSize: 11, fontWeight: !contextFilter ? 600 : 400, textAlign: 'left', transition: 'all .12s' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t4)' }} />
                Todos
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t4)' }}>{totalActive}</span>
              </button>
              {CONTEXTS.map(c => {
                const count = activeAll.filter(t => t.context === c.id).length;
                const active = contextFilter === c.id;
                return (
                  <button key={c.id} onClick={() => { setContextFilter(active ? null : c.id); if (isMobile) setSidebarOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: active ? `${c.color}18` : 'transparent', border: active ? `1px solid ${c.color}40` : '1px solid transparent', cursor: 'pointer', color: active ? c.color : 'var(--t3)', fontSize: 11, fontWeight: active ? 600 : 400, textAlign: 'left', transition: 'all .12s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                    {c.label}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: active ? c.color : 'var(--t4)', fontWeight: 700 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card B — Distribuição */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Distribuição</div>
            {COLUMNS.map(col => {
              const count = activeAll.filter(t => t.status === col.id).length;
              const pct = totalActive > 0 ? (count / totalActive) * 100 : 0;
              const colColor = col.color === 'var(--t4)' ? '#636366' : col.color;
              return (
                <div key={col.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: colColor }} />
                      {col.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? (col.color === 'var(--t4)' ? 'var(--t3)' : col.color) : 'var(--t4)' }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colColor, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card C — Hoje */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid rgba(53,107,255,0.25)', padding: '12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#356BFF' }}>📅 Hoje</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#356BFF' }}>{todayDone}/{todayItems.length}</span>
            </div>
            {todayItems.length > 0 ? (
              <>
                <div style={{ height: 4, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${todayItems.length > 0 ? (todayDone / todayItems.length) * 100 : 0}%`, background: '#356BFF', borderRadius: 2, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                  {todayItems.length === todayDone ? 'Tudo feito! ✨' : `${todayItems.length - todayDone} restante${todayItems.length - todayDone !== 1 ? 's' : ''}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>Nada agendado pra hoje</div>
            )}
          </div>

          {/* Card D — Atrasadas (only if any) */}
          {overdueItems.length > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid rgba(255,69,58,0.25)', padding: '12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#ff453a' }}>⚠ Atrasadas</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ff453a' }}>{overdueItems.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {overdueItems.map(item => {
                  const col = COLUMNS.find(c => c.id === item.status) ?? COLUMNS[1];
                  const colColor = col.color === 'var(--t4)' ? '#636366' : col.color;
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, background: 'rgba(255,69,58,0.05)' }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: colColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#ff453a', flexShrink: 0 }}>{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '14px 18px 18px' }}>
          {totalActive === 0 && !contextFilter && layout === 'list' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Lista limpa por aqui</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                Capture a próxima coisa pra fazer clicando em "+ Adicionar" em qualquer coluna.
              </div>
            </div>
          )}
          {/* ══ KANBAN ══════════════════════════════════════════════════════════════ */}
          {layout === 'kanban' && (
            <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden' }}>
              {COLUMNS.map(col => {
                const rawItems = todoItems.filter(t => t.status === col.id && !t.archived);
                const items = filterAndSort(rawItems);
                const isAdding = addingFor === col.id;
                const isDragOver = dragOverCol === col.id;
                const colColor = col.color === 'var(--t4)' ? '#636366' : col.color;

                return (
                  <div key={col.id}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden',
                      minWidth: 0, position: 'relative',
                      transition: 'background .15s, border-color .15s',
                      ...(isDragOver ? { background: `${colColor}10`, borderColor: `${colColor}55` } : {}),
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => {
                      e.preventDefault();
                      const id = dragItemId.current ?? e.dataTransfer.getData('todoId');
                      if (id) moveTodoItem(id, col.id);
                      setDragOverCol(null);
                      dragItemId.current = null;
                    }}
                  >
                    {/* Top accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colColor, boxShadow: `0 0 12px ${colColor}66` }} />

                    {/* Column header */}
                    <div style={{ padding: '14px 14px 10px', flexShrink: 0, borderBottom: '1px solid var(--b1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: colColor, flexShrink: 0, boxShadow: `0 0 6px ${colColor}aa` }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t1)', flex: 1 }}>{col.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: items.length > 0 ? colColor : 'var(--t4)', background: items.length > 0 ? `${colColor}18` : 'transparent', borderRadius: 99, padding: '1px 7px' }}>{items.length}</span>
                      </div>
                    </div>

                    {/* Body — clickable empty space triggers add */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '6px 0 0' }}>
                        {items.map(item => (
                          <KanbanRow key={item.id} item={item} colId={col.id} colColor={col.color} />
                        ))}
                        {isAdding && (
                          <AddRow
                            showMeta
                            onSave={(text, ctx, pri) => { addTodoItem(text, today, col.id, ctx, pri); setAddingFor(null); }}
                            onCancel={() => setAddingFor(null)}
                          />
                        )}
                      </div>
                      {!isAdding && (
                        <button
                          onClick={() => setAddingFor(col.id)}
                          title="Clique para adicionar"
                          style={{
                            flex: 1, minHeight: 60, cursor: 'pointer',
                            background: 'transparent', border: 'none',
                            color: 'var(--t4)', fontSize: 12,
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                            padding: '10px 14px', textAlign: 'left',
                            transition: 'background .15s, color .15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${colColor}08`; (e.currentTarget as HTMLElement).style.color = colColor; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                        >
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ CALENDAR ════════════════════════════════════════════════════════════ */}
          {layout === 'calendar' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 0 }}>
              {/* Week nav */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <button onClick={() => setWeekRef(d => subWeeks(d, 1))} aria-label="Semana anterior" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 6, borderRadius: 8, display: 'flex', transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                  <FiChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', minWidth: 240, textAlign: 'center' }}>{weekLabel}</span>
                <button onClick={() => setWeekRef(d => addWeeks(d, 1))} aria-label="Próxima semana" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 6, borderRadius: 8, display: 'flex', transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                  <FiChevronRight size={16} />
                </button>
                <button onClick={() => setWeekRef(new Date())} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t2)', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--s1)')}>
                  Hoje
                </button>
              </div>

              {/* Calendar grid */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--s1)', borderRadius: 16, border: '1px solid var(--b2)', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, minHeight: 0 }}>
                  {days.map((day, i) => {
                    const dateStr = toDateStr(day);
                    const isDay = isToday(day);
                    const rawItems = todoItems.filter(t => t.date === dateStr && t.status !== 'standby' && !t.archived);
                    const items = filterAndSort(rawItems);
                    const isAdding = addingFor === dateStr;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', borderRight: i < 6 ? '1px solid var(--b1)' : 'none', minHeight: 0 }}>
                        <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: isDay ? '#356BFF' : 'var(--t4)', marginBottom: 3 }}>{DAY_LABELS[i]}</div>
                          <div style={{ fontSize: 20, fontWeight: 300, color: isDay ? '#356BFF' : 'var(--t2)', lineHeight: 1 }}>{format(day, 'd')}</div>
                          {isDay && <div style={{ height: 2, background: '#356BFF', borderRadius: 1, marginTop: 5 }} />}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 6px' }}>
                          {items.map(item => {
                            const st = item.status as TodoItemStatus;
                            const col = COLUMNS.find(c => c.id === st) ?? COLUMNS[1];
                            return (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 12px', opacity: st === 'done' ? 0.45 : 1, transition: 'opacity .15s' }}
                                onMouseEnter={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '1'; const cv = e.currentTarget.querySelector<HTMLButtonElement>('.cv-btn'); if (cv) cv.style.display = 'flex'; }}
                                onMouseLeave={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '0'; const cv = e.currentTarget.querySelector<HTMLButtonElement>('.cv-btn'); if (cv) cv.style.display = 'none'; }}>
                                <button onClick={() => toggleTodoItem(item.id)} aria-label={st === 'done' ? 'Desmarcar tarefa' : 'Marcar como feito'}
                                  style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0, background: st === 'done' ? '#30d158' : 'transparent', border: `1.5px solid ${col.color}`, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                                  {st === 'done' && <FiCheck size={7} color="#fff" strokeWidth={3} />}
                                </button>
                                <ContextDot context={item.context} />
                                <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)', lineHeight: 1.4, textDecoration: st === 'done' ? 'line-through' : 'none', wordBreak: 'break-word' }}>{item.text}</span>
                                <SubTaskPill item={item} />
                                <button className="cv-btn" onClick={() => { convertTodoToTask(item.id); showToast('Convertido para tarefa!'); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#356BFF', fontSize: 9, fontWeight: 600, padding: 0, display: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  → Tarefa
                                </button>
                                {st === 'done' ? (
                                  <button className="del-btn" onClick={() => archiveTodoItem(item.id)} title="Arquivar" aria-label="Arquivar"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
                                    <FiArchive size={10} />
                                  </button>
                                ) : (
                                  <button className="del-btn" onClick={() => deleteTodoItem(item.id)} aria-label="Excluir"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
                                    <FiX size={10} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {isAdding && (
                            <AddRow
                              onSave={(text, ctx, pri) => { addTodoItem(text, dateStr, undefined, ctx, pri); setAddingFor(null); }}
                              onCancel={() => setAddingFor(null)}
                            />
                          )}
                        </div>
                        {!isAdding && (
                          <button onClick={() => setAddingFor(dateStr)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 11, transition: 'color .15s', flexShrink: 0, textAlign: 'left' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
                            + Adicionar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stand-by box */}
              {(() => {
                const standbyItems = filterAndSort(todoItems.filter(t => t.status === 'standby'));
                const [addingStandby, setAddingStandby] = [addingFor === '__standby__', (v: boolean) => setAddingFor(v ? '__standby__' : null)];
                return (
                  <div style={{ flex: '0 0 28%', background: 'var(--s1)', borderRadius: 16, border: '1px solid var(--b2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px', borderBottom: standbyItems.length > 0 || addingStandby ? '1px solid var(--b1)' : 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', flex: 1 }}>Stand-by</span>
                      <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--s2)', borderRadius: 99, padding: '1px 8px' }}>{standbyItems.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: standbyItems.length > 0 || addingStandby ? '8px 16px 10px' : '0' }}>
                      {standbyItems.map(item => (
                        <div key={item.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, background: 'var(--s2)', cursor: 'default' }}
                          onMouseEnter={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '1'; }}
                          onMouseLeave={e => { const d = e.currentTarget.querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '0'; }}>
                          <ContextDot context={item.context} />
                          {!item.context && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--t4)', flexShrink: 0 }} />}
                          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{item.text}</span>
                          <button className="del-btn" onClick={() => deleteTodoItem(item.id)} aria-label="Excluir"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0, display: 'flex', opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
                            <FiX size={9} />
                          </button>
                        </div>
                      ))}
                      {addingStandby ? (
                        <AddRow
                          placeholder="Novo item stand-by..."
                          onSave={(text, ctx, pri) => { addTodoItem(text, today, 'standby', ctx, pri); setAddingFor(null); }}
                          onCancel={() => setAddingFor(null)}
                        />
                      ) : (
                        <button onClick={() => setAddingStandby(true)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 99, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══ TABLE ════════════════════════════════════════════════════════════════ */}
          {layout === 'table' && (
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
              <div style={{ background: 'var(--s1)', borderRadius: 16, border: '1px solid var(--b2)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', width: 28, borderBottom: '1px solid var(--b1)' }} />
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', borderBottom: '1px solid var(--b1)' }}>Tarefa</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', width: 80, borderBottom: '1px solid var(--b1)' }}>Contexto</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', width: 130, borderBottom: '1px solid var(--b1)' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', width: 110, borderBottom: '1px solid var(--b1)' }}>Data</th>
                      <th style={{ width: 36, borderBottom: '1px solid var(--b1)' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filterAndSort(todoItems.filter(t => !t.archived)).map(item => {
                      const st = item.status as TodoItemStatus;
                      const col = COLUMNS.find(c => c.id === st) ?? COLUMNS[1];
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--b1)', transition: 'background .12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; const d = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '1'; const cv = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.cv-btn'); if (cv) cv.style.display = 'inline-flex'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; const d = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '0'; const cv = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.cv-btn'); if (cv) cv.style.display = 'none'; }}>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => toggleTodoItem(item.id)} aria-label={st === 'done' ? 'Desmarcar tarefa' : 'Marcar como feito'}
                              style={{ width: 14, height: 14, borderRadius: '50%', background: st === 'done' ? '#30d158' : 'transparent', border: `1.5px solid ${col.color}`, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                              {st === 'done' && <FiCheck size={8} color="#fff" strokeWidth={3} />}
                            </button>
                          </td>
                          <td style={{ padding: '10px 14px', color: st === 'done' ? 'var(--t4)' : 'var(--t1)', textDecoration: st === 'done' ? 'line-through' : 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.text}
                              <SubTaskPill item={item} />
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {item.context ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: CONTEXT_COLOR[item.context], display: 'inline-block' }} />
                                <span style={{ fontSize: 11, color: CONTEXT_COLOR[item.context], fontWeight: 500, textTransform: 'capitalize' }}>{item.context}</span>
                              </span>
                            ) : <span style={{ color: 'var(--t4)', fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: col.color === 'var(--t4)' ? 'var(--s2)' : `${col.color}20`, color: col.color }}>{col.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--t4)', fontSize: 11 }}>{item.date}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <button className="cv-btn" onClick={() => { convertTodoToTask(item.id); showToast('Convertido para tarefa!'); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#356BFF', fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 5, display: 'none', whiteSpace: 'nowrap' }}>
                                → Tarefa
                              </button>
                              {st === 'done' ? (
                                <button className="del-btn" onClick={() => archiveTodoItem(item.id)} title="Arquivar" aria-label="Arquivar"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .15s' }}>
                                  <FiArchive size={10} />
                                </button>
                              ) : (
                                <button className="del-btn" onClick={() => deleteTodoItem(item.id)} aria-label="Excluir"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .15s' }}>
                                  <FiX size={10} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {addingFor === 'table' && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <AddRow
                            showMeta
                            onSave={(text, ctx, pri) => { addTodoItem(text, today, undefined, ctx, pri); setAddingFor(null); }}
                            onCancel={() => setAddingFor(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {addingFor !== 'table' && (
                  <button onClick={() => setAddingFor('table')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
                    + Adicionar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ LIST ════════════════════════════════════════════════════════════════ */}
          {layout === 'list' && !(totalActive === 0 && !contextFilter) && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {COLUMNS.map(col => {
                const rawItems = todoItems.filter(t => t.status === col.id && !t.archived);
                const items = filterAndSort(rawItems);
                const isAdding = addingFor === col.id;
                const colColor = col.color === 'var(--t4)' ? '#636366' : col.color;
                return (
                  <div key={col.id} style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: colColor }} />
                    <div style={{ padding: '12px 14px 10px 17px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t1)', flex: 1 }}>{col.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: items.length > 0 ? colColor : 'var(--t4)', background: items.length > 0 ? `${colColor}18` : 'transparent', borderRadius: 99, padding: '1px 7px' }}>{items.length}</span>
                    </div>
                    <div style={{ paddingLeft: 14 }}>
                      {items.map(item => (
                        <ListRow key={item.id} item={item} />
                      ))}
                      {isAdding && (
                        <AddRow
                          showMeta
                          onSave={(text, ctx, pri) => { addTodoItem(text, today, col.id, ctx, pri); setAddingFor(null); }}
                          onCancel={() => setAddingFor(null)}
                        />
                      )}
                      {!isAdding && (
                        <button onClick={() => setAddingFor(col.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = colColor)}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ ARCHIVED ════════════════════════════════════════════════════════════ */}
          {(() => {
            const archived = todoItems.filter(t => t.archived);
            if (archived.length === 0) return null;
            return (
              <div style={{ flexShrink: 0, marginTop: 12 }}>
                <button
                  onClick={() => setShowArchived(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background .15s' }}
                >
                  <FiArchive size={12} style={{ color: 'var(--t4)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', flex: 1 }}>Arquivadas</span>
                  <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--s2)', borderRadius: 99, padding: '1px 8px' }}>{archived.length}</span>
                  <FiChevronDown size={12} style={{ color: 'var(--t4)', transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginRight: 2 }} />
                </button>
                {showArchived && (
                  <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', overflow: 'hidden', marginTop: 6 }}>
                    {archived.map(item => (
                      <div key={item.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--b1)', transition: 'background .12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; const d = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '1'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; const d = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.del-btn'); if (d) d.style.opacity = '0'; }}>
                        <div style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0, background: '#30d15840', border: '1.5px solid #30d158', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FiCheck size={7} color="#30d158" strokeWidth={3} />
                        </div>
                        <ContextDot context={item.context} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--t4)', textDecoration: 'line-through' }}>{item.text}</span>
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>{item.date}</span>
                        <button className="del-btn" onClick={() => deleteTodoItem(item.id)} title="Excluir" aria-label="Excluir"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}>
                          <FiX size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
