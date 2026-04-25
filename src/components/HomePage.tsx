import { useMemo, useState } from 'react';
import { format, parseISO, isBefore, startOfToday, addDays, getDay, startOfWeek, subWeeks, subMonths, startOfMonth, endOfMonth, differenceInCalendarDays, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  FiPlus, FiZap, FiAlertTriangle, FiArrowRight, FiArrowUp, FiArrowDown,
  FiCheckSquare, FiUsers, FiBriefcase, FiClock, FiCheckCircle,
  FiSun, FiTarget, FiCalendar, FiDollarSign, FiTrendingUp, FiActivity,
  FiPieChart, FiAlertCircle, FiRotateCw,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';
import { useInvoicesStore } from '../store/invoices';
import { useContentApprovalsStore } from '../store/contentApprovals';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import { useAuthStore } from '../store/auth';
import { getTaskTitle } from '../types';
import type { Task, PageType, LeadStage } from '../types';

const homeHexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const v = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(v.slice(0, 2), 16) || 0;
  const g = parseInt(v.slice(2, 4), 16) || 0;
  const b = parseInt(v.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
};

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRLfull = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  onTaskClick: (task: Task) => void;
  onNavigate: (page: PageType) => void;
}

const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  prospeccao: 'Prospecção', contato: 'Contato', proposta: 'Proposta',
  negociacao: 'Negociação', fechado: 'Fechado',
};
const LEAD_STAGE_COLOR: Record<LeadStage, string> = {
  prospeccao: '#64d2ff', contato: '#ff9f0a', proposta: '#bf5af2',
  negociacao: '#ff375f', fechado: '#30d158',
};

