import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfToday, addDays, getDay, getISOWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  FiPlus, FiZap, FiAlertTriangle, FiArrowRight,
  FiCheckSquare, FiUsers, FiBriefcase, FiClock,
  FiCheckCircle, FiTrendingUp,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';
import { useAuthStore } from '../store/auth';
import { getTaskTitle } from '../types';
import type { Task, TaskStatus, PageType, LeadStage } from '../types';

const homeHexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const v = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(v.slice(0, 2), 16) || 0;
  const g = parseInt(v.slice(2, 4), 16) || 0;
  const b = parseInt(v.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
};

interface Props {
  onTaskClick: (task: Task) => void;
  onNavigate: (page: PageType) => void;
}

const STATUS_COLOR: Record<TaskStatus, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'A Fazer', doing: 'Fazendo', done: 'Feito' };

const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  prospeccao: 'Prospecção', contato: 'Contato', proposta: 'Proposta',
  negociacao: 'Negociação', fechado: 'Fechado',
};
const LEAD_STAGE_COLOR: Record<LeadStage, string> = {
  prospeccao: '#64d2ff', contato: '#ff9f0a', proposta: '#bf5af2',
  negociacao: '#ff375f', fechado: '#30d158',
};

// ─── Card primitive ─────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({
  icon, title, accent, right,
}: { icon: React.ReactNode; title: string; accent: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: accent, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

// ─── Task row used inside cards ─────────────────────────────────────────────
function TaskRow({
  task, color, title, companyName, showDate, onClick,
}: {
  task: Task; color: string; title: string; companyName: string; showDate?: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: hovered ? 'var(--s2)' : 'transparent',
        border: '1px solid transparent',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background .12s',
        minWidth: 0,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{
        flex: '1 1 0', minWidth: 0,
        fontSize: 12, fontWeight: 500,
        color: task.status === 'done' ? 'var(--t4)' : 'var(--t1)',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      {companyName && (
        <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, whiteSpace: 'nowrap', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
          {companyName}
        </span>
      )}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 600,
        color: STATUS_COLOR[task.status],
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[task.status] }} />
        {STATUS_LABEL[task.status]}
      </span>
      {showDate && (
        <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
          {format(parseISO(task.date), "d MMM", { locale: ptBR })}
        </span>
      )}
    </button>
  );
}

