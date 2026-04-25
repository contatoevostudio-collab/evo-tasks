import { useState, useMemo } from 'react';
import {
  FiChevronLeft, FiChevronRight, FiCalendar, FiFilter,
} from 'react-icons/fi';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameMonth, parseISO, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../store/tasks';
import { useContentApprovalsStore } from '../store/contentApprovals';
import type { Task, ContentApproval, ApprovalStatus } from '../types';

const APPROVAL_STATUS_COLORS: Partial<Record<ApprovalStatus, string>> = {
  rascunho:    '#636366',
  enviado:     '#356BFF',
  visualizado: '#ff9f0a',
  alteracao:   '#ff453a',
  aprovado:    '#30d158',
  postado:     '#bf5af2',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  feed:       'Feed',
  story:      'Story',
  carrossel:  'Carrossel',
  reels:      'Reels',
  thumb:      'Thumb',
  site:       'Site',
  identidade: 'Identidade',
  video:      'Vídeo',
  outro:      'Outro',
};

export function EditorialPage() {
  const { tasks, companies, accentColor } = useTaskStore();
  const { approvals } = useContentApprovalsStore();
  const [current, setCurrent] = useState(new Date());
  const [filterCompany, setFilterCompany] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Only criacao tasks (or legacy tasks without category)
  const editorialTasks = useMemo(() => {
    return tasks.filter(t =>
      !t.deletedAt && !t.archived && !t.inbox &&
      (!t.taskCategory || t.taskCategory === 'criacao')
    );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!filterCompany) return editorialTasks;
    return editorialTasks.filter(t => t.companyId === filterCompany);
  }, [editorialTasks, filterCompany]);

  // Approvals by taskId (status dot on task chips)
  const approvalByTask = useMemo(() => {
    const map: Record<string, ContentApproval> = {};
    approvals.forEach(a => { if (a.taskId && !a.deletedAt) map[a.taskId] = a; });
    return map;
  }, [approvals]);

  // Approvals by postDate (appear as first-class chips in the calendar)
  const approvalsByDate = useMemo(() => {
    const map: Record<string, ContentApproval[]> = {};
    approvals.filter(a => a.postDate && !a.deletedAt && (!filterCompany || a.clientId === filterCompany)).forEach(a => {
      if (!map[a.postDate!]) map[a.postDate!] = [];
      map[a.postDate!].push(a);
    });
    return map;
  }, [approvals, filterCompany]);

  // Calendar grid
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to full weeks
  const startPad = getDay(monthStart); // 0=Sun
  const endPad = 6 - getDay(monthEnd);

  // Tasks by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(t => {
      if (!t.date) return;
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [filteredTasks]);

  const activeCompanies = useMemo(() =>
    companies.filter(c => !c.deletedAt).sort((a, b) => a.name.localeCompare(b.name))
  , [companies]);

  const monthTaskCount = filteredTasks.filter(t => {
    if (!t.date) return false;
    try { return isSameMonth(parseISO(t.date), current); } catch { return false; }
  }).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <FiCalendar size={18} style={{ color: accentColor }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Calendário Editorial</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>
            {monthTaskCount} {monthTaskCount === 1 ? 'peça' : 'peças'} em {format(current, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div style={{ flex: 1 }} />

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: `1px solid ${showFilters ? accentColor : 'var(--b2)'}`, background: showFilters ? `${accentColor}12` : 'transparent', color: showFilters ? accentColor : 'var(--t3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          <FiFilter size={12} /> Filtrar
        </button>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)', padding: '2px 4px' }}>
          <button onClick={() => setCurrent(subMonths(current, 1))} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', padding: '0 8px', minWidth: 120, textAlign: 'center' }}>
            {format(current, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setCurrent(addMonths(current, 1))} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiChevronRight size={14} /></button>
        </div>

        <button onClick={() => setCurrent(new Date())} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>Hoje</button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--s1)', border: '1px solid var(--b1)', flexWrap: 'wrap', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'center' }}>Cliente:</span>
          <button
            onClick={() => setFilterCompany('')}
            style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${!filterCompany ? accentColor : 'var(--b2)'}`, background: !filterCompany ? `${accentColor}18` : 'transparent', color: !filterCompany ? accentColor : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            Todos
          </button>
          {activeCompanies.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCompany(filterCompany === c.id ? '' : c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: `1px solid ${filterCompany === c.id ? c.color : 'var(--b2)'}`, background: filterCompany === c.id ? `${c.color}18` : 'transparent', color: filterCompany === c.id ? c.color : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4, flexShrink: 0 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '4px 0', fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${Math.ceil((startPad + days.length + endPad) / 7)}, 1fr)`, gap: 4, overflowY: 'auto', minHeight: 0 }}>
          {/* Start padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-start-${i}`} style={{ borderRadius: 10, background: 'var(--s1)', opacity: 0.3, minHeight: 80 }} />
          ))}

          {/* Days */}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateStr] ?? [];
            const dayApprovals = approvalsByDate[dateStr] ?? [];
            const today = isToday(day);

            return (
              <div
                key={dateStr}
                style={{
                  borderRadius: 10,
                  background: today ? `${accentColor}08` : 'var(--s1)',
                  border: today ? `1px solid ${accentColor}30` : '1px solid var(--b1)',
                  padding: '6px 7px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  minHeight: 80,
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: today ? 800 : 600, color: today ? accentColor : 'var(--t3)', textAlign: 'right', marginBottom: 2 }}>
                  {format(day, 'd')}
                </span>

                {dayTasks.slice(0, Math.max(0, 5 - dayApprovals.length)).map(task => {
                  const company = companies.find(c => c.id === task.companyId);
                  const approval = approvalByTask[task.id];
                  const typeLabel = task.taskType ? (TASK_TYPE_LABELS[task.taskType] ?? task.taskType) : '';
                  return (
                    <div
                      key={task.id}
                      title={`${company?.name ?? ''} · ${typeLabel} · ${task.status}`}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
                        background: company ? `${company.color}20` : 'var(--s2)',
                        color: company?.color ?? 'var(--t3)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 4,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        opacity: task.status === 'done' ? 0.6 : 1,
                      }}
                    >
                      {approval && (
                        <div
                          style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: APPROVAL_STATUS_COLORS[approval.status] ?? '#636366' }}
                          title={`Aprovação: ${approval.status}`}
                        />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {typeLabel || task.taskType}
                      </span>
                    </div>
                  );
                })}

                {/* Approval chips (via postDate) */}
                {dayApprovals.map(a => {
                  const company = companies.find(c => c.id === a.clientId);
                  const statusColor = APPROVAL_STATUS_COLORS[a.status] ?? '#636366';
                  return (
                    <div key={a.id} title={`${company?.name ?? ''} · ${a.title} · ${a.status}`}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
                        background: `${statusColor}18`,
                        border: `1px solid ${statusColor}40`,
                        color: statusColor,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: statusColor }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{a.title}</span>
                    </div>
                  );
                })}

                {dayTasks.length + dayApprovals.length > 5 && (
                  <span style={{ fontSize: 9, color: 'var(--t4)', textAlign: 'center' }}>
                    +{dayTasks.length + dayApprovals.length - 5} mais
                  </span>
                )}
              </div>
            );
          })}

          {/* End padding */}
          {Array.from({ length: endPad }).map((_, i) => (
            <div key={`pad-end-${i}`} style={{ borderRadius: 10, background: 'var(--s1)', opacity: 0.3, minHeight: 80 }} />
          ))}
        </div>
      </div>

      {/* Legend */}
      {activeCompanies.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0, paddingTop: 8, borderTop: '1px solid var(--b1)' }}>
          {activeCompanies.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--t4)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
              {c.name}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--t4)', marginLeft: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: APPROVAL_STATUS_COLORS.aprovado }} />
            Aprovado
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: APPROVAL_STATUS_COLORS.alteracao, marginLeft: 6 }} />
            Alteração
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: APPROVAL_STATUS_COLORS.enviado, marginLeft: 6 }} />
            Enviado
          </div>
        </div>
      )}
    </div>
  );
}
