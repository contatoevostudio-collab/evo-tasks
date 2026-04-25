import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiBell } from 'react-icons/fi';
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';
import { useFinanceStore } from '../store/finance';
import { useContentApprovalsStore } from '../store/contentApprovals';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import type { PageType } from '../types';

export type NotificationSeverity = 'high' | 'medium' | 'low';

export interface AppNotification {
  id: string;
  type:
    | 'task-overdue'
    | 'task-due-today'
    | 'lead-followup-overdue'
    | 'lead-followup-today'
    | 'company-renewal-overdue'
    | 'company-renewal-soon'
    | 'company-inactive'
    | 'bill-overdue'
    | 'bill-due-soon'
    | 'idea-review'
    | 'todo-overdue'
    | 'aprovacao-aprovada'
    | 'aprovacao-alteracao';
  title: string;
  subtitle?: string;
  date?: string;
  severity: NotificationSeverity;
  onClick?: () => void;
}

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  high: '#ff453a',
  medium: '#ff9f0a',
  low: '#356BFF',
};

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Compute all notifications across stores. Pure & memoizable. */
function computeNotifications(opts: {
  navigate: (p: PageType) => void;
  todayStr: string;
  tasks: ReturnType<typeof useTaskStore.getState>['tasks'];
  todoItems: ReturnType<typeof useTaskStore.getState>['todoItems'];
  leads: ReturnType<typeof useTaskStore.getState>['leads'];
  companies: ReturnType<typeof useTaskStore.getState>['companies'];
  ideas: ReturnType<typeof useIdeasStore.getState>['ideas'];
  bills: ReturnType<typeof useFinanceStore.getState>['recurringBills'];
  approvals: ReturnType<typeof useContentApprovalsStore.getState>['approvals'];
}): AppNotification[] {
  const { navigate, todayStr, tasks, todoItems, leads, companies, ideas, bills, approvals } = opts;
  const today = parseISO(todayStr);
  const out: AppNotification[] = [];

  const goTarefas = () => navigate('tarefas');
  const goCRM = () => navigate('crm');
  const goEmpresas = () => navigate('empresas');
  const goFinancas = () => navigate('financas');
  const goIdeias = () => navigate('ideias');
  const goTodo = () => navigate('todo');

  // 1. Tarefas atrasadas
  tasks
    .filter(t => !t.archived && t.status !== 'done' && !t.inbox && t.date && t.date < todayStr)
    .forEach(t => {
      const company = companies.find(c => c.id === t.companyId);
      const overdue = differenceInCalendarDays(today, parseISO(t.date));
      const title =
        company?.name
          ? `Tarefa atrasada · ${company.name}`
          : 'Tarefa atrasada';
      const taskLabel = t.customType || t.taskType;
      out.push({
        id: `task-overdue-${t.id}`,
        type: 'task-overdue',
        title,
        subtitle: `${taskLabel} · ${overdue}d em atraso`,
        date: format(parseISO(t.date), 'dd/MM'),
        severity: 'high',
        onClick: goTarefas,
      });
    });

  // 2. Tarefas hoje (top 5)
  const dueTodayTasks = tasks
    .filter(t => !t.archived && t.status !== 'done' && !t.inbox && t.date === todayStr)
    .slice(0, 5);
  dueTodayTasks.forEach(t => {
    const company = companies.find(c => c.id === t.companyId);
    const taskLabel = t.customType || t.taskType;
    out.push({
      id: `task-today-${t.id}`,
      type: 'task-due-today',
      title: `Tarefa hoje${company?.name ? ` · ${company.name}` : ''}`,
      subtitle: taskLabel,
      date: 'hoje',
      severity: 'medium',
      onClick: goTarefas,
    });
  });

  // 3. Follow-ups vencidos (CRM)
  leads
    .filter(l => l.nextFollowUp && l.nextFollowUp < todayStr && l.stage !== 'fechado')
    .forEach(l => {
      const overdue = differenceInCalendarDays(today, parseISO(l.nextFollowUp!));
      out.push({
        id: `lead-overdue-${l.id}`,
        type: 'lead-followup-overdue',
        title: `Follow-up atrasado · ${l.name}`,
        subtitle: `${overdue}d em atraso`,
        date: format(parseISO(l.nextFollowUp!), 'dd/MM'),
        severity: 'high',
        onClick: goCRM,
      });
    });

  // 4. Follow-ups hoje (CRM)
  leads
    .filter(l => l.nextFollowUp === todayStr && l.stage !== 'fechado')
    .forEach(l => {
      out.push({
        id: `lead-today-${l.id}`,
        type: 'lead-followup-today',
        title: `Follow-up hoje · ${l.name}`,
        subtitle: l.stage,
        date: 'hoje',
        severity: 'medium',
        onClick: goCRM,
      });
    });

  // 5. Contratos vencendo / vencidos
  companies
    .filter(c => !c.archived && c.contractRenewal)
    .forEach(c => {
      const renewal = parseISO(c.contractRenewal!);
      const diff = differenceInCalendarDays(renewal, today);
      if (diff < 0) {
        out.push({
          id: `company-renewal-overdue-${c.id}`,
          type: 'company-renewal-overdue',
          title: `Contrato vencido · ${c.name}`,
          subtitle: `${Math.abs(diff)}d desde renovação`,
          date: format(renewal, 'dd/MM'),
          severity: 'high',
          onClick: goEmpresas,
        });
      } else if (diff <= 14) {
        out.push({
          id: `company-renewal-soon-${c.id}`,
          type: 'company-renewal-soon',
          title: `Renovação próxima · ${c.name}`,
          subtitle: diff === 0 ? 'hoje' : `em ${diff}d`,
          date: format(renewal, 'dd/MM'),
          severity: 'medium',
          onClick: goEmpresas,
        });
      }
    });

  // 6. Empresas inativas (sem tarefas há N dias — default 30)
  companies
    .filter(c => !c.archived)
    .forEach(c => {
      const limit = c.inactivityAlertDays ?? 30;
      const companyTasks = tasks.filter(t => t.companyId === c.id && !t.archived && t.date);
      if (companyTasks.length === 0) return; // nunca teve tarefa — não alerta
      const lastDate = companyTasks
        .map(t => t.date)
        .sort()
        .reverse()[0];
      if (!lastDate) return;
      const daysSince = differenceInCalendarDays(today, parseISO(lastDate));
      if (daysSince >= limit) {
        out.push({
          id: `company-inactive-${c.id}`,
          type: 'company-inactive',
          title: `Empresa inativa · ${c.name}`,
          subtitle: `${daysSince}d sem tarefas`,
          severity: daysSince >= limit * 2 ? 'medium' : 'low',
          onClick: goEmpresas,
        });
      }
    });

  // 7. Contas a vencer / vencidas
  const currentMonthKey = format(today, 'yyyy-MM');
  const todayDay = today.getDate();
  bills
    .filter(b => b.isRecurring !== false && !b.paidMonths.includes(currentMonthKey))
    .forEach(b => {
      const dayDiff = b.dueDay - todayDay;
      if (dayDiff < 0) {
        out.push({
          id: `bill-overdue-${b.id}`,
          type: 'bill-overdue',
          title: `Conta vencida · ${b.name}`,
          subtitle: `Venceu dia ${b.dueDay} · ${Math.abs(dayDiff)}d em atraso`,
          date: `${String(b.dueDay).padStart(2, '0')}/${format(today, 'MM')}`,
          severity: 'high',
          onClick: goFinancas,
        });
      } else if (dayDiff <= 5) {
        out.push({
          id: `bill-soon-${b.id}`,
          type: 'bill-due-soon',
          title: `Conta a vencer · ${b.name}`,
          subtitle: dayDiff === 0 ? 'vence hoje' : `vence em ${dayDiff}d`,
          date: `${String(b.dueDay).padStart(2, '0')}/${format(today, 'MM')}`,
          severity: 'medium',
          onClick: goFinancas,
        });
      }
    });

  // 8. Ideias pra revisitar
  ideas
    .filter(i => !i.deletedAt && i.reviewDate && i.reviewDate <= todayStr)
    .forEach(i => {
      out.push({
        id: `idea-review-${i.id}`,
        type: 'idea-review',
        title: `Revisitar ideia · ${i.title}`,
        subtitle: i.reviewDate === todayStr ? 'agendada para hoje' : 'pendente',
        date: i.reviewDate ? format(parseISO(i.reviewDate), 'dd/MM') : undefined,
        severity: 'low',
        onClick: goIdeias,
      });
    });

  // 9. To Do atrasadas
  todoItems
    .filter(t => !t.archived && t.status !== 'done' && t.status !== 'standby' && t.date < todayStr)
    .forEach(t => {
      const overdue = differenceInCalendarDays(today, parseISO(t.date));
      out.push({
        id: `todo-overdue-${t.id}`,
        type: 'todo-overdue',
        title: `To Do atrasada · ${t.text}`,
        subtitle: `${overdue}d em atraso`,
        date: format(parseISO(t.date), 'dd/MM'),
        severity: 'high',
        onClick: goTodo,
      });
    });

  // 10. Aprovações recentes (aprovado / alteracao nos últimos 7 dias)
  approvals
    .filter(a => !a.deletedAt && a.decidedAt && differenceInCalendarDays(today, parseISO(a.decidedAt)) <= 7)
    .forEach(a => {
      if (a.status === 'aprovado') {
        out.push({
          id: `aprovacao-aprovada-${a.id}`,
          type: 'aprovacao-aprovada',
          title: `Aprovado pelo cliente · ${a.title}`,
          subtitle: a.feedback ? `"${a.feedback}"` : 'Conteúdo aprovado',
          date: format(parseISO(a.decidedAt!), 'dd/MM'),
          severity: 'medium',
          onClick: () => navigate('aprovacoes'),
        });
      } else if (a.status === 'alteracao') {
        out.push({
          id: `aprovacao-alteracao-${a.id}`,
          type: 'aprovacao-alteracao',
          title: `Alteração solicitada · ${a.title}`,
          subtitle: a.feedback ? `"${a.feedback}"` : 'Cliente pediu alterações',
          date: format(parseISO(a.decidedAt!), 'dd/MM'),
          severity: 'high',
          onClick: () => navigate('aprovacoes'),
        });
      }
    });

  // Sort: severity first, then date
  out.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return 0;
  });

  // Suppress unused import warnings — addDays is reserved for potential future use
  void addDays;

  return out;
}

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (p: PageType) => void;
  /** Vertical offset from top, defaults to 56px below the topbar */
  top?: number;
  right?: number;
}