// ─── Weekly bar chart (this ISO week) ───────────────────────────────────────
function WeeklyBars({ tasks, accentColor, accentRgb }: { tasks: Task[]; accentColor: string; accentRgb: string }) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const counts = days.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return tasks.filter(t => t.status === 'done' && !t.deletedAt && !t.inbox && t.date === dateStr).length;
  });
  const maxCount = Math.max(1, ...counts);
  const total = counts.reduce((s, n) => s + n, 0);
  const CHART_H = 80;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{total} concluída{total !== 1 ? 's' : ''} esta semana</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: CHART_H, padding: '14px 0 0' }}>
        {days.map((day, i) => {
          const count = counts[i];
          const pct = count / maxCount;
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = dateStr === todayStr;
          const hasData = count > 0;

          let barBg: string;
          let barShadow: string = 'none';
          if (isToday) {
            barBg = `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}66 100%)`;
            barShadow = `0 0 14px -2px rgba(${accentRgb}, 0.6)`;
          } else if (hasData) {
            barBg = 'linear-gradient(180deg, #30d158 0%, rgba(48,209,88,0.55) 100%)';
            barShadow = '0 0 10px -4px rgba(48,209,88,0.4)';
          } else {
            barBg = 'var(--b2)';
          }
          const barHeight = hasData ? Math.max(8, pct * (CHART_H - 22)) : 4;

          return (
            <div key={dateStr} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-end', gap: 4, height: '100%', position: 'relative',
            }}>
              {hasData && (
                <span style={{
                  position: 'absolute',
                  bottom: barHeight + 22,
                  fontSize: 9, fontWeight: 700,
                  color: isToday ? accentColor : '#30d158',
                  lineHeight: 1,
                }}>{count}</span>
              )}
              <motion.div
                initial={{ height: 4 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.04 }}
                style={{
                  width: '70%', maxWidth: 22,
                  borderTopLeftRadius: 6, borderTopRightRadius: 6,
                  borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
                  background: barBg, boxShadow: barShadow,
                }}
              />
              <span style={{
                fontSize: 9,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? accentColor : 'var(--t4)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Deterministic pick by week-of-year ─────────────────────────────────────
function deterministicPick<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  const x = Math.sin(seed) * 10000;
  const idx = Math.floor((x - Math.floor(x)) * items.length);
  return items[Math.abs(idx) % items.length];
}

// ─── HomePage ───────────────────────────────────────────────────────────────
export function HomePage({ onTaskClick, onNavigate }: Props) {
  const {
    tasks, companies, subClients, leads, accentColor, pomodoroSessions, userName,
  } = useTaskStore();
  const { ideas } = useIdeasStore();
  const { user } = useAuthStore();

  const accentRgb = homeHexToRgb(accentColor);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDate = startOfToday();

  // ─── Greeting ───
  const firstName = useMemo(() => {
    if (userName && userName.trim()) return userName.trim().split(' ')[0];
    if (user?.user_metadata?.name) return String(user.user_metadata.name).split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'visitante';
  }, [user, userName]);

  // ─── Tasks ───
  const activeTasks = tasks.filter(t => !t.archived && !t.inbox);
  const todayTasks = activeTasks.filter(t => t.date === todayStr);
  const todayCount = todayTasks.length;
  const openTasks = activeTasks.filter(t => t.status !== 'done');
  const overdue = activeTasks
    .filter(t => {
      try { return isBefore(parseISO(t.date), todayDate) && t.status !== 'done'; } catch { return false; }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Upcoming next 7 days, grouped by date
  const upcomingByDay = useMemo(() => {
    const upcoming = activeTasks
      .filter(t => {
        try {
          const d = parseISO(t.date);
          return isAfter(d, todayDate) && d <= addDays(todayDate, 7) && t.status !== 'done';
        } catch { return false; }
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const groups: { date: string; tasks: Task[] }[] = [];
    upcoming.forEach(t => {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) last.tasks.push(t);
      else groups.push({ date: t.date, tasks: [t] });
    });
    return groups;
  }, [activeTasks, todayDate]);

  // ─── Leads ───
  const openLeads = leads.filter(l => l.stage !== 'fechado');
  const sortedOpenLeads = useMemo(() => {
    const stageOrder: Record<LeadStage, number> = { negociacao: 0, proposta: 1, contato: 2, prospeccao: 3, fechado: 4 };
    return [...openLeads].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]).slice(0, 5);
  }, [openLeads]);

  // ─── Ideas ───
  const ideasThisWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return ideas.filter(i => {
      try { return !i.deletedAt && parseISO(i.createdAt) >= start; } catch { return false; }
    });
  }, [ideas]);

  // Idea of the week — deterministic by week-of-year
  const ideaOfWeek = useMemo(() => {
    const candidates = ideas.filter(i => !i.deletedAt);
    return deterministicPick(candidates, getISOWeek(new Date()));
  }, [ideas]);

  // ─── Pomodoro ───
  const pomodoroToday = useMemo(() => {
    const minutes = pomodoroSessions
      .filter(s => !s.isBreak && s.startedAt.startsWith(todayStr))
      .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
    return minutes;
  }, [pomodoroSessions, todayStr]);

  const pomodoroWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const minutes = pomodoroSessions
      .filter(s => {
        if (s.isBreak) return false;
        try { return parseISO(s.startedAt) >= start; } catch { return false; }
      })
      .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
    return minutes;
  }, [pomodoroSessions]);

  // ─── Helpers ───
  const companyColor = (id: string) => companies.find(c => c.id === id)?.color ?? accentColor;
  const companyNameFn = (id: string) => companies.find(c => c.id === id)?.name ?? '';

  // Header stat chips
  const headerChips = [
    { label: 'Hoje',     value: todayCount,        color: '#356BFF', rgb: accentRgb },
    { label: 'Em aberto', value: openTasks.length,  color: '#ff9f0a', rgb: '255,159,10' },
    { label: 'Leads',    value: openLeads.length,   color: '#bf5af2', rgb: '191,90,242' },
    { label: 'Ideias semana', value: ideasThisWeek.length, color: '#ffd60a', rgb: '255,214,10' },
  ];

  // Day labels for upcoming groups
  const dayLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const dow = getDay(d);
      const labels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return `${labels[dow]} · ${format(d, "d MMM", { locale: ptBR })}`;
    } catch { return dateStr; }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ Compact sticky header ═══════════════════════════════════════════ */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Dashboard</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>
            Olá, <span style={{ color: accentColor }}>{firstName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {headerChips.map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}

          <button
            onClick={() => onNavigate('tarefas')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(53,107,255,0.35)' }}>
            <FiPlus size={12} /> Nova
          </button>
        </div>
      </div>

      {/* ═══ Body ═══════════════════════════════════════════════════════════ */}
      <div className="bento-grid bento-sidebar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', gridAutoRows: 'min-content' }}>
        {/* ─── MAIN COLUMN ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Hoje */}
          <Card>
            <CardHeader
              icon={<FiCheckCircle size={13} />}
              title="Hoje"
              accent="#356BFF"
              right={
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
                  {todayTasks.filter(t => t.status === 'done').length}/{todayCount}
                </span>
              }
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {todayTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--t4)', fontSize: 12 }}>Dia livre. Aproveite!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {todayTasks.slice(0, 8).map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <TaskRow
                        task={task}
                        color={companyColor(task.companyId)}
                        title={getTaskTitle(task, companies, subClients)}
                        companyName={companyNameFn(task.companyId)}
                        onClick={() => onTaskClick(task)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Esta semana */}
          <Card>
            <CardHeader
              icon={<FiTrendingUp size={13} />}
              title="Esta semana"
              accent={accentColor}
            />
            <div style={{ padding: '14px 16px 16px' }}>
              <WeeklyBars tasks={tasks} accentColor={accentColor} accentRgb={accentRgb} />
            </div>
          </Card>

          {/* CRM em aberto */}
          <Card>
            <CardHeader
              icon={<FiUsers size={13} />}
              title="CRM em aberto"
              accent="#bf5af2"
              right={
                <button onClick={() => onNavigate('crm')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Ver <FiArrowRight size={11} />
                </button>
              }
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {sortedOpenLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--t4)', fontSize: 12 }}>Nenhum lead em aberto.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {sortedOpenLeads.map((lead, i) => {
                    const stageColor = LEAD_STAGE_COLOR[lead.stage];
                    return (
                      <motion.button
                        key={lead.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => onNavigate('crm')}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          background: 'transparent', border: '1px solid transparent',
                          cursor: 'pointer', transition: 'background .12s',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.name}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: stageColor, flexShrink: 0 }}>
                          {LEAD_STAGE_LABEL[lead.stage]}
                        </span>
                        {lead.temperature === 'quente' && (
                          <span style={{ fontSize: 11 }}>🔥</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Próximos 7 dias */}
          <Card>
            <CardHeader
              icon={<FiClock size={13} />}
              title="Próximos 7 dias"
              accent="#64d2ff"
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {upcomingByDay.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--t4)', fontSize: 12 }}>Agenda livre.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcomingByDay.map(group => (
                    <div key={group.date}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--t4)', padding: '0 10px 6px' }}>
                        {dayLabel(group.date)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {group.tasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            color={companyColor(task.companyId)}
                            title={getTaskTitle(task, companies, subClients)}
                            companyName={companyNameFn(task.companyId)}
                            onClick={() => onTaskClick(task)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ─── RIGHT COLUMN ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Pomodoro mini-stat */}
          <Card>
            <CardHeader
              icon={<FiClock size={13} />}
              title="Pomodoro"
              accent="#ff453a"
            />
            <div style={{ padding: '14px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Hoje</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
                  {pomodoroToday}<span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginLeft: 3 }}>min</span>
                </div>
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--b1)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Semana</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
                  {pomodoroWeek}<span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginLeft: 3 }}>min</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Atrasadas */}
          <Card style={{ border: '1px solid rgba(255,69,58,0.22)' }}>
            <CardHeader
              icon={<FiAlertTriangle size={13} />}
              title="Atrasadas"
              accent="#ff453a"
              right={overdue.length > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ff453a' }}>{overdue.length}</span>
              ) : undefined}
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {overdue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 12 }}>Nada em atraso.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {overdue.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <button
                        onClick={() => onTaskClick(task)}
                        style={{
                          width: '100%', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          background: 'transparent', border: '1px solid transparent',
                          cursor: 'pointer', transition: 'background .12s',
                          minWidth: 0,
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.08)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff453a', flexShrink: 0, boxShadow: '0 0 6px rgba(255,69,58,0.6)' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getTaskTitle(task, companies, subClients)}
                        </span>
                        <span style={{ fontSize: 10, color: '#ff453a', fontWeight: 700, flexShrink: 0 }}>
                          {format(parseISO(task.date), "d MMM", { locale: ptBR })}
                        </span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Ideia da semana */}
          <Card>
            <CardHeader
              icon={<FiZap size={13} />}
              title="Ideia da semana"
              accent="#ffd60a"
              right={
                <button onClick={() => onNavigate('ideias')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Ver <FiArrowRight size={11} />
                </button>
              }
            />
            <div style={{ padding: '14px 16px 16px' }}>
              {!ideaOfWeek ? (
                <div style={{ textAlign: 'center', padding: '14px 0 6px', color: 'var(--t4)', fontSize: 12 }}>
                  Nenhuma ideia ainda.
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('ideias')}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'rgba(255,214,10,0.06)',
                    border: '1px solid rgba(255,214,10,0.22)',
                    borderRadius: 10, padding: '12px 14px',
                    cursor: 'pointer', transition: 'all .15s',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.22)'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ideaOfWeek.title || '(sem título)'}
                  </div>
                  {ideaOfWeek.description && (
                    <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ideaOfWeek.description}
                    </div>
                  )}
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#ffd60a', marginTop: 2 }}>
                    Revisitar
                  </div>
                </button>
              )}
            </div>
          </Card>

          {/* Atalhos */}
          <Card>
            <CardHeader
              icon={<FiArrowRight size={13} />}
              title="Atalhos"
              accent={accentColor}
            />
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'Empresas', icon: <FiBriefcase size={14} />, page: 'empresas' as PageType, color: '#64C4FF', rgb: '100,196,255' },
                { label: 'CRM',      icon: <FiUsers size={14} />,     page: 'crm' as PageType,      color: '#bf5af2', rgb: '191,90,242' },
                { label: 'To Do',    icon: <FiCheckSquare size={14} />, page: 'todo' as PageType,    color: '#30d158', rgb: '48,209,88' },
                { label: 'Ideias',   icon: <FiZap size={14} />,       page: 'ideias' as PageType,   color: '#ffd60a', rgb: '255,214,10' },
              ]).map(s => (
                <button
                  key={s.label}
                  onClick={() => onNavigate(s.page)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '14px 8px', borderRadius: 10,
                    background: `rgba(${s.rgb},0.06)`, border: `1px solid rgba(${s.rgb},0.18)`,
                    color: s.color, cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${s.rgb},0.12)`; (e.currentTarget as HTMLElement).style.borderColor = `rgba(${s.rgb},0.35)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${s.rgb},0.06)`; (e.currentTarget as HTMLElement).style.borderColor = `rgba(${s.rgb},0.18)`; }}
                >
                  {s.icon}
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
