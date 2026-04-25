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
function Card({
  children, style, accentLeft, blueGlow, hero,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentLeft?: string;
  blueGlow?: boolean;
  hero?: boolean;
}) {
  // #4 — Borda azul nos cards importantes ; #7 — Glow azul sutil
  const baseShadow = blueGlow
    ? '0 0 0 1px rgba(53,107,255,0.10), 0 8px 28px rgba(0,0,0,0.32), 0 0 30px rgba(53,107,255,0.05)'
    : '0 1px 0 rgba(255,255,255,0.02), 0 6px 22px rgba(0,0,0,0.28)';
  return (
    <div style={{
      background: hero ? undefined : 'var(--s1)',
      borderRadius: 16,
      border: blueGlow ? '1px solid rgba(53,107,255,0.28)' : '1px solid var(--b2)',
      overflow: 'hidden', position: 'relative',
      boxShadow: baseShadow,
      ...(accentLeft ? { borderLeft: `3px solid ${accentLeft}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Card header with icon in colored bubble ─────────────────────────────────
function CardHeader({
  icon, title, accent, right, white,
}: { icon: React.ReactNode; title: string; accent: string; right?: React.ReactNode; white?: boolean }) {
  const rgb = homeHexToRgb(accent);
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: white ? '1px solid rgba(255,255,255,0.14)' : '1px solid var(--b1)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: white ? 'rgba(255,255,255,0.18)' : `rgba(${rgb},0.14)`,
        border: white ? '1px solid rgba(255,255,255,0.28)' : `1px solid rgba(${rgb},0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: white ? '#fff' : accent,
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase',
        color: white ? 'rgba(255,255,255,0.95)' : '#ffffff',
        flex: 1,
      }}>{title}</span>
      {right}
    </div>
  );
}

// ─── Empty state with optional CTA ──────────────────────────────────────────
function EmptyState({ emoji, text, cta, onCta }: { emoji: string; text: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px' }}>
      <div style={{ fontSize: 36, opacity: 0.85 }}>{emoji}</div>
      {/* #8 — Empty state em branco */}
      <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 600, textAlign: 'center', letterSpacing: '-0.1px' }}>{text}</div>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            marginTop: 4, padding: '7px 14px', borderRadius: 8,
            background: 'rgba(53,107,255,0.18)',
            border: '1px solid rgba(53,107,255,0.4)',
            color: '#ffffff', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.4px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.32)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(53,107,255,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.18)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(53,107,255,0.4)';
          }}
        >
          <FiPlus size={11} /> {cta}
        </button>
      )}
    </div>
  );
}

// ─── Task row ───────────────────────────────────────────────────────────────
function TaskRow({
  task, color, title, companyName, showDate, onClick, onBlue,
}: {
  task: Task; color: string; title: string; companyName: string;
  showDate?: boolean; onClick?: () => void; onBlue?: boolean;
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
        padding: '9px 11px',
        background: hovered
          ? (onBlue ? 'rgba(255,255,255,0.14)' : 'var(--s2)')
          : (onBlue ? 'rgba(255,255,255,0.06)' : 'transparent'),
        border: onBlue ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        borderRadius: 9,
        cursor: 'pointer', transition: 'background .12s, border-color .12s',
        minWidth: 0,
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: onBlue ? '#ffffff' : color, flexShrink: 0,
        boxShadow: onBlue ? '0 0 6px rgba(255,255,255,0.6)' : `0 0 6px ${color}88`,
      }} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 12.5, fontWeight: 500,
        color: onBlue ? '#ffffff' : '#ffffff',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      {companyName && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: onBlue ? 'rgba(255,255,255,0.85)' : color,
          flexShrink: 0, opacity: 0.85,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 80,
        }}>
          {companyName}
        </span>
      )}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 600,
        color: onBlue ? 'rgba(255,255,255,0.92)' : STATUS_COLOR[task.status],
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: onBlue ? '#fff' : STATUS_COLOR[task.status] }} />
        {STATUS_LABEL[task.status]}
      </span>
      {showDate && (
        <span style={{ fontSize: 10, color: onBlue ? 'rgba(255,255,255,0.7)' : 'var(--t3)', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
          {format(parseISO(task.date), "d MMM", { locale: ptBR })}
        </span>
      )}
    </button>
  );
}

