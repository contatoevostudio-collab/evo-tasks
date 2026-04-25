import { useMemo } from 'react';
import { format, parseISO, isBefore, startOfToday, addDays, subWeeks, subMonths, startOfMonth, endOfMonth, startOfWeek, differenceInCalendarDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  FiPlus, FiZap, FiAlertTriangle, FiArrowRight,
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
import {
  Card, CardHeader, KpiTile, AreaChart, Funnel,
  DonutChart, ProgressRing, ProductivityHeatmap,
  hexToRgb, fmtBRL, fmtBRLfull,
} from './dashboard';

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

// ═══ HomePage ═════════════════════════════════════════════════════════════
export function HomePage({ onTaskClick, onNavigate }: Props) {
  const {
    tasks, companies, subClients, leads, accentColor, pomodoroSessions, userName,
  } = useTaskStore();
  const { ideas } = useIdeasStore();
  const { invoices } = useInvoicesStore();
  const { approvals } = useContentApprovalsStore();
  const { user } = useAuthStore();

  const accentRgb = hexToRgb(accentColor);
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
      return { label: LEAD_STAGE_LABEL[stage], count: ls.length, value, color: LEAD_STAGE_COLOR[stage] };
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
            <Funnel stages={pipeline} onClick={() => onNavigate('crm')} />
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
