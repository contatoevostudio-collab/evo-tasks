import { useState } from 'react';
import { format, parseISO, isAfter, isBefore, startOfToday, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiCircle, FiClock, FiTrendingUp, FiAlertTriangle, FiPlus, FiZap, FiInbox } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { getTaskTitle } from '../types';
import type { Task, TaskStatus, PageType, TaskType } from '../types';

interface Props {
  onTaskClick: (task: Task) => void;
  onNavigate: (page: PageType) => void;
}

function StatCard({
  label, value, color, Icon, onClick,
}: {
  label: string; value: number; color: string; Icon: React.ElementType; onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--b2)',
        borderRadius: 16, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .15s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--t1)' }}>{value}</span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>{label}</span>
    </motion.div>
  );
}

const STATUS_COLOR: Record<TaskStatus, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'A Fazer', doing: 'Fazendo', done: 'Feito' };

const TASK_TYPES: { id: TaskType; label: string }[] = [
  { id: 'feed',      label: 'Feed' },
  { id: 'story',     label: 'Story' },
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'reels',     label: 'Reels' },
  { id: 'thumb',     label: 'Thumb' },
  { id: 'outro',     label: 'Outro' },
];

export function HomePage({ onTaskClick, onNavigate }: Props) {
  const { tasks, companies, subClients, selectedCompanies, setFilterPriority, setViewMode, addTask, nextSequence, showToast, hideToast } = useTaskStore();

  const filtered = tasks.filter(t => selectedCompanies.includes(t.companyId) && !t.archived && !t.inbox);
  const inboxTasks = tasks.filter(t => selectedCompanies.includes(t.companyId) && !t.archived && t.inbox);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTasks = filtered.filter(t => t.date === todayStr);
  const doneTodayCnt = todayTasks.filter(t => t.status === 'done').length;
  const todayPct = todayTasks.length > 0 ? (doneTodayCnt / todayTasks.length) * 100 : 0;

  const overdue = filtered.filter(t => {
    try { const d = parseISO(t.date); return isBefore(d, startOfToday()) && t.status !== 'done'; } catch { return false; }
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const upcoming = filtered
    .filter(t => {
      try { const d = parseISO(t.date); return isAfter(d, startOfToday()) && d <= addDays(startOfToday(), 7) && t.status !== 'done'; } catch { return false; }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const todo  = filtered.filter(t => t.status === 'todo').length;
  const doing = filtered.filter(t => t.status === 'doing').length;
  const done  = filtered.filter(t => t.status === 'done').length;
  const total = filtered.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const companyColor = (companyId: string) => companies.find(c => c.id === companyId)?.color ?? '#356BFF';

  // Quick-add state
  const [qaCompany, setQaCompany]   = useState(companies[0]?.id ?? '');
  const [qaSubClient, setQaSub]     = useState('');
  const [qaType, setQaType]         = useState<TaskType>('feed');
  const [qaOpen, setQaOpen]         = useState(false);

  const qaSubs = subClients.filter(s => s.companyId === qaCompany);

  const handleQuickAdd = () => {
    const subId = qaSubClient || qaSubs[0]?.id;
    if (!qaCompany || !subId) return;
    const seq = nextSequence(qaCompany, subId, qaType);
    addTask({ companyId: qaCompany, subClientId: subId, taskType: qaType, sequence: seq, date: todayStr, status: 'todo', allDay: true });
    showToast('Tarefa adicionada para hoje ✓');
    setTimeout(hideToast, 3000);
  };

  const companyStats = companies
    .filter(c => selectedCompanies.includes(c.id))
    .map(c => ({
      company: c,
      total: filtered.filter(t => t.companyId === c.id).length,
      done: filtered.filter(t => t.companyId === c.id && t.status === 'done').length,
    }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const goKanban = () => { setViewMode('kanban'); onNavigate('tarefas'); };

  // Productivity heatmap — tarefas concluídas por dia da semana
  const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const heatmapCounts = DOW_LABELS.map((_, i) => {
    return tasks.filter(t => {
      if (t.status !== 'done' || t.inbox) return false;
      try { const d = parseISO(t.date); const dow = getDay(d); return (dow === 0 ? 6 : dow - 1) === i; }
      catch { return false; }
    }).length;
  });
  const heatMax = Math.max(1, ...heatmapCounts);

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.5px' }}>
          {greeting} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--t2)', marginTop: 4 }}>
          Você tem <strong style={{ color: '#64C4FF' }}>{todayTasks.filter(t => t.status !== 'done').length}</strong> tarefa{todayTasks.filter(t => t.status !== 'done').length !== 1 ? 's' : ''} pendente{todayTasks.filter(t => t.status !== 'done').length !== 1 ? 's' : ''} hoje.
        </p>

        {todayTasks.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden', maxWidth: 320 }}>
              <motion.div
                style={{ height: '100%', background: todayPct === 100 ? '#30d158' : '#356BFF', borderRadius: 2 }}
                initial={{ width: 0 }}
                animate={{ width: `${todayPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <span style={{ fontSize: 11, color: todayPct === 100 ? '#30d158' : 'var(--t3)', fontWeight: 600 }}>
              {doneTodayCnt}/{todayTasks.length} hoje
            </span>
          </div>
        )}
      </motion.div>

      {/* Quick-add */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 28 }}>
        {!qaOpen ? (
          <button
            onClick={() => setQaOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'var(--s1)', border: '1px dashed var(--b2)', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', transition: 'all .15s', width: '100%', maxWidth: 420 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#356BFF'; (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            <FiZap size={13} /> Adicionar tarefa para hoje...
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--s1)', border: '1px solid #356BFF55', maxWidth: 600, flexWrap: 'wrap' }}>
            <FiZap size={13} style={{ color: '#356BFF', flexShrink: 0 }} />
            {/* Company */}
            <select value={qaCompany} onChange={e => { setQaCompany(e.target.value); setQaSub(''); }}
              style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {/* Subclient */}
            <select value={qaSubClient || (qaSubs[0]?.id ?? '')} onChange={e => setQaSub(e.target.value)}
              style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {qaSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {/* Type */}
            <select value={qaType} onChange={e => setQaType(e.target.value as TaskType)}
              style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button onClick={handleQuickAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <FiPlus size={12} /> Adicionar
            </button>
            <button onClick={() => setQaOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, padding: '4px 6px', borderRadius: 6 }}>
              Cancelar
            </button>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
        <StatCard label="Total de Tarefas" value={total}  color="#356BFF" Icon={FiTrendingUp} onClick={goKanban} />
        <StatCard label="A Fazer"          value={todo}   color="#ff9f0a" Icon={FiCircle}      onClick={() => { setFilterPriority(null); goKanban(); }} />
        <StatCard label="Em Andamento"     value={doing}  color="#64C4FF" Icon={FiClock}       onClick={goKanban} />
        <StatCard label="Concluídas"       value={done}   color="#30d158" Icon={FiCheckCircle} onClick={goKanban} />
      </div>

      {/* Company breakdown */}
      {companyStats.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {companyStats.map(({ company, total: t, done: d }) => (
            <div key={company.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderRadius: 99,
              background: `${company.color}12`, border: `1px solid ${company.color}30`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: company.color }} />
              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>{company.name}</span>
              <span style={{ fontSize: 11, color: company.color, fontWeight: 700 }}>{d}/{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap + Inbox row */}
      <div style={{ display: 'grid', gridTemplateColumns: inboxTasks.length > 0 ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20 }}>
        {/* Heatmap */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>
            Produtividade por dia
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 60 }}>
            {DOW_LABELS.map((label, i) => {
              const count = heatmapCounts[i];
              const pct = count / heatMax;
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 600 }}>{count || ''}</span>
                  <div style={{ width: '100%', height: Math.max(4, pct * 40), borderRadius: 4, background: pct > 0.66 ? '#30d158' : pct > 0.33 ? '#356BFF' : 'var(--b2)', transition: 'height .3s' }} />
                  <span style={{ fontSize: 9, color: 'var(--t4)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inbox */}
        {inboxTasks.length > 0 && (
          <div style={{ background: 'rgba(53,107,255,0.05)', border: '1px solid rgba(53,107,255,0.15)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#64C4FF', marginBottom: 14 }}>
              <FiInbox size={12} /> Inbox ({inboxTasks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inboxTasks.slice(0, 5).map((task, i) => {
                const color = companyColor(task.companyId);
                const title = getTaskTitle(task, companies, subClients);
                return (
                  <motion.button key={task.id} onClick={() => onTaskClick(task)}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}25`, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${color}22`)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = `${color}10`)}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    <span style={{ fontSize: 9, color: '#64C4FF', background: 'rgba(53,107,255,0.12)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>inbox</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: overdue.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20 }}>
        {/* Overdue */}
        {overdue.length > 0 && (
          <div style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#ff453a', marginBottom: 14 }}>
              <FiAlertTriangle size={12} /> Atrasadas ({overdue.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdue.map((task, i) => {
                const color = companyColor(task.companyId);
                const title = getTaskTitle(task, companies, subClients);
                return (
                  <motion.button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.15)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.08)')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                    <span style={{ fontSize: 10, color: '#ff453a', fontWeight: 600, flexShrink: 0 }}>{task.date}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Today */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>
            Hoje
          </div>
          {todayTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: 13 }}>Dia livre! ✨</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map((task, i) => {
                const color = companyColor(task.companyId);
                const title = getTaskTitle(task, companies, subClients);
                return (
                  <motion.button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, background: `${color}15`,
                      border: `1px solid ${color}30`, cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${color}25`)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = `${color}15`)}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--t1)', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                      background: `${STATUS_COLOR[task.status]}22`, color: STATUS_COLOR[task.status],
                    }}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 14 }}>
            Próximos 7 dias
          </div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: 13 }}>Agenda livre 🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map((task, i) => {
                const color = companyColor(task.companyId);
                const title = getTaskTitle(task, companies, subClients);
                return (
                  <motion.button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, background: 'var(--s1)',
                      border: '1px solid var(--b1)', cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s1)')}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>
                      {format(parseISO(task.date), "d MMM", { locale: ptBR })}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