// ─── Weekly bar chart ───────────────────────────────────────────────────────
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
        <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 600, opacity: 0.85 }}>{total} concluída{total !== 1 ? 's' : ''} esta semana</span>
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
            barBg = `linear-gradient(180deg, rgba(${accentRgb},0.18) 0%, rgba(${accentRgb},0.04) 100%)`;
          }
          const barHeight = hasData ? Math.max(8, pct * (CHART_H - 22)) : 6;

          return (
            <div key={dateStr} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-end', gap: 4, height: '100%', position: 'relative',
            }}>
              {hasData && (
                <span style={{
                  position: 'absolute', bottom: barHeight + 22,
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
                fontWeight: isToday ? 800 : 600,
                color: isToday ? accentColor : 'rgba(255,255,255,0.55)',
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

  const firstName = useMemo(() => {
    if (userName && userName.trim()) return userName.trim().split(' ')[0];
    if (user?.user_metadata?.name) return String(user.user_metadata.name).split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'visitante';
  }, [user, userName]);

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

  const openLeads = leads.filter(l => l.stage !== 'fechado' && isInLens(l, visibleIds));
  const sortedOpenLeads = useMemo(() => {
    const stageOrder: Record<LeadStage, number> = { negociacao: 0, proposta: 1, contato: 2, prospeccao: 3, fechado: 4 };
    return [...openLeads].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]).slice(0, 5);
  }, [openLeads]);

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

  const companyColor = (id: string) => companies.find(c => c.id === id)?.color ?? accentColor;
  const companyNameFn = (id: string) => companies.find(c => c.id === id)?.name ?? '';

  // #5 — Stat tiles maiores (pra usar dentro do hero)
  const statTiles = [
    { label: 'Hoje',         value: todayCount,         icon: <FiCheckCircle size={14} /> },
    { label: 'Em aberto',    value: openTasks.length,   icon: <FiClock size={14} /> },
    { label: 'Leads',        value: openLeads.length,   icon: <FiUsers size={14} /> },
    { label: 'Ideias semana', value: ideasThisWeek.length, icon: <FiZap size={14} /> },
  ];

  const dayLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const dow = getDay(d);
      const labels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return `${labels[dow]} · ${format(d, "d MMM", { locale: ptBR })}`;
    } catch { return dateStr; }
  };

  const todayProgress = todayCount > 0 ? (todayDone / todayCount) * 100 : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══ Body ════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>

        {/* #1 — HERO CARD com gradiente azul forte e saudação grande */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, #1d4ed8 60%, #1e3a8a 100%)`,
          borderRadius: 18,
          padding: '24px 26px 22px',
          marginBottom: 18,
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 12px 40px rgba(${accentRgb},0.28), 0 0 0 1px rgba(255,255,255,0.06) inset`,
        }}>
          {/* Decoração: bolha de luz */}
          <div style={{
            position: 'absolute', top: -60, right: -40, width: 220, height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, left: -30, width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,196,255,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Dashboard</div>
              {/* #1 — saudação gigante em branco */}
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.9px', lineHeight: 1.05 }}>
                Olá, <span style={{ color: '#ffffff' }}>{firstName}</span>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>.</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 6, fontWeight: 500 }}>
                {todayCount === 0
                  ? 'Nenhuma tarefa pra hoje. Que tal planejar a semana?'
                  : `${todayCount} ${todayCount === 1 ? 'tarefa' : 'tarefas'} pra hoje · ${todayDone} ${todayDone === 1 ? 'concluída' : 'concluídas'}`}
              </div>
            </div>

            {/* #6 — Botão Nova com glow azul */}
            <button
              onClick={() => onNavigate('tarefas')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '11px 20px', borderRadius: 11,
                background: '#ffffff', border: 'none',
                color: accentColor, fontSize: 13, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.4) inset',
                letterSpacing: '-0.1px', transition: 'transform .12s, box-shadow .12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.5) inset';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.4) inset';
              }}
            >
              <FiPlus size={14} /> Nova tarefa
            </button>
          </div>

          {/* #5 — Stat tiles grandes em vidro fosco */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {statTiles.map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', lineHeight: 1.05, letterSpacing: '-0.6px' }}>
                    {s.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Grid principal ═════════════════════════════════════════════════ */}
        <div className="bento-grid bento-sidebar" style={{ gridAutoRows: 'min-content' }}>

          {/* ─── MAIN COLUMN ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* #2 — Card "Hoje" PROTAGONISTA: fundo azul sólido com gradiente */}
            <div style={{
              borderRadius: 16,
              background: `linear-gradient(155deg, ${accentColor} 0%, #1e40af 100%)`,
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: `0 16px 40px rgba(${accentRgb},0.28), 0 0 0 1px rgba(255,255,255,0.05) inset`,
              overflow: 'hidden', position: 'relative',
            }}>
              {/* Glow decoração */}
              <div style={{
                position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <CardHeader
                white
                icon={<FiCheckCircle size={14} />}
                title="Hoje"
                accent="#ffffff"
                right={
                  todayCount > 0 ? (
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      background: todayDone === todayCount ? '#30d158' : 'rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 99, padding: '3px 11px',
                    }}>
                      {todayDone}/{todayCount}
                    </span>
                  ) : undefined
                }
              />

              {todayCount > 0 && (
                <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', position: 'relative' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${todayProgress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #ffffff, #30d158)' }}
                  />
                </div>
              )}

              <div style={{ padding: '12px 12px 14px', position: 'relative' }}>
                {todayTasks.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 16px' }}>
                    <div style={{ fontSize: 38 }}>☀️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
                      Dia livre. Aproveite!
                    </div>
                    <button
                      onClick={() => onNavigate('tarefas')}
                      style={{
                        marginTop: 4, padding: '8px 16px', borderRadius: 9,
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.32)',
                        color: '#ffffff', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.4px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <FiPlus size={11} /> Adicionar tarefa
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {todayTasks.slice(0, 8).map((task, i) => (
                      <motion.div key={task.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <TaskRow
                          task={task}
                          color={companyColor(task.companyId)}
                          title={getTaskTitle(task, companies, subClients)}
                          companyName={companyNameFn(task.companyId)}
                          onClick={() => onTaskClick(task)}
                          onBlue
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Esta semana */}
            <Card blueGlow>
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>
                    Ver <FiArrowRight size={11} />
                  </button>
                }
              />
              <div style={{ padding: '10px 10px 12px' }}>
                {sortedOpenLeads.length === 0 ? (
                  <EmptyState emoji="🎯" text="Nenhum lead em aberto." cta="Criar lead" onCta={() => onNavigate('crm')} />
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
                            padding: '9px 11px', borderRadius: 9,
                            background: 'transparent', border: '1px solid transparent',
                            cursor: 'pointer', transition: 'background .12s',
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageColor, flexShrink: 0, boxShadow: `0 0 6px ${stageColor}88` }} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.name}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: stageColor, flexShrink: 0 }}>
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

            {/* Próximos 7 dias */}
            <Card>
              <CardHeader
                icon={<FiClock size={14} />}
                title="Próximos 7 dias"
                accent="#64d2ff"
              />
              <div style={{ padding: '10px 10px 12px' }}>
                {upcomingByDay.length === 0 ? (
                  <EmptyState emoji="📅" text="Agenda livre nos próximos dias." cta="Adicionar tarefa" onCta={() => onNavigate('tarefas')} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {upcomingByDay.map((group, gi) => (
                      <div key={group.date} style={{ display: 'flex', gap: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, paddingTop: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64d2ff', boxShadow: '0 0 8px rgba(100,210,255,0.6)', flexShrink: 0 }} />
                          {gi < upcomingByDay.length - 1 && (
                            <div style={{ width: 1, flex: 1, background: 'linear-gradient(180deg, rgba(100,210,255,0.35) 0%, transparent 100%)', minHeight: 24, marginTop: 2 }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: gi < upcomingByDay.length - 1 ? 10 : 0 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#64d2ff', padding: '4px 10px 5px' }}>
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

            {/* Pomodoro */}
            <Card style={{ background: 'linear-gradient(160deg, rgba(255,69,58,0.08) 0%, var(--s1) 50%)' }}>
              <CardHeader
                icon={<FiClock size={14} />}
                title="Pomodoro"
                accent="#ff453a"
              />
              <div style={{ padding: '14px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Hoje</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                    {pomodoroToday}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginLeft: 3 }}>min</span>
                  </div>
                </div>
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Semana</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.6px', lineHeight: 1.1 }}>
                    {pomodoroWeek}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginLeft: 3 }}>min</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Atrasadas */}
            <Card style={{ border: '1px solid rgba(255,69,58,0.32)', background: 'linear-gradient(160deg, rgba(255,69,58,0.07) 0%, var(--s1) 45%)' }}>
              <CardHeader
                icon={<FiAlertTriangle size={14} />}
                title="Atrasadas"
                accent="#ff453a"
                right={overdue.length > 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', background: '#ff453a', borderRadius: 99, padding: '2px 9px' }}>
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
                            padding: '9px 11px', borderRadius: 9,
                            background: 'transparent', border: '1px solid transparent',
                            cursor: 'pointer', transition: 'background .12s', minWidth: 0,
                          }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.10)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff453a', flexShrink: 0, boxShadow: '0 0 6px rgba(255,69,58,0.6)' }} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getTaskTitle(task, companies, subClients)}
                          </span>
                          <span style={{ fontSize: 10, color: '#ff453a', fontWeight: 800, flexShrink: 0 }}>
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
                icon={<FiZap size={14} />}
                title="Ideia da semana"
                accent="#ffd60a"
                right={
                  <button onClick={() => onNavigate('ideias')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>
                    Ver <FiArrowRight size={11} />
                  </button>
                }
              />
              <div style={{ padding: '14px 16px 16px' }}>
                {!ideaOfWeek ? (
                  <EmptyState emoji="💡" text="Nenhuma ideia ainda." cta="Criar primeira" onCta={() => onNavigate('ideias')} />
                ) : (() => {
                  const tagCfg = IDEA_TAG_CONFIG[ideaOfWeek.tag];
                  return (
                    <button
                      onClick={() => onNavigate('ideias')}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: 'rgba(255,214,10,0.08)',
                        border: '1px solid rgba(255,214,10,0.28)',
                        borderRadius: 11, padding: '14px 16px',
                        cursor: 'pointer', transition: 'all .15s',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.13)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.45)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.28)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase',
                          color: tagCfg.color, background: `${tagCfg.color}22`,
                          border: `1px solid ${tagCfg.color}40`,
                          borderRadius: 99, padding: '2px 9px',
                        }}>
                          {tagCfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ideaOfWeek.title || '(sem título)'}
                      </div>
                      {ideaOfWeek.description && (
                        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ideaOfWeek.description}
                        </div>
                      )}
                    </button>
                  );
                })()}
              </div>
            </Card>

            {/* Atalhos */}
            <Card>
              <CardHeader
                icon={<FiArrowRight size={14} />}
                title="Atalhos"
                accent={accentColor}
              />
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { label: 'Empresas', icon: <FiBriefcase size={18} />, page: 'empresas' as PageType, color: '#64C4FF', rgb: '100,196,255' },
                  { label: 'CRM',      icon: <FiUsers size={18} />,     page: 'crm' as PageType,      color: '#bf5af2', rgb: '191,90,242' },
                  { label: 'To Do',    icon: <FiCheckSquare size={18} />, page: 'todo' as PageType,   color: '#30d158', rgb: '48,209,88' },
                  { label: 'Ideias',   icon: <FiZap size={18} />,       page: 'ideias' as PageType,   color: '#ffd60a', rgb: '255,214,10' },
                ]).map(s => (
                  <button
                    key={s.label}
                    onClick={() => onNavigate(s.page)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '18px 8px', borderRadius: 11,
                      background: `rgba(${s.rgb},0.10)`, border: `1px solid rgba(${s.rgb},0.26)`,
                      color: s.color, cursor: 'pointer', transition: 'all .15s',
                      position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = `linear-gradient(160deg, rgba(${s.rgb},0.25) 0%, rgba(${s.rgb},0.10) 100%)`;
                      el.style.borderColor = `rgba(${s.rgb},0.5)`;
                      el.style.transform = 'translateY(-1px)';
                      el.style.boxShadow = `0 8px 24px rgba(${s.rgb},0.25)`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = `rgba(${s.rgb},0.10)`;
                      el.style.borderColor = `rgba(${s.rgb},0.26)`;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = 'none';
                    }}
                  >
                    {s.icon}
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#ffffff' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}
