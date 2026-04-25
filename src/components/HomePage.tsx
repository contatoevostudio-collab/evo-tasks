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
import { useIdeasStore, TAG_CONFIG as IDEA_TAG_CONFIG } from '../store/ideas';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
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
function Card({ children, style, accentLeft }: { children: React.ReactNode; style?: React.CSSProperties; accentLeft?: string }) {
  return (
    <div style={{
      background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)',
      overflow: 'hidden', position: 'relative',
      ...(accentLeft ? { borderLeft: `3px solid ${accentLeft}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Card header with icon in colored bubble ─────────────────────────────────
function CardHeader({
  icon, title, accent, right,
}: { icon: React.ReactNode; title: string; accent: string; right?: React.ReactNode }) {
  const rgb = homeHexToRgb(accent);
  return (
    <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--t2)', flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px' }}>
      <div style={{ fontSize: 32, opacity: 0.55 }}>{emoji}</div>
      <div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500, textAlign: 'center' }}>{text}</div>
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
        cursor: 'pointer', transition: 'background .12s',
        minWidth: 0,
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
        boxShadow: `0 0 6px ${color}88`,
      }} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12, fontWeight: 500, color: 'var(--t1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      {companyName && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          color, flexShrink: 0, opacity: 0.75,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 80,
        }}>
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
            barBg = `linear-gradient(180deg, ${accentColor} 0%, rgba(${accentRgb},0.45) 100%)`;
            barShadow = `0 0 14px -2px rgba(${accentRgb}, 0.7)`;
          } else if (hasData) {
            barBg = 'linear-gradient(180deg, #30d158 0%, rgba(48,209,88,0.45) 100%)';
            barShadow = '0 0 10px -4px rgba(48,209,88,0.5)';
          } else {
            barBg = `linear-gradient(180deg, rgba(${accentRgb},0.15) 0%, rgba(${accentRgb},0.04) 100%)`;
          }
          const barHeight = hasData ? Math.max(8, pct * (CHART_H - 22)) : 6;

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
  const visibleIds = useVisibleWorkspaceIds();
  const activeTasks = tasks.filter(t => !t.archived && !t.inbox && isInLens(t, visibleIds));
  const todayTasks = activeTasks.filter(t => t.date === todayStr);
  const todayCount = todayTasks.length;
  const todayDone = todayTasks.filter(t => t.status === 'done').length;
  const openTasks = activeTasks.filter(t => t.status !== 'done');
  const overdue = activeTasks
    .filter(t => {
      try { return isBefore(parseISO(t.date), todayDate) && t.status !== 'done'; } catch { return false; }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

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
  const openLeads = leads.filter(l => l.stage !== 'fechado' && isInLens(l, visibleIds));
  const sortedOpenLeads = useMemo(() => {
    const stageOrder: Record<LeadStage, number> = { negociacao: 0, proposta: 1, contato: 2, prospeccao: 3, fechado: 4 };
    return [...openLeads].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]).slice(0, 5);
  }, [openLeads]);

  // ─── Ideas ───
  const ideasThisWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return ideas.filter(i => {
      try { return !i.deletedAt && isInLens(i, visibleIds) && parseISO(i.createdAt) >= start; } catch { return false; }
    });
  }, [ideas, visibleIds]);

  const ideaOfWeek = useMemo(() => {
    const candidates = ideas.filter(i => !i.deletedAt && isInLens(i, visibleIds));
    return deterministicPick(candidates, getISOWeek(new Date()));
  }, [ideas, visibleIds]);

  // ─── Pomodoro ───
  const pomodoroToday = useMemo(() => {
    return pomodoroSessions
      .filter(s => !s.isBreak && s.startedAt.startsWith(todayStr))
      .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  }, [pomodoroSessions, todayStr]);

  const pomodoroWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return pomodoroSessions
      .filter(s => {
        if (s.isBreak) return false;
        try { return parseISO(s.startedAt) >= start; } catch { return false; }
      })
      .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  }, [pomodoroSessions]);

  // ─── Helpers ───
  const companyColor = (id: string) => companies.find(c => c.id === id)?.color ?? accentColor;
  const companyNameFn = (id: string) => companies.find(c => c.id === id)?.name ?? '';

  const headerChips = [
    { label: 'Hoje',         value: todayCount,         color: accentColor,  rgb: accentRgb,      icon: <FiCheckCircle size={10} /> },
    { label: 'Em aberto',    value: openTasks.length,   color: '#ff9f0a',    rgb: '255,159,10',   icon: <FiClock size={10} /> },
    { label: 'Leads',        value: openLeads.length,   color: '#bf5af2',    rgb: '191,90,242',   icon: <FiUsers size={10} /> },
    { label: 'Ideias semana', value: ideasThisWeek.length, color: '#ffd60a', rgb: '255,214,10',   icon: <FiZap size={10} /> },
  ];

  const dayLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const dow = getDay(d);
      const labels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return `${labels[dow]} · ${format(d, "d MMM", { locale: ptBR })}`;
    } catch { return dateStr; }
  };

  // Progress bar width for today
  const todayProgress = todayCount > 0 ? (todayDone / todayCount) * 100 : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══ Header ══════════════════════════════════════════════════════════ */}
      <div style={{
        padding: '16px 20px',
        flexShrink: 0,
        borderBottom: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        background: `linear-gradient(135deg, rgba(${accentRgb},0.07) 0%, transparent 55%)`,
        boxShadow: '0 1px 0 var(--b2)',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 3 }}>Dashboard</div>
          {/* #14 — Saudação maior e mais expressiva */}
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
            Olá, <span style={{ color: accentColor }}>{firstName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* #10 — Chips com ícone */}
          {headerChips.map(k => (
            <div key={k.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 8,
              background: `rgba(${k.rgb},0.09)`, border: `1px solid rgba(${k.rgb},0.22)`,
            }}>
              <span style={{ color: k.color, display: 'flex', opacity: 0.8 }}>{k.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: k.color }}>{k.value}</span>
            </div>
          ))}
          <button
            onClick={() => onNavigate('tarefas')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: accentColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 16px rgba(${accentRgb},0.4)` }}>
            <FiPlus size={12} /> Nova
          </button>
        </div>
      </div>

      {/* ═══ Body ════════════════════════════════════════════════════════════ */}
      <div className="bento-grid bento-sidebar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', gridAutoRows: 'min-content' }}>

        {/* ─── MAIN COLUMN ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* #1 + #4 + #7 + #8 — Card Hoje com borda azul, fundo diferenciado, pill e progress bar */}
          <Card accentLeft={accentColor} style={{ background: `linear-gradient(160deg, rgba(${accentRgb},0.045) 0%, var(--s1) 40%)` }}>
            <CardHeader
              icon={<FiCheckCircle size={14} />}
              title="Hoje"
              accent={accentColor}
              right={
                todayCount > 0 ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: todayDone === todayCount ? '#30d15820' : `rgba(${accentRgb},0.15)`,
                    color: todayDone === todayCount ? '#30d158' : accentColor,
                    border: `1px solid ${todayDone === todayCount ? 'rgba(48,209,88,0.3)' : `rgba(${accentRgb},0.3)`}`,
                    borderRadius: 99, padding: '2px 9px',
                  }}>
                    {todayDone}/{todayCount}
                  </span>
                ) : undefined
              }
            />
            {/* #8 — Progress bar */}
            {todayCount > 0 && (
              <div style={{ height: 2, background: 'var(--b1)', flexShrink: 0, position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${todayProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${accentColor}, #30d158)`, borderRadius: '0 2px 2px 0' }}
                />
              </div>
            )}
            <div style={{ padding: '10px 10px 12px' }}>
              {todayTasks.length === 0 ? (
                <EmptyState emoji="☀️" text="Dia livre. Aproveite!" />
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
              icon={<FiTrendingUp size={14} />}
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
              icon={<FiUsers size={14} />}
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
                <EmptyState emoji="🎯" text="Nenhum lead em aberto." />
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
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageColor, flexShrink: 0, boxShadow: `0 0 6px ${stageColor}88` }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.name}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: stageColor, flexShrink: 0 }}>
                          {LEAD_STAGE_LABEL[lead.stage]}
                        </span>
                        {lead.temperature === 'quente' && <span style={{ fontSize: 11 }}>🔥</span>}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* #15 — Próximos 7 dias com timeline vertical */}
          <Card>
            <CardHeader
              icon={<FiClock size={14} />}
              title="Próximos 7 dias"
              accent="#64d2ff"
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {upcomingByDay.length === 0 ? (
                <EmptyState emoji="📅" text="Agenda livre nos próximos dias." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {upcomingByDay.map((group, gi) => (
                    <div key={group.date} style={{ display: 'flex', gap: 0 }}>
                      {/* Timeline: dot + line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, paddingTop: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64d2ff', boxShadow: '0 0 8px rgba(100,210,255,0.6)', flexShrink: 0 }} />
                        {gi < upcomingByDay.length - 1 && (
                          <div style={{ width: 1, flex: 1, background: 'linear-gradient(180deg, rgba(100,210,255,0.3) 0%, transparent 100%)', minHeight: 24, marginTop: 2 }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: gi < upcomingByDay.length - 1 ? 10 : 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#64d2ff', padding: '4px 10px 5px', opacity: 0.8 }}>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ─── RIGHT COLUMN ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* #11 — Pomodoro com fundo quente */}
          <Card style={{ background: 'linear-gradient(160deg, rgba(255,69,58,0.06) 0%, var(--s1) 50%)' }}>
            <CardHeader
              icon={<FiClock size={14} />}
              title="Pomodoro"
              accent="#ff453a"
            />
            <div style={{ padding: '14px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Hoje</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  {pomodoroToday}<span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginLeft: 3 }}>min</span>
                </div>
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--b1)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Semana</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  {pomodoroWeek}<span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginLeft: 3 }}>min</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Atrasadas */}
          <Card style={{ border: '1px solid rgba(255,69,58,0.25)', background: 'linear-gradient(160deg, rgba(255,69,58,0.04) 0%, var(--s1) 45%)' }}>
            <CardHeader
              icon={<FiAlertTriangle size={14} />}
              title="Atrasadas"
              accent="#ff453a"
              right={overdue.length > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ff453a', background: 'rgba(255,69,58,0.12)', borderRadius: 99, padding: '2px 8px', border: '1px solid rgba(255,69,58,0.25)' }}>
                  {overdue.length}
                </span>
              ) : undefined}
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {overdue.length === 0 ? (
                <EmptyState emoji="✅" text="Nada em atraso." />
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
                          cursor: 'pointer', transition: 'background .12s', minWidth: 0,
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

          {/* #13 — Ideia da semana com tag colorida do tipo */}
          <Card>
            <CardHeader
              icon={<FiZap size={14} />}
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
                <EmptyState emoji="💡" text="Nenhuma ideia ainda. Crie a primeira!" />
              ) : (() => {
                const tagCfg = IDEA_TAG_CONFIG[ideaOfWeek.tag];
                return (
                  <button
                    onClick={() => onNavigate('ideias')}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: 'rgba(255,214,10,0.06)',
                      border: '1px solid rgba(255,214,10,0.22)',
                      borderRadius: 10, padding: '12px 14px',
                      cursor: 'pointer', transition: 'all .15s',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.35)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.22)'; }}
                  >
                    {/* Tag colorida do tipo de ideia */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                        color: tagCfg.color, background: `${tagCfg.color}18`,
                        border: `1px solid ${tagCfg.color}30`,
                        borderRadius: 99, padding: '2px 8px',
                      }}>
                        {tagCfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ideaOfWeek.title || '(sem título)'}
                    </div>
                    {ideaOfWeek.description && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ideaOfWeek.description}
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>
          </Card>

          {/* #12 — Atalhos com hover de gradiente */}
          <Card>
            <CardHeader
              icon={<FiArrowRight size={14} />}
              title="Atalhos"
              accent={accentColor}
            />
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'Empresas', icon: <FiBriefcase size={16} />, page: 'empresas' as PageType, color: '#64C4FF', rgb: '100,196,255' },
                { label: 'CRM',      icon: <FiUsers size={16} />,     page: 'crm' as PageType,      color: '#bf5af2', rgb: '191,90,242' },
                { label: 'To Do',    icon: <FiCheckSquare size={16} />, page: 'todo' as PageType,   color: '#30d158', rgb: '48,209,88' },
                { label: 'Ideias',   icon: <FiZap size={16} />,       page: 'ideias' as PageType,   color: '#ffd60a', rgb: '255,214,10' },
              ]).map(s => (
                <button
                  key={s.label}
                  onClick={() => onNavigate(s.page)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '16px 8px', borderRadius: 10,
                    background: `rgba(${s.rgb},0.07)`, border: `1px solid rgba(${s.rgb},0.2)`,
                    color: s.color, cursor: 'pointer', transition: 'all .15s',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = `linear-gradient(160deg, rgba(${s.rgb},0.18) 0%, rgba(${s.rgb},0.07) 100%)`;
                    el.style.borderColor = `rgba(${s.rgb},0.4)`;
                    el.style.transform = 'translateY(-1px)';
                    el.style.boxShadow = `0 6px 20px rgba(${s.rgb},0.2)`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = `rgba(${s.rgb},0.07)`;
                    el.style.borderColor = `rgba(${s.rgb},0.2)`;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = 'none';
                  }}
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
