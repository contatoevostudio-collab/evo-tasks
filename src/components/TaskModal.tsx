import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiTrash2, FiCalendar, FiImage, FiSmartphone,
  FiLayers, FiFilm, FiMonitor, FiEdit3, FiCopy,
  FiPlus, FiCheck, FiArchive, FiClock,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { playAdd, playDelete, playCheck } from '../lib/sounds';
import type { Task, TaskStatus, TaskType, Priority, SubTask, ArtVersion } from '../types';
import { getTaskTitle } from '../types';
import { useTaskStore } from '../store/tasks';

interface Props {
  task?: Task | null;
  defaultDate?: string;
  onClose: () => void;
  onOpenTask?: (task: Task) => void;  // #18 — abrir modal do duplicado
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  doing: 'Em Andamento',
  done: 'Concluído',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#ff9f0a',
  doing: '#356BFF',
  done: '#30d158',
};

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'alta',  label: 'Alta',  color: '#ff453a' },
  { value: 'media', label: 'Média', color: '#ff9f0a' },
  { value: 'baixa', label: 'Baixa', color: '#64C4FF' },
];

interface TaskTypeOption { id: TaskType; label: string; Icon: React.ElementType }
const TASK_TYPES: TaskTypeOption[] = [
  { id: 'feed',      label: 'Feed',      Icon: FiImage },
  { id: 'story',     label: 'Story',     Icon: FiSmartphone },
  { id: 'carrossel', label: 'Carrossel', Icon: FiLayers },
  { id: 'reels',     label: 'Reels',     Icon: FiFilm },
  { id: 'thumb',     label: 'Thumb',     Icon: FiMonitor },
  { id: 'outro',     label: 'Outro',     Icon: FiEdit3 },
];

const SEQUENCE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'var(--t3)',
  marginBottom: 10, display: 'block',
};

const COLOR_PRESETS = [
  null, // usar cor da empresa
  '#30d158', '#ff9f0a', '#ff453a', '#bf5af2',
  '#356BFF', '#64C4FF', '#ff6b6b', '#ffd60a',
];