export function NotificationsPanel({ open, onClose, onNavigate, top = 60, right = 20 }: NotificationsPanelProps) {
  const { tasks: allTasks, todoItems, leads: allLeads, companies: allCompanies } = useTaskStore();
  const { ideas: allIdeas } = useIdeasStore();
  const { recurringBills } = useFinanceStore();
  const { approvals: allApprovals } = useContentApprovalsStore();
  const visibleIds = useVisibleWorkspaceIds();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const notifications = useMemo(
    () =>
      computeNotifications({
        navigate: (p) => onNavigate?.(p),
        todayStr,
        tasks:     allTasks.filter(t => isInLens(t, visibleIds)),
        todoItems,
        leads:     allLeads.filter(l => isInLens(l, visibleIds)),
        companies: allCompanies.filter(c => isInLens(c, visibleIds)),
        ideas:     allIdeas.filter(i => isInLens(i, visibleIds)),
        bills:     recurringBills,
        approvals: allApprovals.filter(a => isInLens(a, visibleIds)),
      }),
    [todayStr, visibleIds, allTasks, todoItems, allLeads, allCompanies, allIdeas, recurringBills, allApprovals, onNavigate],
  );

  const grouped = useMemo(() => {
    const groups: { label: string; key: NotificationSeverity; items: AppNotification[] }[] = [
      { label: 'Atrasadas', key: 'high', items: [] },
      { label: 'Hoje / Em breve', key: 'medium', items: [] },
      { label: 'Lembretes', key: 'low', items: [] },
    ];
    notifications.forEach(n => {
      const g = groups.find(x => x.key === n.severity);
      if (g) g.items.push(n);
    });
    return groups.filter(g => g.items.length > 0);
  }, [notifications]);

  const count = notifications.length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 89, background: 'transparent' }}
      />

      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top,
          right,
          width: 380,
          maxHeight: '70vh',
          background: 'var(--modal-bg)',
          border: '1px solid var(--b2)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--b2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FiBell size={13} style={{ color: 'var(--t3)' }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--t3)',
              flex: 1,
            }}
          >
            Notificações
          </span>
          {count > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#ff453a',
                background: 'rgba(255,69,58,0.12)',
                borderRadius: 99,
                padding: '1px 8px',
              }}
            >
              {count}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {grouped.map(group => (
            <div key={group.label}>
              <div
                style={{
                  padding: '10px 16px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--t4)',
                }}
              >
                {group.label}
              </div>
              {group.items.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    n.onClick?.();
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: n.onClick ? 'pointer' : 'default',
                    textAlign: 'left',
                    borderTop: '1px solid var(--b1)',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => {
                    if (n.onClick) (e.currentTarget as HTMLElement).style.background = 'var(--s2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: SEVERITY_COLOR[n.severity],
                      boxShadow: `0 0 6px ${SEVERITY_COLOR[n.severity]}aa`,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--t1)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.title}
                    </div>
                    {n.subtitle && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--t4)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.subtitle}
                      </div>
                    )}
                  </div>
                  {n.date && (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--t4)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {n.date}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {count === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t4)' }}>
              <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Tudo em dia</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Nada urgente por aqui</div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

interface NotificationsBellProps {
  count: number;
  onClick: () => void;
}

/** The bell button itself — drop it next to other top-bar icons. */
export function NotificationsBell({ count, onClick }: NotificationsBellProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Notificações${count > 0 ? ` (${count} pendente${count !== 1 ? 's' : ''})` : ''}`}
      title="Notificações"
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--t3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--s2)';
        (e.currentTarget as HTMLElement).style.color = 'var(--t1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = 'var(--t3)';
      }}
    >
      <FiBell size={14} />
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 14,
            height: 14,
            padding: '0 3px',
            borderRadius: 99,
            background: '#ff453a',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--app-bg)',
            lineHeight: 1,
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

/** Convenience: read all stores + return current count, for badge usage outside the panel. */
export function useNotificationsCount(): number {
  const allTasks = useTaskStore(s => s.tasks);
  const todoItems = useTaskStore(s => s.todoItems);
  const allLeads = useTaskStore(s => s.leads);
  const allCompanies = useTaskStore(s => s.companies);
  const allIdeas = useIdeasStore(s => s.ideas);
  const recurringBills = useFinanceStore(s => s.recurringBills);
  const allApprovals = useContentApprovalsStore(s => s.approvals);
  const visibleIds = useVisibleWorkspaceIds();

  return useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return computeNotifications({
      navigate: () => {},
      todayStr,
      tasks:     allTasks.filter(t => isInLens(t, visibleIds)),
      todoItems,
      leads:     allLeads.filter(l => isInLens(l, visibleIds)),
      companies: allCompanies.filter(c => isInLens(c, visibleIds)),
      ideas:     allIdeas.filter(i => isInLens(i, visibleIds)),
      bills:     recurringBills,
      approvals: allApprovals.filter(a => isInLens(a, visibleIds)),
    }).length;
  }, [visibleIds, allTasks, todoItems, allLeads, allCompanies, allIdeas, recurringBills, allApprovals]);
}
