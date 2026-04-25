import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  FiCalendar, FiArrowRight, FiTrash2, FiCheckSquare, FiZap, FiList, FiX,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore, STATUS_CONFIG as IDEA_STATUS_CONFIG, TAG_CONFIG as IDEA_TAG_CONFIG } from '../store/ideas';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import { getTaskTitle } from '../types';
import type { Task, TodoItem, Idea, PageType } from '../types';

interface Props {
  onTaskClick: (task: Task) => void;
  onNavigate: (page: PageType) => void;
}

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

// ─── Section header ────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${color}18`, color, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.2px', flex: 1 }}>
        {title}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 99, padding: '2px 9px' }}>
        {count}
      </span>
    </div>
  );
}

// ─── Inline date picker ────────────────────────────────────────────────────
function ScheduleControl({ onSchedule, onCancel }: { onSchedule: (date: string) => void; onCancel: () => void }) {
  const [date, setDate] = useState(todayStr());
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.showPicker?.(); }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        ref={ref}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onSchedule(date); }}
        style={{
          background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7,
          padding: '4px 8px', fontSize: 11, color: 'var(--t1)', outline: 'none',
          colorScheme: 'dark',
        }}
      />
      <button
        onClick={() => onSchedule(date)}
        style={{ padding: '4px 10px', borderRadius: 7, background: '#356BFF', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >Agendar</button>
      <button
        onClick={onCancel}
        title="Cancelar"
        style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', display: 'flex' }}
      ><FiX size={12} /></button>
    </div>
  );
}

// ─── Item row ──────────────────────────────────────────────────────────────
interface RowProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
  actions: React.ReactNode;
}

