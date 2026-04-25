import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiTrash2, FiCalendar, FiImage, FiSmartphone,
  FiLayers, FiFilm, FiMonitor, FiEdit3, FiCopy,
  FiPlus, FiCheck, FiArchive, FiClock, FiGlobe, FiPenTool, FiRepeat, FiBookmark,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { playAdd, playDelete, playCheck } from '../lib/sounds';
import { generateOccurrences, describeRule } from '../lib/recurrence';
import type { Task, TaskStatus, TaskType, Priority, SubTask, ArtVersion, TaskTemplate, RecurrenceRule, RecurrenceFreq } from '../types';
import { getTaskTitle } from '../types';
import { useTaskStore } from '../store/tasks';
import { useProposalsStore } from '../store/proposals';

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

import type { TaskCategory } from '../types';
import { FiUsers, FiUser, FiStar, FiCalendar as FiCal } from 'react-icons/fi';

interface TaskTypeOption { id: TaskType; label: string; Icon: React.ElementType }

const CATEGORY_DEFS: { id: TaskCategory; label: string; color: string; Icon: React.ElementType; subtypes: TaskTypeOption[] }[] = [
  {
    id: 'criacao', label: 'Criação', color: '#356BFF', Icon: FiPenTool,
    subtypes: [
      { id: 'feed',       label: 'Feed',            Icon: FiImage },
      { id: 'story',      label: 'Story',           Icon: FiSmartphone },
      { id: 'carrossel',  label: 'Carrossel',       Icon: FiLayers },
      { id: 'reels',      label: 'Reels',           Icon: FiFilm },
      { id: 'thumb',      label: 'Thumb',           Icon: FiMonitor },
      { id: 'video',      label: 'Vídeo',           Icon: FiFilm },
      { id: 'site',       label: 'Site',            Icon: FiGlobe },
      { id: 'identidade', label: 'Identidade Vis.', Icon: FiPenTool },
      { id: 'outro',      label: 'Outro',           Icon: FiEdit3 },
    ],
  },
  {
    id: 'reuniao', label: 'Reunião', color: '#ff9f0a', Icon: FiUsers,
    subtypes: [
      { id: 'briefing',      label: 'Briefing',      Icon: FiEdit3 },
      { id: 'apresentacao',  label: 'Apresentação',  Icon: FiMonitor },
      { id: 'feedback',      label: 'Feedback',      Icon: FiLayers },
      { id: 'alinhamento',   label: 'Alinhamento',   Icon: FiLayers },
      { id: 'call',          label: 'Call',          Icon: FiSmartphone },
      { id: 'reuniao_outro', label: 'Outro',         Icon: FiEdit3 },
    ],
  },
  {
    id: 'pessoal', label: 'Pessoal', color: '#30d158', Icon: FiUser,
    subtypes: [
      { id: 'saude',        label: 'Saúde',      Icon: FiStar },
      { id: 'lazer',        label: 'Lazer',      Icon: FiStar },
      { id: 'estudo',       label: 'Estudo',     Icon: FiEdit3 },
      { id: 'financeiro',   label: 'Financeiro', Icon: FiGlobe },
      { id: 'pessoal_outro',label: 'Outro',      Icon: FiEdit3 },
    ],
  },
  {
    id: 'eventos', label: 'Eventos', color: '#bf5af2', Icon: FiCal,
    subtypes: [
      { id: 'lancamento',   label: 'Lançamento',  Icon: FiStar },
      { id: 'workshop',     label: 'Workshop',    Icon: FiLayers },
      { id: 'feira',        label: 'Feira',       Icon: FiGlobe },
      { id: 'aniversario',  label: 'Aniversário', Icon: FiStar },
      { id: 'evento_outro', label: 'Outro',       Icon: FiEdit3 },
    ],
  },
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
    companies, subClients, addTask, updateTask, deleteTask, restoreTask,
    nextSequence, addSubClient, toggleArchive,
    addSubTask, toggleSubTask, deleteSubTask,
    tasks, theme, showToast, hideToast,
    taskTemplates, addTaskTemplate, deleteTaskTemplate,
  } = useTaskStore();

  const isLight = theme.startsWith('light');
  const colorScheme = isLight ? 'light' : 'dark';

  // Available proposals for linking — exclude rascunhos
  const allProposals = useProposalsStore(s => s.proposals);
  const linkableProposals = allProposals.filter(p => p.status !== 'rascunho');

  // Form state
  const [companyId,    setCompanyId]    = useState(task?.companyId ?? '');
  const [subClientId,  setSubClientId]  = useState(task?.subClientId ?? '');
  const [taskCategory, setTaskCategory] = useState<TaskCategory | ''>(task?.taskCategory ?? (task?.taskType ? 'criacao' : ''));
  const [taskType,     setTaskType]     = useState<TaskType | ''>(task?.taskType ?? '');
  const [customType,   setCustomType]   = useState(task?.customType ?? '');
  const [date,         setDate]         = useState(task?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [deadline,     setDeadline]     = useState(task?.deadline ?? '');
  const [time,         setTime]         = useState(task?.time ?? '');
  const [status,       setStatus]       = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority,     setPriority]     = useState<Priority | undefined>(task?.priority);
  const [notes,        setNotes]        = useState(task?.notes ?? '');
  const [sequence,     setSequence]     = useState<number>(task?.sequence ?? 0);
  const [showSequence, setShowSequence] = useState<boolean>(!!task?.sequence);
  const [showPriority, setShowPriority] = useState<boolean>(!!task?.priority);
  const [allDay,       setAllDay]       = useState<boolean>(!task?.time && !task?.deadline);
  const [showNotes,    setShowNotes]    = useState<boolean>(!!(task?.notes));
  const [tags,         setTags]         = useState<string[]>(task?.tags ?? []);
  const [tagInput,     setTagInput]     = useState('');
  // Recurrence (Onda 3C — inteligente)
  const initialFreq: 'none' | RecurrenceFreq = task?.recurrenceRule?.freq ?? task?.recurrence ?? 'none';
  const [recFreq,         setRecFreq]         = useState<'none' | RecurrenceFreq>(initialFreq);
  const [recInterval,     setRecInterval]     = useState<number>(task?.recurrenceRule?.interval ?? 1);
  const [recWeekdays,     setRecWeekdays]     = useState<number[]>(task?.recurrenceRule?.byWeekday ?? []);
  const [recMonthMode,    setRecMonthMode]    = useState<'day' | 'nth'>(task?.recurrenceRule?.byMonthWeekday ? 'nth' : 'day');
  const [recMonthDay,     setRecMonthDay]     = useState<number>(task?.recurrenceRule?.byMonthDay ?? 1);
  const [recNthWeekday,   setRecNthWeekday]   = useState<number>(task?.recurrenceRule?.byMonthWeekday?.weekday ?? 1);
  const [recNth,          setRecNth]          = useState<number>(task?.recurrenceRule?.byMonthWeekday?.nth ?? 1);
  const [recCount,        setRecCount]        = useState<number | ''>(task?.recurrenceRule?.count ?? '');

  // Legacy compatibility for other code reading `recurrence` state — derived
  const recurrence: 'none' | 'weekly' | 'monthly' =
    recFreq === 'weekly' || recFreq === 'monthly' ? recFreq : 'none';

  const buildRecurrenceRule = (): RecurrenceRule | undefined => {
    if (recFreq === 'none') return undefined;
    return {
      freq: recFreq,
      interval: Math.max(1, recInterval || 1),
      byWeekday: recFreq === 'weekly' && recWeekdays.length > 0 ? recWeekdays : undefined,
      byMonthDay: recFreq === 'monthly' && recMonthMode === 'day' ? recMonthDay : undefined,
      byMonthWeekday: recFreq === 'monthly' && recMonthMode === 'nth'
        ? { weekday: recNthWeekday, nth: recNth }
        : undefined,
      count: recCount !== '' ? Number(recCount) : undefined,
    };
  };
  const [estimate,     setEstimate]     = useState<number | ''>(task?.estimate ?? '');
  const [colorOverride, setColorOverride] = useState<string | undefined>(task?.colorOverride);
  const [linkedProposalId, setLinkedProposalId] = useState<string>(task?.linkedProposalId ?? '');
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
  const [showLegenda, setShowLegenda] = useState<boolean>(!!(task?.copy || task?.hookIdea || (task?.references && task.references.length > 0)));

  // Templates (Onda 3C) — aplicar/salvar
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const applyTemplate = (tpl: TaskTemplate) => {
    if (tpl.companyId)    setCompanyId(tpl.companyId);
    if (tpl.subClientId)  setSubClientId(tpl.subClientId);
    if (tpl.taskCategory) setTaskCategory(tpl.taskCategory);
    setTaskType(tpl.taskType);
    if (tpl.customType)   setCustomType(tpl.customType);
    if (tpl.priority) { setPriority(tpl.priority); setShowPriority(true); }
    if (tpl.estimate !== undefined) setEstimate(tpl.estimate);
    if (tpl.notes)        { setNotes(tpl.notes); setShowNotes(true); }
    if (tpl.copy)         { setCopy(tpl.copy); setShowLegenda(true); }
    if (tpl.hookIdea)     { setHookIdea(tpl.hookIdea); setShowLegenda(true); }
    if (tpl.references && tpl.references.length > 0) { setReferences(tpl.references); setShowLegenda(true); }
    if (tpl.tags && tpl.tags.length > 0) setTags(tpl.tags);
    if (tpl.recurrence)   setRecFreq(tpl.recurrence);
    showToast(`Template "${tpl.name}" aplicado`);
    setTimeout(hideToast, 2400);
  };

  const handleSaveAsTemplate = () => {
    const name = templateName.trim();
    if (!name || !taskType) return;
    addTaskTemplate({
      name,
      taskCategory: (taskCategory || undefined) as TaskCategory | undefined,
      taskType: taskType as TaskType,
      customType: taskType === 'outro' ? (customType || undefined) : undefined,
      companyId: companyId || undefined,
      subClientId: subClientId || undefined,
      priority: showPriority ? priority : undefined,
      estimate: estimate !== '' ? Number(estimate) : undefined,
      notes: showNotes && notes.trim() ? notes.trim() : undefined,
      copy: copy.trim() || undefined,
      hookIdea: hookIdea.trim() || undefined,
      references: references.length > 0 ? references : undefined,
      tags: tags.length > 0 ? tags : undefined,
      recurrence: recurrence !== 'none' ? (recurrence as 'weekly' | 'monthly') : undefined,
    });
    setTemplateName('');
    setShowSaveTemplate(false);
    showToast(`Template "${name}" salvo`);
    setTimeout(hideToast, 2400);
  };

  const filteredSubClients = subClients
    .filter(s => !s.deletedAt && s.companyId === companyId)
    .filter(s => subSearch === '' || s.name.toLowerCase().includes(subSearch.toLowerCase()));

  const company = companies.find(c => c.id === companyId);
  const companyColor = company?.color ?? '#636366';
  const isAvulso = company?.avulso ?? false;

  // Existing task subtasks from store (always fresh)
  const liveTask = task ? tasks.find(t => t.id === task.id) : null;
  const subtasks: SubTask[] = liveTask?.subtasks ?? task?.subtasks ?? [];

  // Reset subclient when company changes
  useEffect(() => {
    if (!task) { setSubClientId(''); setSubSearch(''); }
  }, [companyId, task]);

  useEffect(() => {
    if (!task) { setTaskCategory(''); setTaskType(''); }
  }, [subClientId, task]);

  useEffect(() => {
    if (!task) setTaskType('');
  }, [taskCategory, task]);

  useEffect(() => {
    if (!task && !seqInitialized && showSequence && companyId && (subClientId || isAvulso) && taskCategory && taskType) {
      setSequence(nextSequence(companyId, subClientId, taskType as TaskType));
      setSeqInitialized(true);
    }
  }, [companyId, subClientId, taskType, task, seqInitialized, showSequence, nextSequence]);

  useEffect(() => {
    if (!task) setSeqInitialized(false);
  }, [taskType, task]);

  const canSave = companyId !== '' && (isAvulso || subClientId !== '') && taskCategory !== '' && taskType !== '';

  const buildPayload = () => ({
    companyId,
    subClientId,
    taskCategory: taskCategory as TaskCategory,
    taskType: taskType as TaskType,
    customType: taskType === 'outro' ? customType : undefined,
    sequence: showSequence ? sequence : 0,
    date,
    deadline: (!allDay && deadline) ? deadline : undefined,
    time: (!allDay && time) ? time : undefined,
    status,
    priority: showPriority ? priority : undefined,
    notes: (showNotes && notes.trim()) ? notes.trim() : undefined,
    copy: copy.trim() || undefined,
    hookIdea: hookIdea.trim() || undefined,
    references: references.length > 0 ? references : undefined,
    versions: versions.length > 0 ? versions : undefined,
    allDay,
    tags: tags.length > 0 ? tags : undefined,
    estimate: estimate !== '' ? Number(estimate) : undefined,
    colorOverride: colorOverride || undefined,
    subtasks: task ? liveTask?.subtasks : undefined,
    recurrence: recurrence !== 'none' ? recurrence : undefined,
    recurrenceRule: buildRecurrenceRule(),
    linkedProposalId: linkedProposalId || undefined,
  });

  /** Generate future occurrences from the active rule. */
  const generateRecurrenceOccurrences = (parentId: string, baseDate: string, rule: RecurrenceRule) => {
    const payload = buildPayload() as Omit<Task, 'id'>;
    const dates = generateOccurrences(baseDate, rule);
    for (const dStr of dates) {
      addTask({
        ...payload,
        date: dStr,
        recurrence: rule.freq === 'weekly' || rule.freq === 'monthly' ? rule.freq : undefined,
        recurrenceRule: rule,
        recurrenceParentId: parentId,
        status: 'todo',
        subtasks: undefined,
        versions: undefined,
      });
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    if (task) {
      updateTask(task.id, buildPayload());
    } else {
      const payload = buildPayload() as Omit<Task, 'id'>;
      const newId = addTask(payload);
      playAdd();
      // #3 — generate recurrence occurrences for new tasks
      const rule = buildRecurrenceRule();
      if (rule) {
        generateRecurrenceOccurrences(newId, date, rule);
      }
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
    if (task) {
      const id = task.id;
      deleteTask(id);
      playDelete();
      showToast('Tarefa movida para a lixeira', () => { restoreTask(id); hideToast(); });
      setTimeout(hideToast, 5000);
      onClose();
    }
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

  // Live title preview — only shown after type is selected
  const previewTitle = (() => {
    if (!companyId || !taskType) return null;
    const fakeTask: Task = {
      id: '', companyId, subClientId: subClientId || '',
      taskType: taskType as TaskType, customType, sequence, date, status,
    };
    return getTaskTitle(fakeTask, companies, subClients);
  })();

  // Sequence count info (#19)
  const existingCount = (companyId && (subClientId || isAvulso) && taskCategory && taskType)
    ? tasks.filter(t => !t.deletedAt && t.companyId === companyId && t.subClientId === subClientId && t.taskType === taskType && t.id !== task?.id).length
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
          className="relative z-10 w-full max-w-lg mx-4 rounded-[20px] overflow-hidden shadow-2xl glass-panel"
          style={{ background: 'var(--modal-bg)' }}
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
                  background: 'var(--s1)',
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

            {/* 0 · TEMPLATES — só na criação */}
            {!task && taskTemplates.length > 0 && (
              <div>
                <span style={labelStyle}>Templates</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {taskTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'var(--s1)', borderRadius: 999,
                        border: '1px solid var(--b2)', padding: '0 0 0 4px',
                      }}
                    >
                      <button
                        onClick={() => applyTemplate(tpl)}
                        title={`Aplicar: ${tpl.name}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'transparent', border: 'none', padding: '4px 8px',
                          color: 'var(--t2)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        <FiBookmark size={10} style={{ color: 'var(--t4)' }} />
                        {tpl.name}
                      </button>
                      <button
                        onClick={() => deleteTaskTemplate(tpl.id)}
                        title="Excluir template"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--t4)', padding: '4px 6px', display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1 · EMPRESA */}
            <div>
              <span style={labelStyle}>1 · Empresa</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {companies.filter(c => !c.deletedAt).map((c) => (
                  <button key={c.id} onClick={() => setCompanyId(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                    background: companyId === c.id ? `${c.color}22` : 'var(--s1)',
                    border: 'none',
                    color: companyId === c.id ? 'var(--t1)' : 'var(--t3)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 · SUBCLIENT — hidden for avulso companies */}
            {companyId && !isAvulso && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <span style={labelStyle}>2 · Subclient</span>
                {/* #15 — search */}
                {subClients.filter(s => !s.deletedAt && s.companyId === companyId).length > 4 && (
                  <input
                    value={subSearch}
                    onChange={e => setSubSearch(e.target.value)}
                    placeholder="Buscar subclient..."
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 8,
                      background: 'var(--ib)',
                      borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none',
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {filteredSubClients.map((s) => (
                    <button key={s.id} onClick={() => setSubClientId(s.id)} style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                      background: subClientId === s.id ? `${companyColor}22` : 'var(--s1)',
                      border: 'none',
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

            {/* 3 · CATEGORIA */}
            {(subClientId || isAvulso) && companyId && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <span style={labelStyle}>3 · Categoria</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {CATEGORY_DEFS.map(({ id, label, color, Icon }) => {
                    const active = taskCategory === id;
                    return (
                      <button key={id} onClick={() => setTaskCategory(id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                        background: active ? `${color}20` : 'var(--s1)',
                        border: active ? `1.5px solid ${color}40` : '1.5px solid transparent',
                        color: active ? color : 'var(--t3)',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        <Icon size={17} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 4 · SUBCATEGORIA / TIPO */}
            {taskCategory && (subClientId || isAvulso) && companyId && (() => {
              const catDef = CATEGORY_DEFS.find(c => c.id === taskCategory)!;
              const catColor = catDef.color;
              return (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                  <span style={labelStyle}>4 · Tipo</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {catDef.subtypes.map(({ id, label, Icon }) => (
                      <button key={id} onClick={() => setTaskType(id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                        background: taskType === id ? `${catColor}20` : 'var(--s1)',
                        border: taskType === id ? `1.5px solid ${catColor}40` : '1.5px solid transparent',
                        color: taskType === id ? catColor : 'var(--t3)',
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
              );
            })()}

            {/* 5 · LEGENDA / COPY & REFERÊNCIAS — criacao only, opt-in */}
            {taskType && taskCategory === 'criacao' && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showLegenda ? 10 : 0 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>5 · Legenda & Referências</span>
                  <button
                    onClick={() => setShowLegenda(v => !v)}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                      background: showLegenda ? `${companyColor}20` : 'var(--s1)',
                      border: 'none', cursor: 'pointer',
                      color: showLegenda ? companyColor : 'var(--t4)',
                      transition: 'all .15s', marginLeft: 'auto',
                    }}
                  >
                    {showLegenda ? 'ON' : 'OFF'}
                  </button>
                </div>
                {showLegenda && (
                  <>
                    <textarea value={copy} onChange={e => setCopy(e.target.value)}
                      placeholder="Texto do post, legenda, caption..."
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
                    />
                    {taskType === 'reels' && (
                      <textarea value={hookIdea} onChange={e => setHookIdea(e.target.value)}
                        placeholder="Ideia de hook (primeiros segundos do vídeo)..."
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: references.length > 0 ? 6 : 0 }}>
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
                        placeholder="Referência / URL de moodboard..."
                        style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                      />
                      <button onClick={() => { if (refInput.trim()) { setReferences(prev => [...prev, refInput.trim()]); setRefInput(''); } }}
                        style={{ padding: '6px 12px', borderRadius: 8, background: companyColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <FiPlus size={12} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* SEQUÊNCIA (opt-in) */}
            {taskType && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showSequence ? 10 : 0 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Sequência</span>
                  {existingCount > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 500 }}>
                      {existingCount} tarefa{existingCount > 1 ? 's' : ''} deste tipo
                    </span>
                  )}
                  <button
                    onClick={() => setShowSequence(v => !v)}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                      background: showSequence ? `${companyColor}20` : 'var(--s1)',
                      border: 'none', cursor: 'pointer',
                      color: showSequence ? companyColor : 'var(--t4)',
                      transition: 'all .15s', marginLeft: 'auto',
                    }}
                  >
                    {showSequence ? 'ON' : 'OFF'}
                  </button>
                </div>
                {showSequence && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {SEQUENCE_OPTIONS.map((n) => (
                      <button key={n} onClick={() => setSequence(n)} style={{
                        padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: sequence === n ? `${companyColor}25` : 'var(--s1)',
                        border: 'none',
                        color: sequence === n ? companyColor : 'var(--t3)',
                        cursor: 'pointer', transition: 'all .15s', minWidth: 32, textAlign: 'center',
                      }}>
                        {n === 0 ? '—' : String(n).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* PRIORIDADE (opt-in) */}
            {taskType && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showPriority ? 10 : 0 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Prioridade</span>
                  <button
                    onClick={() => setShowPriority(v => !v)}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                      background: showPriority ? `${companyColor}20` : 'var(--s1)',
                      border: 'none', cursor: 'pointer',
                      color: showPriority ? companyColor : 'var(--t4)',
                      transition: 'all .15s', marginLeft: 'auto',
                    }}
                  >
                    {showPriority ? 'ON' : 'OFF'}
                  </button>
                </div>
                {showPriority && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <button key={p.value} onClick={() => setPriority(priority === p.value ? undefined : p.value)} style={{
                        padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: priority === p.value ? `${p.color}25` : 'var(--s1)',
                        border: 'none',
                        color: priority === p.value ? p.color : 'var(--t3)',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Date, Notes, Status */}
            {taskType && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {/* Date section with Dia Inteiro toggle */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiCalendar size={10} /> Data de Produção
                    </label>
                    <button
                      onClick={() => setAllDay(v => !v)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                        background: allDay ? `${companyColor}20` : 'var(--s1)',
                        border: 'none', cursor: 'pointer',
                        color: allDay ? companyColor : 'var(--t4)',
                        transition: 'all .15s', marginLeft: 'auto',
                      }}
                    >
                      {allDay ? 'Dia Inteiro' : 'Horário'}
                    </button>
                  </div>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                  {!allDay && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FiClock size={10} /> Prazo de Entrega
                        </label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: deadline ? '#ff9f0a' : 'var(--t3)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <span style={labelStyle}>Horário</span>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: time ? 'var(--t1)' : 'var(--t3)', fontSize: 13, outline: 'none', colorScheme, width: '100%', boxSizing: 'border-box' }} />
                      </div>
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
                  )}
                </div>

                {/* Notas (opt-in) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showNotes ? 8 : 0 }}>
                    <span style={{ ...labelStyle, marginBottom: 0 }}>Notas</span>
                    <button
                      onClick={() => setShowNotes(v => !v)}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                        background: showNotes ? `${companyColor}20` : 'var(--s1)',
                        border: 'none', cursor: 'pointer',
                        color: showNotes ? companyColor : 'var(--t4)',
                        transition: 'all .15s', marginLeft: 'auto',
                      }}
                    >
                      {showNotes ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {showNotes && (
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Adicione notas..." rows={3} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'none' }} />
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={labelStyle}>Status</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <button key={s} onClick={() => setStatus(s)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 500,
                        background: status === s ? `${STATUS_COLORS[s]}22` : 'var(--s1)',
                        border: 'none',
                        color: status === s ? STATUS_COLORS[s] : 'var(--t3)',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <span style={labelStyle}>Tags</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {tags.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999, fontSize: 11,
                        background: `${companyColor}18`,
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

                {/* #3 Recurrence — inteligente (Onda 3C) */}
                {!isAvulso && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <FiRepeat size={10} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Repetir</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['none', 'daily', 'weekly', 'monthly'] as const).map(opt => {
                        const labels = { none: 'Não', daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
                        const active = recFreq === opt;
                        return (
                          <button key={opt} onClick={() => setRecFreq(opt)} style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 500,
                            background: active ? `${companyColor}22` : 'var(--s1)',
                            border: 'none',
                            color: active ? companyColor : 'var(--t3)',
                            cursor: 'pointer', transition: 'all .15s',
                          }}>
                            {labels[opt]}
                          </button>
                        );
                      })}
                    </div>

                    {recFreq !== 'none' && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Interval */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
                          <span>A cada</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={recInterval}
                            onChange={e => setRecInterval(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                            style={{ width: 48, padding: '4px 6px', borderRadius: 6, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', outline: 'none', fontSize: 11, textAlign: 'center' }}
                          />
                          <span>{recFreq === 'daily' ? (recInterval === 1 ? 'dia' : 'dias') : recFreq === 'weekly' ? (recInterval === 1 ? 'semana' : 'semanas') : (recInterval === 1 ? 'mês' : 'meses')}</span>
                        </div>

                        {/* Weekly: weekday picker */}
                        {recFreq === 'weekly' && (
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Dias da semana</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {['D','S','T','Q','Q','S','S'].map((label, idx) => {
                                const active = recWeekdays.includes(idx);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setRecWeekdays(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx])}
                                    style={{
                                      width: 28, height: 28, borderRadius: 8,
                                      background: active ? companyColor : 'var(--ib)',
                                      border: active ? 'none' : '1px solid var(--b2)',
                                      color: active ? '#fff' : 'var(--t3)',
                                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                      transition: 'all .12s',
                                    }}
                                  >{label}</button>
                                );
                              })}
                            </div>
                            {recWeekdays.length === 0 && (
                              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                                Nenhum dia selecionado — usa o dia da data inicial.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Monthly: day-of-month vs Nth weekday */}
                        {recFreq === 'monthly' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(['day', 'nth'] as const).map(m => {
                                const labels = { day: 'No dia X', nth: 'Em uma posição' };
                                const active = recMonthMode === m;
                                return (
                                  <button key={m} onClick={() => setRecMonthMode(m)} style={{
                                    flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 500,
                                    background: active ? `${companyColor}22` : 'var(--ib)',
                                    border: '1px solid ' + (active ? `${companyColor}40` : 'var(--b2)'),
                                    color: active ? companyColor : 'var(--t3)',
                                    cursor: 'pointer',
                                  }}>{labels[m]}</button>
                                );
                              })}
                            </div>
                            {recMonthMode === 'day' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
                                <span>Dia</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={recMonthDay}
                                  onChange={e => setRecMonthDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                  style={{ width: 48, padding: '4px 6px', borderRadius: 6, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', outline: 'none', fontSize: 11, textAlign: 'center' }}
                                />
                                <span>do mês</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', flexWrap: 'wrap' }}>
                                <select
                                  value={recNth}
                                  onChange={e => setRecNth(parseInt(e.target.value))}
                                  style={{ padding: '4px 6px', borderRadius: 6, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11 }}
                                >
                                  <option value={1}>primeira</option>
                                  <option value={2}>segunda</option>
                                  <option value={3}>terceira</option>
                                  <option value={4}>quarta</option>
                                  <option value={-1}>última</option>
                                </select>
                                <select
                                  value={recNthWeekday}
                                  onChange={e => setRecNthWeekday(parseInt(e.target.value))}
                                  style={{ padding: '4px 6px', borderRadius: 6, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11 }}
                                >
                                  <option value={1}>segunda</option>
                                  <option value={2}>terça</option>
                                  <option value={3}>quarta</option>
                                  <option value={4}>quinta</option>
                                  <option value={5}>sexta</option>
                                  <option value={6}>sábado</option>
                                  <option value={0}>domingo</option>
                                </select>
                                <span>do mês</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Count limit */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
                          <span>Por</span>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={recCount}
                            onChange={e => setRecCount(e.target.value === '' ? '' : Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                            placeholder="auto"
                            style={{ width: 56, padding: '4px 6px', borderRadius: 6, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', outline: 'none', fontSize: 11, textAlign: 'center' }}
                          />
                          <span>ocorrências (vazio = ~3 meses)</span>
                        </div>

                        {/* Live summary */}
                        {!task && (() => {
                          const r = buildRecurrenceRule();
                          return r ? (
                            <div style={{ fontSize: 10, color: companyColor, fontStyle: 'italic', borderTop: '1px solid var(--b1)', paddingTop: 8 }}>
                              {describeRule(r)}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {recFreq !== 'none' && task && (
                      <p style={{ fontSize: 10, color: 'var(--t4)', marginTop: 6 }}>
                        Esta tarefa pertence a uma série recorrente.
                      </p>
                    )}
                  </div>
                )}

                {/* Link to proposal */}
                {linkableProposals.length > 0 && (
                  <div>
                    <span style={labelStyle}>Vincular a proposta</span>
                    <select
                      value={linkedProposalId}
                      onChange={e => setLinkedProposalId(e.target.value)}
                      style={{
                        width: '100%', background: 'var(--ib)', border: '1px solid var(--b2)',
                        borderRadius: 8, padding: '8px 10px', color: 'var(--t1)', fontSize: 12,
                        outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="">— Nenhuma —</option>
                      {linkableProposals.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.clientName} — {p.service}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(s => !s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 11, textAlign: 'left', padding: 0, transition: 'color .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                >
                  {showAdvanced ? '▲ Ocultar avançado' : '▼ Opções avançadas'}
                </button>

                {/* Advanced: color, subtasks, versions */}
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

                    {/* Subtasks — only for existing tasks */}
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

                    {/* Art versioning — only for existing tasks */}
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
                              <span style={{ fontSize: 9, color: 'var(--t4)', flexShrink: 0 }}>{format(parseISO(v.createdAt), 'd/M')}</span>
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
                            placeholder={`Registrar v${versions.length + 1} (notas opcionais)...`}
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

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Salvar como template — visível quando há tipo definido */}
                {taskType && (
                  showSaveTemplate ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        autoFocus
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveAsTemplate();
                          if (e.key === 'Escape') { setShowSaveTemplate(false); setTemplateName(''); }
                        }}
                        placeholder="Nome do template..."
                        style={{
                          padding: '7px 10px', borderRadius: 8, fontSize: 11,
                          background: 'var(--ib)', border: '1px solid var(--b3)',
                          color: 'var(--t1)', outline: 'none', width: 160,
                        }}
                      />
                      <button
                        onClick={handleSaveAsTemplate}
                        disabled={!templateName.trim()}
                        style={{
                          padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: templateName.trim() ? '#356BFF' : 'var(--s2)',
                          border: 'none', color: templateName.trim() ? '#fff' : 'var(--t4)',
                          cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                        }}
                      >Salvar</button>
                      <button
                        onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                        title="Cancelar"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, display: 'flex' }}
                      ><FiX size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveTemplate(true)}
                      title="Salvar configuração atual como template"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                        background: 'transparent', border: '1px solid var(--b2)',
                        color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
                    >
                      <FiBookmark size={11} /> Template
                    </button>
                  )
                )}
                <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                >
                  Cancelar
                </button>
                {/* #16 — Salvar e criar próxima (apenas no modo criar) */}
                {!task && canSave && (
                  <button onClick={handleSaveAndNext} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: `${companyColor}20`, color: companyColor, cursor: 'pointer', transition: 'all .15s' }}>
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