// ═══ Card primitive ═══════════════════════════════════════════════════════
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)',
      overflow: 'hidden', position: 'relative',
      boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 6px 22px rgba(0,0,0,0.28)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, accent, right }: { icon: React.ReactNode; title: string; accent: string; right?: React.ReactNode }) {
  const rgb = homeHexToRgb(accent);
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#ffffff', flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

// ═══ KPI tile (top row metrics) ═══════════════════════════════════════════
function KpiTile({
  label, value, delta, deltaPositiveIsGood = true, icon, color, sparkline, suffix,
}: {
  label: string; value: string | number;
  delta?: number;            // % variation, can be negative
  deltaPositiveIsGood?: boolean;
  icon: React.ReactNode; color: string;
  sparkline?: number[];
  suffix?: string;
}) {
  const rgb = homeHexToRgb(color);
  const deltaSign = delta === undefined ? 0 : (delta > 0 ? 1 : delta < 0 ? -1 : 0);
  const deltaGood = deltaPositiveIsGood ? deltaSign > 0 : deltaSign < 0;
  const deltaColor = deltaSign === 0 ? 'rgba(255,255,255,0.4)' : (deltaGood ? '#30d158' : '#ff453a');

  return (
    <div style={{
      borderRadius: 14,
      background: `linear-gradient(160deg, rgba(${rgb},0.10) 0%, var(--s1) 60%)`,
      border: `1px solid rgba(${rgb},0.22)`,
      padding: '14px 16px', position: 'relative', overflow: 'hidden',
      boxShadow: `0 6px 18px rgba(${rgb},0.08), 0 1px 0 rgba(255,255,255,0.04) inset`,
      display: 'flex', flexDirection: 'column', gap: 8,
      minHeight: 110,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: `rgba(${rgb},0.18)`, border: `1px solid rgba(${rgb},0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.6px', lineHeight: 1 }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{suffix}</span>}
      </div>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: deltaColor }}>
          {deltaSign > 0 ? <FiArrowUp size={10} /> : deltaSign < 0 ? <FiArrowDown size={10} /> : null}
          {deltaSign === 0 ? '—' : `${Math.abs(delta).toFixed(0)}% vs anterior`}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 4 }}>
          <Sparkline values={sparkline} color={color} />
        </div>
      )}
    </div>
  );
}

// ═══ Mini sparkline (SVG) ═════════════════════════════════════════════════
function Sparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  const rgb = homeHexToRgb(color);
  const W = 100, H = height;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return [x, y];
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const areaD = `${pathD} L ${W},${H} L 0,${H} Z`;
  const id = `spark-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgba(${rgb},0.4)`} />
          <stop offset="100%" stopColor={`rgba(${rgb},0)`} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══ Area chart (faturamento) ═════════════════════════════════════════════
function AreaChart({
  series, accentColor, accentRgb, height = 180, formatY = (v: number) => fmtBRL(v),
}: {
  series: { label: string; value: number }[];
  accentColor: string; accentRgb: string; height?: number;
  formatY?: (v: number) => string;
}) {
  // Use a tall viewBox proportionally — preserveAspectRatio="none" on SVG;
  // text is rendered as HTML (não distorce em containers largos).
  const W = 600, H = height, padL = 0, padR = 0, padT = 14, padB = 14;
  const max = Math.max(...series.map(s => s.value), 1);
  const niceMax = Math.ceil(max * 1.1 / 1000) * 1000 || 1000;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const points = series.map((s, i) => {
    const x = padL + (i / Math.max(1, series.length - 1)) * innerW;
    const y = padT + (1 - s.value / niceMax) * innerH;
    return { x, y, xPct: (x / W) * 100, yPct: (y / H) * 100, ...s };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x},${padT + innerH} L ${padL},${padT + innerH} Z`;
  const yTicks = [0, 0.5, 1].map(t => Math.round(niceMax * t));

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8, padding: '4px 8px 0' }}>
      {/* Y-axis labels (HTML) */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height, paddingTop: padT, paddingBottom: padB + 22, flexShrink: 0 }}>
        {yTicks.slice().reverse().map((t, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', lineHeight: 1 }}>
            {formatY(t)}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgba(${accentRgb},0.45)`} />
              <stop offset="100%" stopColor={`rgba(${accentRgb},0.02)`} />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {yTicks.map((_, i) => {
            const y = padT + (i / (yTicks.length - 1)) * innerH;
            return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />;
          })}
          <path d={areaD} fill="url(#area-fill)" />
          <path d={pathD} fill="none" stroke={accentColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Data points (HTML, prevents distortion) */}
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.xPct}%`, top: `${p.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 9, height: 9, borderRadius: '50%',
              background: accentColor,
              border: '2px solid #0b1028',
              boxShadow: `0 0 0 2px rgba(${accentRgb},0.18)`,
              pointerEvents: 'none',
            }}
            title={`${p.label}: ${formatY(p.value)}`}
          />
        ))}

        {/* X-axis labels (HTML) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {series.map((s, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ CRM funnel (horizontal stages) ═══════════════════════════════════════
function CrmFunnel({ stages, onClick }: { stages: { stage: LeadStage; count: number; value: number }[]; onClick?: () => void }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '14px 16px 16px' }}>
      {stages.map(s => {
        const color = LEAD_STAGE_COLOR[s.stage];
        const rgb = homeHexToRgb(color);
        const pct = (s.count / max) * 100;
        return (
          <div key={s.stage} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px' }}>
                {LEAD_STAGE_LABEL[s.stage]}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {s.count} {s.value > 0 && `· ${fmtBRL(s.value)}`}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, pct)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${color}, rgba(${rgb},0.6))`,
                  boxShadow: `0 0 10px rgba(${rgb},0.4)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ Donut (distribuição por empresa) ═════════════════════════════════════
function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const R = 60, STROKE = 18;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px 16px' }}>
      <svg viewBox={`0 0 ${R * 2 + STROKE} ${R * 2 + STROKE}`} width={140} height={140} style={{ flexShrink: 0 }}>
        <g transform={`translate(${R + STROKE / 2}, ${R + STROKE / 2}) rotate(-90)`}>
          <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
          {data.map((d, i) => {
            const frac = d.value / Math.max(1, total);
            const dash = frac * C;
            const offset = -acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                cx={0} cy={0} r={R} fill="none"
                stroke={d.color} strokeWidth={STROKE}
                strokeDasharray={`${dash} ${C}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" fontSize={20} fontWeight={800} fill="#ffffff">{total}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.5)" letterSpacing="1.2px">TAREFAS</text>
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.slice(0, 6).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0, boxShadow: `0 0 6px ${d.color}88` }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: '#ffffff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, flexShrink: 0 }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Heatmap multi-view ═══════════════════════════════════════════════════
type HeatmapView = 'anual' | 'mensal' | 'semanal' | 'diario';

function ProductivityHeatmap({ counts }: { counts: Map<string, number> }) {
  const [view, setView] = useState<HeatmapView>('anual');
  const today = new Date();
  const allValues = Array.from(counts.values());
  const max = Math.max(...allValues, 1);

  const cellColor = (c: number) => {
    if (c === 0) return 'rgba(255,255,255,0.05)';
    const intensity = c / max;
    if (intensity < 0.25) return 'rgba(48,209,88,0.28)';
    if (intensity < 0.5) return 'rgba(48,209,88,0.5)';
    if (intensity < 0.75) return 'rgba(48,209,88,0.75)';
    return '#30d158';
  };
  const get = (d: Date) => counts.get(format(d, 'yyyy-MM-dd')) ?? 0;

  // ─── Anual: 52 semanas (365 dias) ─────
  const renderAnual = () => {
    const start = subDays(startOfWeek(today, { weekStartsOn: 1 }), 51 * 7);
    const days = eachDayOfInterval({ start, end: today });
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    days.forEach(d => {
      currentWeek.push(d);
      if (getDay(d) === 0) { weeks.push(currentWeek); currentWeek = []; }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return (
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: 7 }).map((_, di) => {
              const d = week[di];
              if (!d) return <div key={di} style={{ width: 10, height: 10 }} />;
              const c = get(d);
              return (
                <div key={di}
                  title={`${format(d, 'dd/MM/yyyy')}: ${c} concluída${c !== 1 ? 's' : ''}`}
                  style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(c) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ─── Mensal: calendário do mês corrente ─────
  const renderMensal = () => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridDays = eachDayOfInterval({ start: gridStart, end: monthEnd });
    // Pad to multiple of 7
    while (gridDays.length % 7 !== 0) gridDays.push(addDays(gridDays[gridDays.length - 1], 1));

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(l => (
            <div key={l} style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: '0.5px' }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {gridDays.map((d, i) => {
            const inMonth = d >= monthStart && d <= monthEnd;
            const c = inMonth ? get(d) : 0;
            const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            return (
              <div key={i}
                title={`${format(d, 'dd/MM/yyyy')}: ${c} concluída${c !== 1 ? 's' : ''}`}
                style={{
                  aspectRatio: '1', borderRadius: 6,
                  background: inMonth ? cellColor(c) : 'transparent',
                  border: isToday ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: !inMonth ? 'transparent' : c > 0 ? '#ffffff' : 'rgba(255,255,255,0.4)',
                }}
              >
                {d.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Semanal: 7 dias da semana atual em barras ─────
  const renderSemanal = () => {
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(ws, i));
    const weekMax = Math.max(...days.map(d => get(d)), 1);
    return (
      <div style={{ display: 'flex', gap: 8, height: 130, alignItems: 'flex-end' }}>
        {days.map((d, i) => {
          const c = get(d);
          const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const h = c === 0 ? 8 : Math.max(14, (c / weekMax) * 100);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: c > 0 ? '#30d158' : 'rgba(255,255,255,0.4)' }}>
                {c}
              </span>
              <motion.div
                initial={{ height: 4 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  background: c > 0
                    ? 'linear-gradient(180deg, #30d158 0%, rgba(48,209,88,0.4) 100%)'
                    : 'rgba(255,255,255,0.06)',
                  borderTopLeftRadius: 6, borderTopRightRadius: 6,
                  boxShadow: c > 0 ? '0 0 12px rgba(48,209,88,0.4)' : 'none',
                  border: isToday ? '1px solid rgba(255,255,255,0.4)' : 'none',
                }}
              />
              <span style={{ fontSize: 9, fontWeight: isToday ? 800 : 600, color: isToday ? '#ffffff' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {format(d, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Diário: hoje + 6 dias anteriores em lista ─────
  const renderDiario = () => {
    const days = Array.from({ length: 7 }).map((_, i) => subDays(today, i));
    const maxD = Math.max(...days.map(d => get(d)), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((d, i) => {
          const c = get(d);
          const isToday = i === 0;
          const pct = (c / maxD) * 100;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 56, fontSize: 10, fontWeight: 700, color: isToday ? '#ffffff' : 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                {isToday ? 'Hoje' : format(d, "d MMM", { locale: ptBR })}
              </div>
              <div style={{ flex: 1, height: 18, borderRadius: 5, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(c > 0 ? 4 : 0, pct)}%` }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  style={{
                    height: '100%',
                    background: c > 0 ? 'linear-gradient(90deg, #30d158, rgba(48,209,88,0.5))' : 'transparent',
                    boxShadow: c > 0 ? '0 0 10px rgba(48,209,88,0.4)' : 'none',
                  }}
                />
              </div>
              <div style={{ width: 22, fontSize: 11, fontWeight: 800, color: c > 0 ? '#30d158' : 'rgba(255,255,255,0.4)', textAlign: 'right', flexShrink: 0 }}>
                {c}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const VIEWS: { id: HeatmapView; label: string }[] = [
    { id: 'anual',   label: 'Anual' },
    { id: 'mensal',  label: 'Mensal' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'diario',  label: 'Por dia' },
  ];

  return (
    <div style={{ padding: '12px 16px 16px' }}>
      {/* View selector */}
      <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
        {VIEWS.map(v => (
          <button key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 7,
              background: view === v.id ? 'rgba(48,209,88,0.18)' : 'transparent',
              border: view === v.id ? '1px solid rgba(48,209,88,0.35)' : '1px solid transparent',
              color: view === v.id ? '#30d158' : 'rgba(255,255,255,0.6)',
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all .12s',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'anual' && renderAnual()}
      {view === 'mensal' && renderMensal()}
      {view === 'semanal' && renderSemanal()}
      {view === 'diario' && renderDiario()}

      {view === 'anual' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
          <span>52 semanas · {Array.from(counts.values()).reduce((s, n) => s + n, 0)} concluídas</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Menos</span>
            {['rgba(255,255,255,0.05)', 'rgba(48,209,88,0.28)', 'rgba(48,209,88,0.5)', 'rgba(48,209,88,0.75)', '#30d158'].map((bg, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />
            ))}
            <span>Mais</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Progress ring (pomodoro daily goal) ══════════════════════════════════
function ProgressRing({ value, goal, color }: { value: number; goal: number; color: string }) {
  const R = 26, STROKE = 5;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, value / Math.max(1, goal));
  return (
    <svg viewBox={`0 0 ${R * 2 + STROKE} ${R * 2 + STROKE}`} width={62} height={62}>
      <g transform={`translate(${R + STROKE / 2}, ${R + STROKE / 2}) rotate(-90)`}>
        <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
        <circle
          cx={0} cy={0} r={R} fill="none"
          stroke={color} strokeWidth={STROKE}
          strokeDasharray={`${pct * C} ${C}`}
          strokeLinecap="round"
        />
      </g>
      <text x="50%" y="50%" textAnchor="middle" dy="0.34em" fontSize={11} fontWeight={800} fill="#ffffff">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ═══ HomePage ═════════════════════════════════════════════════════════════
export function HomePage({ onTaskClick, onNavigate }: Props) {
  const {
    tasks, companies, subClients, leads, accentColor, pomodoroSessions, userName,
  } = useTaskStore();
  const { ideas } = useIdeasStore();
  const { invoices } = useInvoicesStore();
  const { approvals } = useContentApprovalsStore();
  const { user } = useAuthStore();

  const accentRgb = homeHexToRgb(accentColor);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDate = startOfToday();

  // ─── Greeting ─────────────────────────────────────────────────────────
  const firstName = useMemo(() => {
    if (userName && userName.trim()) return userName.trim().split(' ')[0];
    if (user?.user_metadata?.name) return String(user.user_metadata.name).split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'visitante';
  }, [user, userName]);

  // ─── Filters by lens ──────────────────────────────────────────────────
  const visibleIds = useVisibleWorkspaceIds();
  const activeTasks = tasks.filter(t => !t.archived && !t.inbox && isInLens(t, visibleIds));
  const visibleInvoices = invoices.filter(i => !i.deletedAt && isInLens(i, visibleIds));
  const visibleApprovals = approvals.filter(a => !a.deletedAt && isInLens(a, visibleIds));
  const visibleCompanies = companies.filter(c => !c.archived && !c.deletedAt && isInLens(c, visibleIds));
  const visibleLeads = leads.filter(l => isInLens(l, visibleIds));

  // ─── #1 Receita do mês ────────────────────────────────────────────────
  const revenue = useMemo(() => {
    const start = startOfMonth(new Date());
    const prevStart = startOfMonth(subMonths(new Date(), 1));
    const prevEnd = endOfMonth(subMonths(new Date(), 1));
    const sumPaid = (from: Date, to: Date | null = null) =>
      visibleInvoices
        .filter(i => i.status === 'paga' && i.paidAt && (() => {
          try {
            const d = parseISO(i.paidAt);
            return d >= from && (to ? d <= to : true);
          } catch { return false; }
        })())
        .reduce((s, i) => s + i.total, 0);
    const current = sumPaid(start);
    const prev = sumPaid(prevStart, prevEnd);
    const delta = prev > 0 ? ((current - prev) / prev) * 100 : (current > 0 ? 100 : 0);
    // Sparkline: 7 dias
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
    const spark = days.map(d => {
      return visibleInvoices
        .filter(inv => inv.status === 'paga' && inv.paidAt?.startsWith(d))
        .reduce((s, inv) => s + inv.total, 0);
    });
    return { current, prev, delta, spark };
  }, [visibleInvoices]);

  // ─── #2 Tarefas concluídas (semana) ───────────────────────────────────
  const tasksDoneStats = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    const wsPrev = subWeeks(ws, 1);
    const inRange = (t: Task, from: Date, to: Date) => {
      try { const d = parseISO(t.date); return d >= from && d < to && t.status === 'done'; } catch { return false; }
    };
    const nextWs = addDays(ws, 7);
    const current = activeTasks.filter(t => inRange(t, ws, nextWs)).length;
    const prev = activeTasks.filter(t => inRange(t, wsPrev, ws)).length;
    const delta = prev > 0 ? ((current - prev) / prev) * 100 : (current > 0 ? 100 : 0);
    const spark = Array.from({ length: 7 }).map((_, i) => {
      const d = format(addDays(ws, i), 'yyyy-MM-dd');
      return activeTasks.filter(t => t.status === 'done' && t.date === d).length;
    });
    return { current, delta, spark };
  }, [activeTasks]);

  // ─── #3 Taxa de aprovação (1ª tentativa) ──────────────────────────────
  const approvalRate = useMemo(() => {
    const decided = visibleApprovals.filter(a => a.decidedAt && (a.status === 'aprovado' || a.status === 'postado' || a.status === 'alteracao'));
    if (decided.length === 0) return { rate: 0, total: 0 };
    const firstTry = decided.filter(a => a.status === 'aprovado' || a.status === 'postado').length;
    return { rate: Math.round((firstTry / decided.length) * 100), total: decided.length };
  }, [visibleApprovals]);

  // ─── #4 Horas focadas (pomodoro) ──────────────────────────────────────
  const pomodoroToday = useMemo(() => {
    return pomodoroSessions
      .filter(s => !s.isBreak && s.startedAt.startsWith(todayStr))
      .reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  }, [pomodoroSessions, todayStr]);
  const POMODORO_GOAL = 120;

  // ─── #5 Faturamento últimos 6 meses ───────────────────────────────────
  const revenue6m = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM', { locale: ptBR }) };
    });
    return months.map(m => {
      const value = visibleInvoices
        .filter(i => i.status === 'paga' && i.paidAt && (() => {
          try { const d = parseISO(i.paidAt); return d >= m.start && d <= m.end; } catch { return false; }
        })())
        .reduce((s, i) => s + i.total, 0);
      return { label: m.label, value };
    });
  }, [visibleInvoices]);

  // ─── #6 Pipeline CRM ──────────────────────────────────────────────────
  const pipeline = useMemo(() => {
    const stages: LeadStage[] = ['prospeccao', 'contato', 'proposta', 'negociacao', 'fechado'];
    return stages.map(stage => {
      const ls = visibleLeads.filter(l => l.stage === stage);
      const value = ls.reduce((s, l) => s + (l.budget ? parseFloat(String(l.budget).replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0), 0);
      return { stage, count: ls.length, value };
    });
  }, [visibleLeads]);

  // ─── #7 Distribuição por empresa (top 6) ─────────────────────────────
  const companyDistribution = useMemo(() => {
    const opens = activeTasks.filter(t => t.status !== 'done');
    const map = new Map<string, number>();
    opens.forEach(t => map.set(t.companyId, (map.get(t.companyId) ?? 0) + 1));
    const arr = Array.from(map.entries()).map(([id, count]) => {
      const c = companies.find(x => x.id === id);
      return { label: c?.name ?? '—', value: count, color: c?.color ?? '#64C4FF' };
    }).sort((a, b) => b.value - a.value);
    return { items: arr.slice(0, 6), total: opens.length };
  }, [activeTasks, companies]);

  // ─── #8 Heatmap (84 dias) ─────────────────────────────────────────────
  const heatmapCounts = useMemo(() => {
    const m = new Map<string, number>();
    activeTasks.filter(t => t.status === 'done').forEach(t => {
      m.set(t.date, (m.get(t.date) ?? 0) + 1);
    });
    return m;
  }, [activeTasks]);

  // ─── #9 Empresas precisando atenção ──────────────────────────────────
  const attentionCompanies = useMemo(() => {
    return visibleCompanies.map(c => {
      const reasons: string[] = [];
      const cTasks = activeTasks.filter(t => t.companyId === c.id);
      const lastDate = cTasks.map(t => t.date).sort().reverse()[0];
      const limit = c.inactivityAlertDays ?? 30;
      if (lastDate) {
        const daysSince = differenceInCalendarDays(todayDate, parseISO(lastDate));
        if (daysSince >= limit) reasons.push(`${daysSince}d sem tarefa`);
      } else {
        reasons.push('sem tarefas');
      }
      const overdueInv = visibleInvoices.filter(i => i.clientId === c.id && i.status === 'enviada' && i.dueDate && (() => {
        try { return isBefore(parseISO(i.dueDate!), todayDate); } catch { return false; }
      })());
      if (overdueInv.length > 0) reasons.push(`${overdueInv.length} fatura${overdueInv.length > 1 ? 's' : ''} vencida${overdueInv.length > 1 ? 's' : ''}`);
      return { company: c, reasons };
    }).filter(x => x.reasons.length > 0).slice(0, 4);
  }, [visibleCompanies, activeTasks, visibleInvoices, todayDate]);

  // ─── #10 Renovações de contrato ──────────────────────────────────────
  const renewals = useMemo(() => {
    return visibleCompanies
      .filter(c => c.contractRenewal)
      .map(c => {
        const d = parseISO(c.contractRenewal!);
        const daysLeft = differenceInCalendarDays(d, todayDate);
        return { company: c, daysLeft, date: d };
      })
      .filter(r => r.daysLeft >= -7 && r.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [visibleCompanies, todayDate]);

  // ─── #11 Aprovações pendentes ────────────────────────────────────────
  const pendingApprovals = useMemo(() => {
    return visibleApprovals
      .filter(a => (a.status === 'enviado' || a.status === 'visualizado') && a.sentAt)
      .map(a => {
        try {
          const days = differenceInCalendarDays(todayDate, parseISO(a.sentAt!));
          return { approval: a, daysWaiting: days };
        } catch { return null; }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.daysWaiting >= 3)
      .sort((a, b) => b.daysWaiting - a.daysWaiting)
      .slice(0, 4);
  }, [visibleApprovals, todayDate]);

  // ─── #12 Inadimplentes ───────────────────────────────────────────────
  const overdueInvoices = useMemo(() => {
    return visibleInvoices
      .filter(i => i.status === 'enviada' && i.dueDate && (() => {
        try { return isBefore(parseISO(i.dueDate!), todayDate); } catch { return false; }
      })())
      .map(i => {
        const days = differenceInCalendarDays(todayDate, parseISO(i.dueDate!));
        return { invoice: i, daysOverdue: days };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 4);
  }, [visibleInvoices, todayDate]);

  // ─── #13 Insight da semana ───────────────────────────────────────────
  const insight = useMemo(() => {
    const insights: string[] = [];
    if (tasksDoneStats.delta > 10) insights.push(`Você concluiu ${Math.round(tasksDoneStats.delta)}% mais tarefas que semana passada. Excelente!`);
    if (tasksDoneStats.delta < -10) insights.push(`Atenção: produtividade caiu ${Math.round(Math.abs(tasksDoneStats.delta))}% vs semana passada.`);
    if (revenue.delta > 20) insights.push(`Receita do mês está ${Math.round(revenue.delta)}% acima do mês anterior.`);
    if (revenue.delta < -10) insights.push(`Receita está ${Math.round(Math.abs(revenue.delta))}% abaixo do mês anterior — vale revisar pipeline.`);
    if (overdueInvoices.length >= 3) insights.push(`${overdueInvoices.length} faturas vencidas precisam de cobrança.`);
    if (pendingApprovals.length >= 3) insights.push(`${pendingApprovals.length} aprovações aguardando cliente há +3 dias.`);
    if (attentionCompanies.length >= 3) insights.push(`${attentionCompanies.length} empresas inativas — vale agendar contato.`);
    if (approvalRate.rate >= 80 && approvalRate.total >= 5) insights.push(`Taxa de aprovação em 1ª tentativa: ${approvalRate.rate}%. Qualidade alta!`);
    if (insights.length === 0) {
      insights.push(`Olá ${firstName}, semana corrente. Continue assim!`);
    }
    return insights[0];
  }, [tasksDoneStats, revenue, overdueInvoices, pendingApprovals, attentionCompanies, approvalRate, firstName]);

  // ─── Header stats / context ──────────────────────────────────────────
  const todayTasks = activeTasks.filter(t => t.date === todayStr);
  const overdue = activeTasks
    .filter(t => { try { return isBefore(parseISO(t.date), todayDate) && t.status !== 'done'; } catch { return false; } });

  const ideasThisWeek = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    return ideas.filter(i => {
      try { return !i.deletedAt && isInLens(i, visibleIds) && parseISO(i.createdAt) >= ws; } catch { return false; }
    }).length;
  }, [ideas, visibleIds]);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? '—';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ HERO — saudação + CTA ════════════════════════════════════ */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, #1d4ed8 60%, #1e3a8a 100%)`,
          borderRadius: 18, padding: '24px 28px',
          position: 'relative', overflow: 'hidden',
          minHeight: 130,
          boxShadow: `0 12px 40px rgba(${accentRgb},0.28), 0 0 0 1px rgba(255,255,255,0.06) inset`,
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        }}>
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -90, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,196,255,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', marginBottom: 8 }}>
              Dashboard
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
              Olá, {firstName}<span style={{ color: 'rgba(255,255,255,0.78)' }}>.</span>
            </h1>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 7, fontWeight: 500, lineHeight: 1.45 }}>
              {todayTasks.length === 0
                ? 'Nenhuma tarefa pra hoje. Que tal planejar a semana?'
                : `${todayTasks.length} ${todayTasks.length === 1 ? 'tarefa' : 'tarefas'} pra hoje · ${overdue.length} atrasada${overdue.length !== 1 ? 's' : ''} · ${ideasThisWeek} ideia${ideasThisWeek !== 1 ? 's' : ''} essa semana`}
            </div>
          </div>

          <button
            onClick={() => onNavigate('tarefas')}
            style={{
              position: 'relative', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '12px 22px', borderRadius: 11,
              background: '#ffffff', border: 'none',
              color: accentColor, fontSize: 13, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.4) inset',
              letterSpacing: '-0.1px', transition: 'transform .12s, box-shadow .12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <FiPlus size={14} /> Nova tarefa
          </button>
        </div>

        {/* ═══ #13 Insight da semana ═══════════════════════════════════ */}
        <div style={{
          padding: '12px 18px', borderRadius: 12,
          background: `linear-gradient(90deg, rgba(${accentRgb},0.18) 0%, rgba(${accentRgb},0.04) 100%)`,
          border: `1px solid rgba(${accentRgb},0.28)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
          }}>
            <FiActivity size={15} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Insight da semana</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff', marginTop: 2, letterSpacing: '-0.1px' }}>{insight}</div>
          </div>
        </div>

        {/* ═══ KPI top row (4 tiles) ═══════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <KpiTile
            label="Receita do mês"
            value={fmtBRL(revenue.current)}
            delta={revenue.delta}
            icon={<FiDollarSign size={13} />} color="#30d158"
            sparkline={revenue.spark}
          />
          <KpiTile
            label="Tarefas concluídas (semana)"
            value={tasksDoneStats.current}
            delta={tasksDoneStats.delta}
            icon={<FiCheckSquare size={13} />} color={accentColor}
            sparkline={tasksDoneStats.spark}
          />
          <KpiTile
            label="Taxa de aprovação"
            value={approvalRate.rate}
            suffix={`% · ${approvalRate.total} ${approvalRate.total === 1 ? 'item' : 'itens'}`}
            icon={<FiCheckCircle size={13} />} color="#bf5af2"
          />
          <div style={{
            borderRadius: 14,
            background: 'linear-gradient(160deg, rgba(255,69,58,0.10) 0%, var(--s1) 60%)',
            border: '1px solid rgba(255,69,58,0.22)',
            padding: '14px 16px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 6px 18px rgba(255,69,58,0.08), 0 1px 0 rgba(255,255,255,0.04) inset',
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 110,
          }}>
            <ProgressRing value={pomodoroToday} goal={POMODORO_GOAL} color="#ff453a" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <FiClock size={12} style={{ color: '#ff453a' }} />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Foco hoje</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1 }}>
                {pomodoroToday}<span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginLeft: 3 }}>min</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                Meta: {POMODORO_GOAL} min
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Row 2: Faturamento 6m + Pipeline CRM ═══════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 14 }}>
          <Card>
            <CardHeader
              icon={<FiTrendingUp size={14} />}
              title="Faturamento — últimos 6 meses"
              accent={accentColor}
              right={<span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{fmtBRLfull(revenue6m.reduce((s, m) => s + m.value, 0))}</span>}
            />
            <div style={{ padding: '10px 8px 8px' }}>
              <AreaChart series={revenue6m} accentColor={accentColor} accentRgb={accentRgb} />
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<FiTarget size={14} />}
              title="Pipeline do CRM"
              accent="#bf5af2"
              right={<button onClick={() => onNavigate('crm')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>Ver <FiArrowRight size={11} /></button>}
            />
            <CrmFunnel stages={pipeline} onClick={() => onNavigate('crm')} />
          </Card>
        </div>

        {/* ═══ Row 3: Donut + Heatmap ═════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 14 }}>
          <Card>
            <CardHeader
              icon={<FiPieChart size={14} />}
              title="Carga por empresa"
              accent="#64C4FF"
            />
            {companyDistribution.total === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Nenhuma tarefa em aberto.
              </div>
            ) : (
              <DonutChart data={companyDistribution.items} total={companyDistribution.total} />
            )}
          </Card>

          <Card>
            <CardHeader
              icon={<FiActivity size={14} />}
              title="Produtividade · 12 semanas"
              accent="#30d158"
            />
            <ProductivityHeatmap counts={heatmapCounts} />
          </Card>
        </div>

        {/* ═══ Row 4: Atenção + Renovações + Inadimplentes ═════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* #9 Empresas precisando atenção */}
          <Card style={{ border: '1px solid rgba(255,159,10,0.28)' }}>
            <CardHeader
              icon={<FiAlertTriangle size={14} />}
              title="Precisam de atenção"
              accent="#ff9f0a"
              right={attentionCompanies.length > 0 ? <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', background: '#ff9f0a', borderRadius: 99, padding: '2px 9px' }}>{attentionCompanies.length}</span> : undefined}
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {attentionCompanies.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Tudo em ordem.</div>
              ) : attentionCompanies.map(({ company, reasons }) => (
                <button key={company.id} onClick={() => onNavigate('empresas')}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 11px', borderRadius: 9, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginBottom: 3 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,159,10,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: company.color, boxShadow: `0 0 6px ${company.color}88` }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>{company.name}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#ff9f0a', fontWeight: 600, paddingLeft: 15 }}>
                    {reasons.join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* #10 Renovações */}
          <Card>
            <CardHeader
              icon={<FiRotateCw size={14} />}
              title="Renovações próximas"
              accent="#64d2ff"
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {renewals.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Nada nos próximos 30 dias.</div>
              ) : renewals.map(r => {
                const overdue = r.daysLeft < 0;
                return (
                  <button key={r.company.id} onClick={() => onNavigate('empresas')}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginBottom: 3 }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.company.color, boxShadow: `0 0 6px ${r.company.color}88`, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: overdue ? '#ff453a' : (r.daysLeft <= 7 ? '#ff9f0a' : '#64d2ff'), flexShrink: 0 }}>
                      {overdue ? `${Math.abs(r.daysLeft)}d atrás` : r.daysLeft === 0 ? 'hoje' : `em ${r.daysLeft}d`}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* #11 Aprovações pendentes */}
          <Card>
            <CardHeader
              icon={<FiClock size={14} />}
              title="Aprovações pendentes"
              accent="#bf5af2"
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {pendingApprovals.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Nada esperando há +3 dias.</div>
              ) : pendingApprovals.map(({ approval, daysWaiting }) => (
                <button key={approval.id} onClick={() => onNavigate('aprovacoes')}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginBottom: 3 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#bf5af2', boxShadow: '0 0 6px rgba(191,90,242,0.6)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{approval.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{companyName(approval.clientId)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#ff9f0a', flexShrink: 0 }}>{daysWaiting}d</span>
                </button>
              ))}
            </div>
          </Card>

          {/* #12 Inadimplentes */}
          <Card style={{ border: '1px solid rgba(255,69,58,0.32)' }}>
            <CardHeader
              icon={<FiAlertCircle size={14} />}
              title="Faturas vencidas"
              accent="#ff453a"
              right={overdueInvoices.length > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', background: '#ff453a', borderRadius: 99, padding: '2px 9px' }}>
                  {fmtBRL(overdueInvoices.reduce((s, x) => s + x.invoice.total, 0))}
                </span>
              ) : undefined}
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {overdueInvoices.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Nenhuma fatura vencida.</div>
              ) : overdueInvoices.map(({ invoice, daysOverdue }) => (
                <button key={invoice.id} onClick={() => onNavigate('faturas')}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', marginBottom: 3 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff453a', boxShadow: '0 0 6px rgba(255,69,58,0.6)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>#{String(invoice.number).padStart(4, '0')} · {companyName(invoice.clientId)}</div>
                    <div style={{ fontSize: 10, color: '#ff453a', fontWeight: 700 }}>{daysOverdue}d em atraso · {fmtBRL(invoice.total)}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══ Row final: Hoje + Atalhos ═══════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14 }}>
          <Card style={{ border: '1px solid rgba(53,107,255,0.28)' }}>
            <CardHeader
              icon={<FiSun size={14} />}
              title="Tarefas de hoje"
              accent={accentColor}
              right={<button onClick={() => onNavigate('tarefas')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>Ver tudo <FiArrowRight size={11} /></button>}
            />
            <div style={{ padding: '10px 10px 12px' }}>
              {todayTasks.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <FiCalendar size={28} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>Dia livre. Aproveite!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {todayTasks.slice(0, 8).map((task, i) => {
                    const c = companies.find(x => x.id === task.companyId);
                    return (
                      <motion.button
                        key={task.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => onTaskClick(task)}
                        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c?.color ?? accentColor, boxShadow: `0 0 6px ${c?.color ?? accentColor}88`, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getTaskTitle(task, companies, subClients)}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: c?.color ?? accentColor, flexShrink: 0, opacity: 0.85 }}>
                          {c?.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<FiArrowRight size={14} />} title="Atalhos" accent={accentColor} />
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'Empresas', icon: <FiBriefcase size={18} />, page: 'empresas' as PageType, color: '#64C4FF', rgb: '100,196,255' },
                { label: 'CRM',      icon: <FiUsers size={18} />,     page: 'crm' as PageType,      color: '#bf5af2', rgb: '191,90,242' },
                { label: 'To Do',    icon: <FiCheckSquare size={18} />, page: 'todo' as PageType,   color: '#30d158', rgb: '48,209,88' },
                { label: 'Ideias',   icon: <FiZap size={18} />,       page: 'ideias' as PageType,   color: '#ffd60a', rgb: '255,214,10' },
              ]).map(s => (
                <button key={s.label} onClick={() => onNavigate(s.page)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '18px 8px', borderRadius: 11, background: `rgba(${s.rgb},0.10)`, border: `1px solid rgba(${s.rgb},0.26)`, color: s.color, cursor: 'pointer', transition: 'all .15s' }}
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
  );
}
