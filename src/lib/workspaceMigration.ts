import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';
import { useFinanceStore } from '../store/finance';
import { useCardsStore } from '../store/cards';
import { useProposalsStore } from '../store/proposals';
import { useWorkspacesStore } from '../store/workspaces';

/**
 * Migra todas as entidades transacionais que ainda não têm workspaceId
 * pra apontarem ao workspaceId fornecido. Idempotente — só toca itens vazios.
 */
export function migrateAllToWorkspace(wsId: string): void {
  if (!wsId) return;

  // Task store: tasks, companies, subClients, leads, todoItems, calendarEvents
  const ts = useTaskStore.getState();
  const taskUpdates = {
    tasks: ts.tasks.map(t => t.workspaceId ? t : { ...t, workspaceId: wsId }),
    companies: ts.companies.map(c => c.workspaceId ? c : { ...c, workspaceId: wsId }),
    subClients: ts.subClients.map(s => s.workspaceId ? s : { ...s, workspaceId: wsId }),
    leads: ts.leads.map(l => l.workspaceId ? l : { ...l, workspaceId: wsId }),
    todoItems: ts.todoItems.map(t => t.workspaceId ? t : { ...t, workspaceId: wsId }),
    calendarEvents: ts.calendarEvents.map(e => e.workspaceId ? e : { ...e, workspaceId: wsId }),
  };
  useTaskStore.setState(taskUpdates);

  // Ideas
  const is = useIdeasStore.getState();
  useIdeasStore.setState({
    ideas: is.ideas.map(i => i.workspaceId ? i : { ...i, workspaceId: wsId }),
  });

  // Finance: transactions, goals, recurringBills
  const fs = useFinanceStore.getState();
  useFinanceStore.setState({
    transactions: fs.transactions.map(t => t.workspaceId ? t : { ...t, workspaceId: wsId }),
    goals: fs.goals.map(g => g.workspaceId ? g : { ...g, workspaceId: wsId }),
    recurringBills: fs.recurringBills.map(b => b.workspaceId ? b : { ...b, workspaceId: wsId }),
  });

  // Cards
  const cs = useCardsStore.getState();
  useCardsStore.setState({
    cards: cs.cards.map(c => c.workspaceId ? c : { ...c, workspaceId: wsId }),
  });

  // Proposals
  const ps = useProposalsStore.getState();
  useProposalsStore.setState({
    proposals: ps.proposals.map(p => p.workspaceId ? p : { ...p, workspaceId: wsId }),
  });
}

/**
 * Bootstrap: garante que existe um workspace default + migra dados legacy pra ele.
 * Chame uma vez no mount do App.
 */
export function bootstrapWorkspaces(): string {
  const wsId = useWorkspacesStore.getState().ensureDefaultWorkspace();
  migrateAllToWorkspace(wsId);
  return wsId;
}
