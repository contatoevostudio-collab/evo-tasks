import { useMemo } from 'react';
import { FiTrendingUp, FiUsers, FiDollarSign, FiCheckSquare, FiClock, FiStar } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../store/tasks';
import { useInvoicesStore } from '../store/invoices';
import { useContentApprovalsStore } from '../store/contentApprovals';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface KPICard {
  title: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
  trend?: string;
}

export function KPIsPage() {
  const { companies, tasks, accentColor } = useTaskStore();
  const { invoices } = useInvoicesStore();
  const { approvals } = useContentApprovalsStore();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, "MMMM yyyy", { locale: ptBR });

  const kpis = useMemo((): KPICard[] => {
    // Active clients
    const activeClients = companies.filter(c => !c.deletedAt && (c.status === 'ativo' || !c.status));

    // Invoice metrics
    const activeInvoices = invoices.filter(i => !i.deletedAt);
    const pendingInvoices = activeInvoices.filter(i => i.status === 'enviada');
    const pendingTotal = pendingInvoices.reduce((s, i) => s + i.total, 0);
    const paidThisMonth = activeInvoices.filter(i => i.status === 'paga' && i.paidAt && isWithinInterval(parseISO(i.paidAt), { start: monthStart, end: monthEnd }));
    const paidTotal = paidThisMonth.reduce((s, i) => s + i.total, 0);
    const overdueInvoices = pendingInvoices.filter(i => i.dueDate && parseISO(i.dueDate) < now);

    // Task metrics
    const activeTasks = tasks.filter(t => !t.deletedAt && !t.archived);
    const doneThisMonth = activeTasks.filter(t =>
      t.status === 'done' && t.date && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );
    const inProgress = activeTasks.filter(t => t.status === 'doing');
    const pendingTasks = activeTasks.filter(t => t.status === 'todo' && !t.inbox);

    // Approval metrics
    const activeApprovals = approvals.filter(a => !a.deletedAt);
    const pendingApprovals = activeApprovals.filter(a => ['enviado', 'visualizado', 'alteracao'].includes(a.status));
    const approvedThisMonth = activeApprovals.filter(a =>
      a.status === 'aprovado' && a.decidedAt && isWithinInterval(parseISO(a.decidedAt), { start: monthStart, end: monthEnd })
    );

    // Content pieces this month (tarefas de criação)
    const contentThisMonth = activeTasks.filter(t =>
      (!t.taskCategory || t.taskCategory === 'criacao') &&
      t.date && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );
    const contentDone = contentThisMonth.filter(t => t.status === 'done');
    const contentRate = contentThisMonth.length > 0 ? Math.round((contentDone.length / contentThisMonth.length) * 100) : 0;

    return [
      {
        title: 'Clientes ativos',
        value: String(activeClients.length),
        sub: `de ${companies.filter(c => !c.deletedAt).length} no total`,
        color: accentColor,
        icon: <FiUsers size={18} />,
      },
      {
        title: `Faturado em ${format(now, 'MMM', { locale: ptBR })}`,
        value: fmt(paidTotal),
        sub: `${paidThisMonth.length} ${paidThisMonth.length === 1 ? 'fatura paga' : 'faturas pagas'}`,
        color: '#30d158',
        icon: <FiDollarSign size={18} />,
        trend: paidTotal > 0 ? '↑' : undefined,
      },
      {
        title: 'A receber',
        value: fmt(pendingTotal),
        sub: overdueInvoices.length > 0 ? `⚠ ${overdueInvoices.length} ${overdueInvoices.length === 1 ? 'vencida' : 'vencidas'}` : `${pendingInvoices.length} enviada${pendingInvoices.length !== 1 ? 's' : ''}`,
        color: pendingInvoices.length > 0 ? '#ff9f0a' : 'var(--t4)',
        icon: <FiTrendingUp size={18} />,
      },
      {
        title: 'Tarefas feitas',
        value: String(doneThisMonth.length),
        sub: `${inProgress.length} em andamento, ${pendingTasks.length} pendentes`,
        color: '#356BFF',
        icon: <FiCheckSquare size={18} />,
      },
      {
        title: 'Aprovações pendentes',
        value: String(pendingApprovals.length),
        sub: approvedThisMonth.length > 0 ? `${approvedThisMonth.length} aprovada${approvedThisMonth.length !== 1 ? 's' : ''} este mês` : 'Nenhuma aprovação este mês',
        color: pendingApprovals.length > 0 ? '#ff9f0a' : 'var(--t4)',
        icon: <FiStar size={18} />,
      },
      {
        title: `Conteúdo em ${format(now, 'MMM', { locale: ptBR })}`,
        value: `${contentDone.length}/${contentThisMonth.length}`,
        sub: `${contentRate}% de entrega`,
        color: contentRate >= 80 ? '#30d158' : contentRate >= 50 ? '#ff9f0a' : '#ff453a',
        icon: <FiClock size={18} />,
      },
    ];
  }, [companies, tasks, invoices, approvals, accentColor, monthStart, monthEnd]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflowY: 'auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>KPIs</h1>
        <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>
          Indicadores de {monthLabel}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {kpis.map((kpi, i) => (
          <div
            key={i}
            style={{
              padding: '18px 20px',
              borderRadius: 16,
              background: 'var(--s1)',
              border: '1px solid var(--b1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
                {kpi.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', flex: 1 }}>{kpi.title}</span>
              {kpi.trend && <span style={{ fontSize: 14, color: '#30d158' }}>{kpi.trend}</span>}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', lineHeight: 1 }}>{kpi.value}</div>
              {kpi.sub && <div style={{ fontSize: 11, color: kpi.color, marginTop: 4, fontWeight: 500 }}>{kpi.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Company breakdown */}
      {companies.filter(c => !c.deletedAt && (c.status === 'ativo' || !c.status)).length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)', margin: '0 0 12px' }}>Por cliente</h2>
          <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b1)', overflow: 'hidden' }}>
            {companies
              .filter(c => !c.deletedAt && (c.status === 'ativo' || !c.status))
              .map((company, i, arr) => {
                const companyTasks = tasks.filter(t => !t.deletedAt && !t.archived && t.companyId === company.id);
                const done = companyTasks.filter(t => t.status === 'done').length;
                const total = companyTasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const companyInvoices = invoices.filter(iv => !iv.deletedAt && iv.clientId === company.id && iv.status === 'paga');
                const totalBilled = companyInvoices.reduce((s, iv) => s + iv.total, 0);
                return (
                  <div
                    key={company.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--b1)' : 'none' }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: company.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 80 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--b2)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: company.color, borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0, width: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--t3)', minWidth: 90, textAlign: 'right' }}>
                      {totalBilled > 0 ? fmt(totalBilled) : '—'}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