function ItemRow({ primary, secondary, accentColor, onClick, actions }: RowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, height: 0 }}
      style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--b1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .12s',
      }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {accentColor && (
        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: accentColor, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {primary}
        </div>
        {secondary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {secondary}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {actions}
      </div>
    </motion.div>
  );
}

// ─── Action button ─────────────────────────────────────────────────────────
function ActionBtn({ title, color, bg, onClick, children }: { title: string; color: string; bg: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 7,
        background: bg, border: `1px solid ${color}40`,
        color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
        transition: 'transform .12s, opacity .12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}

function IconBtn({ title, onClick, hoverColor, children }: { title: string; onClick: () => void; hoverColor?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .12s', display: 'flex' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; if (hoverColor) (e.currentTarget as HTMLElement).style.color = hoverColor; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
    >
      {children}
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export function InboxPage({ onTaskClick, onNavigate }: Props) {
  const {
    tasks, companies, subClients,
    updateTask, deleteTask,
    todoItems, moveTodoItem, deleteTodoItem,
    showToast, hideToast,
  } = useTaskStore();
  const { ideas, setStatus: setIdeaStatus, deleteIdea } = useIdeasStore();

  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const visibleIds = useVisibleWorkspaceIds();
  const inboxTasks = useMemo(
    () => tasks.filter(t => t.inbox && !t.deletedAt && !t.archived && isInLens(t, visibleIds)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [tasks, visibleIds],
  );

  const standbyTodos = useMemo(
    () => todoItems.filter(t => t.status === 'standby' && !t.archived && isInLens(t, visibleIds)),
    [todoItems, visibleIds],
  );

  const draftIdeas = useMemo(
    () => ideas.filter(i => i.status === 'rascunho' && !i.deletedAt && isInLens(i, visibleIds)),
    [ideas, visibleIds],
  );

  const totalCount = inboxTasks.length + standbyTodos.length + draftIdeas.length;

  // ── Task actions ──
  const scheduleTask = (id: string, date: string) => {
    updateTask(id, { date, inbox: false });
    setSchedulingId(null);
    showToast('Tarefa agendada');
    setTimeout(hideToast, 2400);
  };
  const discardTask = (id: string, t: Task) => {
    deleteTask(id);
    showToast('Tarefa enviada pra lixeira', () => updateTask(id, { deletedAt: undefined }));
    setTimeout(hideToast, 4000);
    void t;
  };

  // ── Todo actions ──
  const promoteTodo = (id: string) => {
    moveTodoItem(id, 'todo');
    showToast('Movido pra "Pra Fazer"');
    setTimeout(hideToast, 2400);
  };
  const discardTodo = (id: string) => {
    deleteTodoItem(id);
    showToast('Todo descartado');
    setTimeout(hideToast, 2400);
  };

  // ── Idea actions ──
  const developIdea = (id: string) => {
    setIdeaStatus(id, 'desenvolvendo');
    showToast('Ideia movida pra "Desenvolvendo"');
    setTimeout(hideToast, 2400);
  };
  const discardIdea = (id: string) => {
    deleteIdea(id);
    showToast('Ideia enviada pra lixeira');
    setTimeout(hideToast, 2400);
  };

  // ── Render helpers ──
  const renderTaskRow = (t: Task) => {
    const company = companies.find(c => c.id === t.companyId);
    const isScheduling = schedulingId === t.id;
    const title = getTaskTitle(t, companies, subClients);
    return (
      <ItemRow
        key={t.id}
        primary={title}
        secondary={
          <>
            {company && <span style={{ fontSize: 10, color: company.color, fontWeight: 600 }}>● {company.name}</span>}
            {t.priority && (
              <span style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t.priority}
              </span>
            )}
          </>
        }
        accentColor={company?.color}
        onClick={() => !isScheduling && onTaskClick(t)}
        actions={
          isScheduling ? (
            <ScheduleControl onSchedule={(d) => scheduleTask(t.id, d)} onCancel={() => setSchedulingId(null)} />
          ) : (
            <>
              <ActionBtn title="Agendar" color="#356BFF" bg="rgba(53,107,255,0.12)" onClick={() => setSchedulingId(t.id)}>
                <FiCalendar size={11} /> Agendar
              </ActionBtn>
              <IconBtn title="Descartar" hoverColor="#ff453a" onClick={() => discardTask(t.id, t)}>
                <FiTrash2 size={12} />
              </IconBtn>
            </>
          )
        }
      />
    );
  };

  const renderTodoRow = (t: TodoItem) => (
    <ItemRow
      key={t.id}
      primary={t.text}
      secondary={
        <>
          {t.context && <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.context}</span>}
          {t.priority && <span style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.priority}</span>}
        </>
      }
      onClick={() => onNavigate('todo')}
      actions={
        <>
          <ActionBtn title="Mover pra Pra Fazer" color="#ff9f0a" bg="rgba(255,159,10,0.12)" onClick={() => promoteTodo(t.id)}>
            <FiArrowRight size={11} /> Pra Fazer
          </ActionBtn>
          <IconBtn title="Descartar" hoverColor="#ff453a" onClick={() => discardTodo(t.id)}>
            <FiTrash2 size={12} />
          </IconBtn>
        </>
      }
    />
  );

  const renderIdeaRow = (i: Idea) => {
    const tagCfg = IDEA_TAG_CONFIG[i.tag];
    return (
      <ItemRow
        key={i.id}
        primary={i.title}
        secondary={
          <>
            <span style={{ fontSize: 10, color: tagCfg.color, fontWeight: 600 }}>● {tagCfg.label}</span>
            {i.description && (
              <span style={{ fontSize: 10, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                {i.description}
              </span>
            )}
          </>
        }
        accentColor={tagCfg.color}
        onClick={() => onNavigate('ideias')}
        actions={
          <>
            <ActionBtn
              title="Mover pra Desenvolvendo"
              color={IDEA_STATUS_CONFIG.desenvolvendo.color}
              bg={`rgba(${IDEA_STATUS_CONFIG.desenvolvendo.rgb},0.12)`}
              onClick={() => developIdea(i.id)}
            >
              <FiArrowRight size={11} /> Desenvolver
            </ActionBtn>
            <IconBtn title="Descartar" hoverColor="#ff453a" onClick={() => discardIdea(i.id)}>
              <FiTrash2 size={12} />
            </IconBtn>
          </>
        }
      />
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Triagem</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Caixa de Entrada</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { label: 'Tarefas',  value: inboxTasks.length, color: '#356BFF', rgb: '53,107,255' },
            { label: 'Todos',    value: standbyTodos.length, color: '#ff9f0a', rgb: '255,159,10' },
            { label: 'Ideias',   value: draftIdeas.length, color: '#bf5af2', rgb: '191,90,242' },
          ].map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.7)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {totalCount === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
            <div style={{ fontSize: 56, opacity: 0.4 }}>📥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Caixa de entrada vazia</div>
            <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
              Tarefas sem data, todos em standby e ideias em rascunho aparecem aqui pra triagem rápida.
            </div>
          </div>
        ) : (
          <>
            {inboxTasks.length > 0 && (
              <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden' }}>
                <SectionHeader icon={<FiCheckSquare size={14} />} title="Tarefas sem data" count={inboxTasks.length} color="#356BFF" />
                <AnimatePresence>{inboxTasks.map(renderTaskRow)}</AnimatePresence>
              </div>
            )}

            {standbyTodos.length > 0 && (
              <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden' }}>
                <SectionHeader icon={<FiList size={14} />} title="Todos em standby" count={standbyTodos.length} color="#ff9f0a" />
                <AnimatePresence>{standbyTodos.map(renderTodoRow)}</AnimatePresence>
              </div>
            )}

            {draftIdeas.length > 0 && (
              <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden' }}>
                <SectionHeader icon={<FiZap size={14} />} title="Ideias em rascunho" count={draftIdeas.length} color="#bf5af2" />
                <AnimatePresence>{draftIdeas.map(renderIdeaRow)}</AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