export function TaskModal({ task, defaultDate, onClose, onOpenTask }: Props) {
  const {
    companies, subClients, addTask, updateTask, deleteTask,
    nextSequence, addSubClient, toggleArchive,
    addSubTask, toggleSubTask, deleteSubTask,
    tasks, theme,
  } = useTaskStore();

  const isLight = theme.startsWith('light');
  const colorScheme = isLight ? 'light' : 'dark';

  // Form state
  const [companyId,    setCompanyId]    = useState(task?.companyId ?? '');
  const [subClientId,  setSubClientId]  = useState(task?.subClientId ?? '');
  const [taskType,     setTaskType]     = useState<TaskType | ''>(task?.taskType ?? '');
  const [customType,   setCustomType]   = useState(task?.customType ?? '');
  const [date,         setDate]         = useState(task?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [deadline,     setDeadline]     = useState(task?.deadline ?? '');
  const [time,         setTime]         = useState(task?.time ?? '');
  const [status,       setStatus]       = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority,     setPriority]     = useState<Priority | undefined>(task?.priority);
  const [notes,        setNotes]        = useState(task?.notes ?? '');
  const [inbox,        setInbox]        = useState(task?.inbox ?? false);
  const [sequence,     setSequence]     = useState<number>(task?.sequence ?? 0);
  const [tags,         setTags]         = useState<string[]>(task?.tags ?? []);
  const [tagInput,     setTagInput]     = useState('');
  const [estimate,     setEstimate]     = useState<number | ''>(task?.estimate ?? '');
  const [colorOverride, setColorOverride] = useState<string | undefined>(task?.colorOverride);
  const [newSubClientName,  setNewSubClientName]  = useState('');
  const [showNewSubClient,  setShowNewSubClient]  = useState(false);
  const [subSearch,    setSubSearch]    = useState('');   // #15
  const [seqInitialized, setSeqInitialized] = useState(!!task);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAdvanced, setShowAdvanced]  = useState(false);
  const [newSubtaskLabel, setNewSubtaskLabel] = useState('');
  // Creative fields
  const [copy,        setCopy]        = useState(task?.copy ?? '');
  const [hookIdea,    setHookIdea]    = useState(task?.hookIdea ?? '');
  const [references,  setReferences]  = useState<string[]>(task?.references ?? []);
  const [refInput,    setRefInput]    = useState('');
  const [versions,    setVersions]    = useState(task?.versions ?? []);
  const [newVerNotes, setNewVerNotes] = useState('');

  const filteredSubClients = subClients
    .filter(s => s.companyId === companyId)
    .filter(s => subSearch === '' || s.name.toLowerCase().includes(subSearch.toLowerCase()));

  const company = companies.find(c => c.id === companyId);
  const companyColor = company?.color ?? '#636366';

  // Existing task subtasks from store (always fresh)
  const liveTask = task ? tasks.find(t => t.id === task.id) : null;
  const subtasks: SubTask[] = liveTask?.subtasks ?? task?.subtasks ?? [];

  // Reset subclient when company changes
  useEffect(() => {
    if (!task) { setSubClientId(''); setSubSearch(''); }
  }, [companyId, task]);

  useEffect(() => {
    if (!task) setTaskType('');
  }, [subClientId, task]);

  useEffect(() => {
    if (!task && !seqInitialized && companyId && subClientId && taskType) {
      setSequence(nextSequence(companyId, subClientId, taskType as TaskType));
      setSeqInitialized(true);
    }
  }, [companyId, subClientId, taskType, task, seqInitialized, nextSequence]);

  useEffect(() => {
    if (!task) setSeqInitialized(false);
  }, [taskType, task]);

  const canSave = companyId !== '' && subClientId !== '' && taskType !== '';

  const buildPayload = () => ({
    companyId,
    subClientId,
    taskType: taskType as TaskType,
    customType: taskType === 'outro' ? customType : undefined,
    sequence,
    date,
    inbox: inbox || undefined,
    deadline: deadline || undefined,
    time: time || undefined,
    status,
    priority,
    notes: notes.trim() || undefined,
    copy: copy.trim() || undefined,
    hookIdea: hookIdea.trim() || undefined,
    references: references.length > 0 ? references : undefined,
    versions: versions.length > 0 ? versions : undefined,
    allDay: !time,
    tags: tags.length > 0 ? tags : undefined,
    estimate: estimate !== '' ? Number(estimate) : undefined,
    colorOverride: colorOverride || undefined,
    subtasks: task ? liveTask?.subtasks : undefined,
  });

  const handleSave = () => {
    if (!canSave) return;
    if (task) {
      updateTask(task.id, buildPayload());
    } else {
      addTask(buildPayload() as Omit<Task, 'id'>);
      playAdd();
    }
    onClose();
  };

  // #16 — Salvar e criar próxima
  const handleSaveAndNext = () => {
    if (!canSave) return;
    addTask(buildPayload() as Omit<Task, 'id'>);
    playAdd();
    // Reset only date/status/sequence, keep company/subclient/type
    const nextSeq = nextSequence(companyId, subClientId, taskType as TaskType);
    setSequence(nextSeq);
    setStatus('todo');
    setNotes('');
    setTags([]);
    setDeadline('');
    setTime('');
    setSeqInitialized(true);
  };

  // #18 — Duplicar e abrir modal do clone
  const handleDuplicate = () => {
    if (!task) return;
    const nextSeq = nextSequence(task.companyId, task.subClientId, task.taskType);
    const newId = addTask({
      ...buildPayload() as Omit<Task, 'id'>,
      sequence: nextSeq,
      status: 'todo',
      subtasks: [],
    });
    onClose();
    if (onOpenTask) {
      const newTask = { ...buildPayload(), id: newId, sequence: nextSeq, status: 'todo' as TaskStatus, subtasks: [], createdAt: new Date().toISOString() } as Task;
      setTimeout(() => onOpenTask(newTask), 80);
    }
  };

  const handleDelete = () => {
    if (task) { deleteTask(task.id); playDelete(); onClose(); }
  };

  const handleAddSubClient = () => {
    const name = newSubClientName.trim();
    if (!name || !companyId) return;
    addSubClient({ name, companyId });
    setNewSubClientName('');
    setShowNewSubClient(false);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const handleAddSubtask = () => {
    const label = newSubtaskLabel.trim();
    if (!label || !task) return;
    addSubTask(task.id, label);
    setNewSubtaskLabel('');
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Live title preview
  const previewTitle = (() => {
    if (!companyId && !subClientId && !taskType) return null;
    const fakeTask: Task = {
      id: '', companyId: companyId || '?', subClientId: subClientId || '?',
      taskType: (taskType || 'feed') as TaskType, customType, sequence, date, status,
    };
    return getTaskTitle(fakeTask, companies, subClients);
  })();

  // Sequence count info (#19)
  const existingCount = (companyId && subClientId && taskType)
    ? tasks.filter(t => t.companyId === companyId && t.subClientId === subClientId && t.taskType === taskType && t.id !== task?.id).length
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-lg mx-4 rounded-[20px] overflow-hidden shadow-2xl"
          style={{ background: 'var(--modal-bg)', border: '1px solid var(--b2)' }}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          {/* Top accent bar */}
          <div style={{ height: 3, background: colorOverride ?? companyColor, opacity: 0.8 }} />

          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>
                  {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                  {/* #17 — data de criação */}
                  {task?.createdAt && (
                    <span style={{ marginLeft: 8, fontWeight: 400, letterSpacing: '1px', color: 'var(--t4)' }}>
                      · criado {format(parseISO(task.createdAt), "d MMM yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
                {/* Live title preview */}
                <div style={{
                  background: 'var(--s1)', border: '1px solid var(--b1)',
                  borderRadius: 10, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12,
                  color: previewTitle ? 'var(--t1)' : 'var(--t4)',
                  letterSpacing: '0.02em', minHeight: 36, display: 'flex', alignItems: 'center',
                }}>
                  {previewTitle ?? '[ ? ] ? [ ? ]'}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'var(--s1)', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 8, borderRadius: 8, marginTop: 28, transition: 'color .15s, background .15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* 1 · EMPRESA */}
            <div>
              <span style={labelStyle}>1 · Empresa</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {companies.map((c) => (
                  <button key={c.id} onClick={() => setCompanyId(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                    background: companyId === c.id ? `${c.color}22` : 'var(--s1)',
                    border: `1px solid ${companyId === c.id ? c.color : 'var(--b2)'}`,
                    color: companyId === c.id ? 'var(--t1)' : 'var(--t3)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 · SUBCLIENT */}
            {companyId && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <span style={labelStyle}>2 · Subclient</span>
                {/* #15 — search */}
                {subClients.filter(s => s.companyId === companyId).length > 4 && (
                  <input
                    value={subSearch}
                    onChange={e => setSubSearch(e.target.value)}
                    placeholder="Buscar subclient..."
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 8,
                      background: 'var(--ib)', border: '1px solid var(--b2)',
                      borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none',
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {filteredSubClients.map((s) => (
                    <button key={s.id} onClick={() => setSubClientId(s.id)} style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                      background: subClientId === s.id ? `${companyColor}22` : 'var(--s1)',
                      border: `1px solid ${subClientId === s.id ? companyColor : 'var(--b2)'}`,
                      color: subClientId === s.id ? 'var(--t1)' : 'var(--t3)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      {s.name}
                    </button>
                  ))}

                  {showNewSubClient ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        autoFocus value={newSubClientName} onChange={e => setNewSubClientName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSubClient(); if (e.key === 'Escape') setShowNewSubClient(false); }}
                        placeholder="Nome..."
                        style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, width: 110, background: 'var(--ib)', border: '1px solid var(--b3)', color: 'var(--t1)', outline: 'none' }}
                      />
                      <button onClick={handleAddSubClient} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: companyColor, border: 'none', color: '#fff', cursor: 'pointer' }}>OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewSubClient(true)}
                      style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, background: 'transparent', border: '1px dashed var(--b3)', color: 'var(--t4)', cursor: 'pointer', transition: 'all .15s' }}
                    >
                      + Novo
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3 · TIPO */}
            {subClientId && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <span style={labelStyle}>3 · Tipo</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {TASK_TYPES.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setTaskType(id)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '12px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                      background: taskType === id ? `${companyColor}20` : 'var(--s1)',
                      border: `1px solid ${taskType === id ? companyColor : 'var(--b1)'}`,
                      color: taskType === id ? companyColor : 'var(--t3)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      <Icon size={17} />
                      {label}
                    </button>
                  ))}
                </div>
                {taskType === 'outro' && (
                  <motion.input
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    value={customType} onChange={e => setCustomType(e.target.value)}
                    placeholder="Nome do tipo personalizado..."
                    style={{ width: '100%', marginTop: 8, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </motion.div>
            )}

            {/* 4 · SEQUÊNCIA */}
            {taskType && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>4 · Sequência</span>
                  {/* #19 — contagem existente */}
                  {existingCount > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500 }}>
                      {existingCount} tarefa{existingCount > 1 ? 's' : ''} deste tipo
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {SEQUENCE_OPTIONS.map((n) => (
                    <button key={n} onClick={() => setSequence(n)} style={{
                      padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: sequence === n ? `${companyColor}25` : 'var(--s1)',
                      border: `1px solid ${sequence === n ? companyColor : 'var(--b2)'}`,
                      color: sequence === n ? companyColor : 'var(--t3)',
                      cursor: 'pointer', transition: 'all .15s', minWidth: 32, textAlign: 'center',
                    }}>
                      {n === 0 ? '—' : String(n).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5 · PRIORIDADE */}
            {taskType && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <span style={labelStyle}>5 · Prioridade</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <button key={p.value} onClick={() => setPriority(priority === p.value ? undefined : p.value)} style={{
                      padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: priority === p.value ? `${p.color}25` : 'var(--s1)',
                      border: `1px solid ${priority === p.value ? p.color : 'var(--b2)'}`,
                      color: priority === p.value ? p.color : 'var(--t3)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Date, Status, Notes */}
            {taskType && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                style={{ borderTop: '1px solid var(--b1)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {/* Inbox toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={inbox} onChange={e => setInbox(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#356BFF', cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: inbox ? '#64C4FF' : 'var(--t3)', fontWeight: inbox ? 600 : 400 }}>
                    Inbox — sem data definida
                  </span>
                </label>

                {/* Dates row */}
                {!inbox && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiCalendar size={10} /> Data de Produção
                    </label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  {/* #6 — deadline */}
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiClock size={10} /> Prazo de Entrega
                    </label>
                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: deadline ? '#ff9f0a' : 'var(--t3)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                )}

                {/* #7 — time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <span style={labelStyle}>Horário</span>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: time ? 'var(--t1)' : 'var(--t3)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  {/* #11 — estimate */}
                  <div>
                    <span style={labelStyle}>Estimativa (min)</span>
                    <input
                      type="number" min={0} step={15}
                      value={estimate} onChange={e => setEstimate(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 90"
                      style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Status — #20 ciclo visual */}
                <div>
                  <span style={labelStyle}>Status</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <button key={s} onClick={() => setStatus(s)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 500,
                        background: status === s ? `${STATUS_COLORS[s]}22` : 'var(--s1)',
                        border: `1px solid ${status === s ? STATUS_COLORS[s] : 'var(--b2)'}`,
                        color: status === s ? STATUS_COLORS[s] : 'var(--t3)',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <span style={labelStyle}>Notas</span>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Adicione notas, URLs ou referências..." rows={3} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'none' }} />
                </div>

                {/* #8 — Tags */}
                <div>
                  <span style={labelStyle}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {tags.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999, fontSize: 11,
                        background: `${companyColor}18`, border: `1px solid ${companyColor}44`,
                        color: companyColor,
                      }}>
                        {tag}
                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        value={tagInput} onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        placeholder="+ tag..."
                        style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, width: 80, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(s => !s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 11, textAlign: 'left', padding: 0, transition: 'color .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                >
                  {showAdvanced ? '▲ Ocultar avançado' : '▼ Opções avançadas'}
                </button>

                {/* Creative fields (copy, hook, refs, versions) */}
                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Copy / Legenda */}
                    <div>
                      <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✏️ Legenda / Copy
                      </span>
                      <textarea value={copy} onChange={e => setCopy(e.target.value)}
                        placeholder="Texto do post, legenda, caption..."
                        rows={3}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Hook Idea — only for reels */}
                    {taskType === 'reels' && (
                      <div>
                        <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                          🎬 Ideia de Hook
                        </span>
                        <textarea value={hookIdea} onChange={e => setHookIdea(e.target.value)}
                          placeholder="Primeiros segundos do vídeo, gancho de atenção..."
                          rows={2}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>
                    )}

                    {/* References / Moodboard URLs */}
                    <div>
                      <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                        🖼️ Referências / Moodboard
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                        {references.map((url, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', borderRadius: 7, padding: '5px 8px' }}>
                            <span style={{ flex: 1, fontSize: 11, color: '#64C4FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                            <button onClick={() => setReferences(prev => prev.filter((_, idx) => idx !== i))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, transition: 'color .15s', flexShrink: 0 }}
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                            ><FiX size={10} /></button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <input
                          value={refInput} onChange={e => setRefInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && refInput.trim()) { e.preventDefault(); setReferences(prev => [...prev, refInput.trim()]); setRefInput(''); } }}
                          placeholder="Cole uma URL de referência..."
                          style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                        />
                        <button onClick={() => { if (refInput.trim()) { setReferences(prev => [...prev, refInput.trim()]); setRefInput(''); } }}
                          style={{ padding: '6px 12px', borderRadius: 8, background: companyColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          <FiPlus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Art versioning */}
                    {task && (
                      <div>
                        <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                          📦 Versões da Arte
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                          {versions.map((v, i) => (
                            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--s1)', borderRadius: 7, padding: '6px 10px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: companyColor, flexShrink: 0 }}>{v.label}</span>
                              <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notes || '—'}</span>
                              <span style={{ fontSize: 9, color: 'var(--t4)', flexShrink: 0 }}>
                                {format(parseISO(v.createdAt), 'd/M')}
                              </span>
                              <button onClick={() => setVersions(prev => prev.filter((_, idx) => idx !== i))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, transition: 'color .15s', flexShrink: 0 }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                              ><FiX size={10} /></button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input value={newVerNotes} onChange={e => setNewVerNotes(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const label = `v${versions.length + 1}`; setVersions(prev => [...prev, { id: crypto.randomUUID(), label, notes: newVerNotes.trim() || undefined, createdAt: new Date().toISOString() } as ArtVersion]); setNewVerNotes(''); } }}
                            placeholder={`Registrar ${`v${versions.length + 1}`} (notas opcionais)...`}
                            style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                          />
                          <button onClick={() => { const label = `v${versions.length + 1}`; setVersions(prev => [...prev, { id: crypto.randomUUID(), label, notes: newVerNotes.trim() || undefined, createdAt: new Date().toISOString() } as ArtVersion]); setNewVerNotes(''); }}
                            style={{ padding: '6px 12px', borderRadius: 8, background: companyColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <FiPlus size={12} />
                          </button>
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* #12 color override + subtasks */}
                {showAdvanced && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Color override */}
                    <div>
                      <span style={labelStyle}>Cor da tarefa</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {COLOR_PRESETS.map((c, i) => (
                          <button key={i} onClick={() => setColorOverride(c ?? undefined)} style={{
                            width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                            background: c ?? companyColor,
                            border: (colorOverride === c || (!colorOverride && !c)) ? '2px solid var(--t1)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: c === null ? 0.5 : 1, transition: 'transform .15s',
                          }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.2)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
                          >
                            {(colorOverride === c || (!colorOverride && !c)) && <FiCheck size={9} color="#fff" />}
                          </button>
                        ))}
                      </div>
                      {!colorOverride && <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, display: 'block' }}>Usando cor da empresa</span>}
                    </div>

                    {/* Subtasks (#10) — only for existing tasks */}
                    {task && (
                      <div>
                        <span style={labelStyle}>Checklist</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                          {subtasks.map((st) => (
                            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: 'var(--s1)' }}>
                              <button onClick={() => { toggleSubTask(task.id, st.id); playCheck(); }} style={{
                                width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${st.done ? '#30d158' : 'var(--b3)'}`,
                                background: st.done ? '#30d15820' : 'transparent', cursor: 'pointer', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                              }}>
                                {st.done && <FiCheck size={9} color="#30d158" />}
                              </button>
                              <span style={{ flex: 1, fontSize: 12, color: st.done ? 'var(--t4)' : 'var(--t1)', textDecoration: st.done ? 'line-through' : 'none' }}>
                                {st.label}
                              </span>
                              <button onClick={() => deleteSubTask(task.id, st.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, transition: 'color .15s' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                              >
                                <FiX size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={newSubtaskLabel} onChange={e => setNewSubtaskLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                            placeholder="Nova etapa..."
                            style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                          />
                          <button onClick={handleAddSubtask} style={{ padding: '6px 12px', borderRadius: 8, background: companyColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <FiPlus size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              {task ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={handleDuplicate} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13, transition: 'color .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t3)')}
                    title="Duplicar com próxima sequência">
                    <FiCopy size={13} /> Duplicar
                  </button>
                  {/* #13 archive */}
                  <button onClick={() => { toggleArchive(task.id); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 13, transition: 'color .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#bf5af2')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                    title={task.archived ? 'Desarquivar' : 'Arquivar'}>
                    <FiArchive size={13} /> {task.archived ? 'Ativo' : 'Arquivar'}
                  </button>
                  {confirmDelete ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>Confirmar?</span>
                      <button onClick={handleDelete} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#ff453a22', border: '1px solid #ff453a66', color: '#ff453a', cursor: 'pointer' }}>Sim</button>
                      <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer' }}>Não</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,59,48,0.7)', fontSize: 13, transition: 'color .15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,59,48,0.7)')}
                    >
                      <FiTrash2 size={13} /> Deletar
                    </button>
                  )}
                </div>
              ) : <div />}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                >
                  Cancelar
                </button>
                {/* #16 — Salvar e criar próxima (apenas no modo criar) */}
                {!task && canSave && (
                  <button onClick={handleSaveAndNext} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: `${companyColor}20`, border: `1px solid ${companyColor}44`, color: companyColor, cursor: 'pointer', transition: 'all .15s' }}>
                    + Próxima
                  </button>
                )}
                <button onClick={handleSave} disabled={!canSave} style={{
                  padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: canSave ? (colorOverride ?? companyColor) : 'var(--s2)',
                  border: 'none', color: canSave ? '#fff' : 'var(--t4)',
                  cursor: canSave ? 'pointer' : 'not-allowed', transition: 'all .15s', opacity: canSave ? 1 : 0.5,
                }}>
                  {task ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
