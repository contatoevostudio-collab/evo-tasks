import { supabase } from './supabase';
import { useTaskStore } from '../store/tasks';
import { useFinanceStore } from '../store/finance';
import { useIdeasStore } from '../store/ideas';
import { useSyncStore } from '../store/sync';
import type { Task, Company, SubClient, Lead, QuickNote, TodoItem, CalendarEvent, Transaction, FinancialGoal, RecurringBill, Idea } from '../types';

// ─── Sync state helpers (visual indicator) ──────────────────────────────────
// These wrap the new useSyncStore so all calls funnel through one place.
function beginSync() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useSyncStore.getState().setState('offline');
    return;
  }
  useSyncStore.getState().setState('syncing');
}

function endSyncOk() {
  useSyncStore.getState().setSynced();
}

function endSyncErr(err: unknown) {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro desconhecido';
  useSyncStore.getState().setState('error', msg);
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function taskToDb(t: Task, userId: string) {
  return {
    id: t.id, user_id: userId,
    company_id: t.companyId, sub_client_id: t.subClientId ?? null,
    task_type: t.taskType, sequence: t.sequence,
    date: t.date ?? null, status: t.status,
    all_day: t.allDay ?? true, time: t.time ?? null,
    priority: t.priority ?? null, notes: t.notes ?? null,
    deadline: t.deadline ?? null, archived: t.archived ?? false,
    inbox: t.inbox ?? false, color_override: t.colorOverride ?? null,
    subtasks: t.subtasks ?? [], created_at: t.createdAt,
    deleted_at: t.deletedAt ?? null,
  };
}

function taskFromDb(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    subClientId: (r.sub_client_id as string) || '',
    taskType: r.task_type as Task['taskType'],
    sequence: r.sequence as number,
    date: (r.date as string) || '',
    status: r.status as Task['status'],
    allDay: r.all_day as boolean,
    time: (r.time as string) || undefined,
    priority: (r.priority as Task['priority']) || undefined,
    notes: (r.notes as string) || undefined,
    deadline: (r.deadline as string) || undefined,
    archived: r.archived as boolean,
    inbox: r.inbox as boolean,
    colorOverride: (r.color_override as string) || undefined,
    subtasks: (r.subtasks as Task['subtasks']) || [],
    createdAt: r.created_at as string,
    deletedAt: (r.deleted_at as string) || undefined,
  };
}

function companyToDb(c: Company, userId: string) {
  return {
    id: c.id, user_id: userId, name: c.name, color: c.color,
    status: c.status ?? 'ativo',
    monthly_quota: c.monthlyQuota ?? null,
    use_quota: c.useQuota ?? false,
    avulso: c.avulso ?? false,
    contract_value: c.contractValue ?? null,
    site_url: c.siteUrl ?? null,
    platforms: c.platforms ?? null,
    deleted_at: c.deletedAt ?? null,
  };
}

function companyFromDb(r: Record<string, unknown>): Company {
  return {
    id: r.id as string,
    name: r.name as string,
    color: r.color as string,
    status: ((r.status as string) || 'ativo') as Company['status'],
    monthlyQuota: (r.monthly_quota as number) || undefined,
    useQuota: (r.use_quota as boolean) || false,
    avulso: (r.avulso as boolean) || false,
    contractValue: (r.contract_value as number) || undefined,
    siteUrl: (r.site_url as string) || undefined,
    platforms: (r.platforms as Company['platforms']) || undefined,
    deletedAt: (r.deleted_at as string) || undefined,
  };
}

function subClientToDb(s: SubClient, userId: string) {
  return {
    id: s.id, user_id: userId, name: s.name,
    company_id: s.companyId,
    notes: s.notes ?? null,
    tips: s.tips ?? [],
    monthly_quota: s.monthlyQuota ?? null,
    contract_value: s.contractValue ?? null,
    site_url: s.siteUrl ?? null,
    platforms: s.platforms ?? null,
    deleted_at: s.deletedAt ?? null,
  };
}

function subClientFromDb(r: Record<string, unknown>): SubClient {
  return {
    id: r.id as string,
    name: r.name as string,
    companyId: r.company_id as string,
    monthlyQuota: (r.monthly_quota as number) || undefined,
    notes: (r.notes as string) || undefined,
    tips: (r.tips as string[]) || [],
    contractValue: (r.contract_value as number) || undefined,
    siteUrl: (r.site_url as string) || undefined,
    platforms: (r.platforms as SubClient['platforms']) || undefined,
    deletedAt: (r.deleted_at as string) || undefined,
  };
}

function leadToDb(l: Lead, userId: string) {
  return {
    id: l.id, user_id: userId,
    name: l.name,
    contact: l.contact ?? null,
    phone: l.phone ?? null,
    email: l.email ?? null,
    instagram: l.instagram ?? null,
    budget: l.budget ?? null,
    notes: l.notes ?? null,
    stage: l.stage,
    converted_to_company_id: l.convertedToCompanyId ?? null,
    created_at: l.createdAt,
    deleted_at: l.deletedAt ?? null,
  };
}

function quickNoteToDb(n: QuickNote, userId: string) {
  return { id: n.id, user_id: userId, text: n.text, checked: n.checked, created_at: n.createdAt };
}

function quickNoteFromDb(r: Record<string, unknown>): QuickNote {
  return {
    id: r.id as string,
    text: r.text as string,
    checked: r.checked as boolean,
    createdAt: r.created_at as string,
  };
}

function leadFromDb(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string,
    name: r.name as string,
    contact: (r.contact as string) || undefined,
    phone: (r.phone as string) || undefined,
    email: (r.email as string) || undefined,
    instagram: (r.instagram as string) || undefined,
    budget: (r.budget as string) || undefined,
    notes: (r.notes as string) || undefined,
    stage: r.stage as Lead['stage'],
    convertedToCompanyId: (r.converted_to_company_id as string) || undefined,
    createdAt: r.created_at as string,
    deletedAt: (r.deleted_at as string) || undefined,
  };
}

function todoItemToDb(t: TodoItem, userId: string) {
  return {
    id: t.id, user_id: userId,
    text: t.text, checked: t.checked,
    status: t.status, date: t.date,
    created_at: t.createdAt,
    archived: t.archived ?? false,
    subtasks: t.subtasks ?? [],
    context: t.context ?? null,
    priority: t.priority ?? null,
  };
}

function todoItemFromDb(r: Record<string, unknown>): TodoItem {
  return {
    id: r.id as string,
    text: r.text as string,
    checked: r.checked as boolean,
    status: r.status as TodoItem['status'],
    date: r.date as string,
    createdAt: r.created_at as string,
    archived: (r.archived as boolean) || false,
    subtasks: (r.subtasks as TodoItem['subtasks']) || [],
    context: (r.context as TodoItem['context']) || undefined,
    priority: (r.priority as TodoItem['priority']) || undefined,
  };
}

function calendarEventToDb(e: CalendarEvent, userId: string) {
  return {
    id: e.id, user_id: userId,
    title: e.title, date: e.date,
    end_date: e.endDate ?? null,
    time: e.time ?? null,
    category: e.category,
    color: e.color ?? null,
    notes: e.notes ?? null,
    created_at: e.createdAt,
  };
}

function calendarEventFromDb(r: Record<string, unknown>): CalendarEvent {
  return {
    id: r.id as string,
    title: r.title as string,
    date: r.date as string,
    endDate: (r.end_date as string) || undefined,
    time: (r.time as string) || undefined,
    category: r.category as CalendarEvent['category'],
    color: (r.color as string) || undefined,
    notes: (r.notes as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function transactionToDb(t: Transaction, userId: string) {
  return {
    id: t.id, user_id: userId,
    type: t.type, description: t.description,
    category: t.category, amount: t.amount,
    date: t.date, status: t.status,
    created_at: t.createdAt,
  };
}

function transactionFromDb(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as string,
    type: r.type as Transaction['type'],
    description: r.description as string,
    category: r.category as string,
    amount: r.amount as number,
    date: r.date as string,
    status: r.status as Transaction['status'],
    createdAt: r.created_at as string,
  };
}

function financialGoalToDb(g: FinancialGoal, userId: string) {
  return {
    id: g.id, user_id: userId,
    name: g.name, icon: g.icon,
    color: g.color, target: g.target,
    current_amount: g.current,
    created_at: g.createdAt,
  };
}

function financialGoalFromDb(r: Record<string, unknown>): FinancialGoal {
  return {
    id: r.id as string,
    name: r.name as string,
    icon: r.icon as FinancialGoal['icon'],
    color: r.color as string,
    target: r.target as number,
    current: r.current_amount as number,
    createdAt: r.created_at as string,
  };
}

function recurringBillToDb(b: RecurringBill, userId: string) {
  return {
    id: b.id, user_id: userId,
    name: b.name, icon: b.icon,
    amount: b.amount, due_day: b.dueDay,
    is_essential: b.isEssential,
    paid_months: b.paidMonths,
    created_at: b.createdAt,
  };
}

function recurringBillFromDb(r: Record<string, unknown>): RecurringBill {
  return {
    id: r.id as string,
    name: r.name as string,
    icon: r.icon as RecurringBill['icon'],
    amount: r.amount as number,
    dueDay: r.due_day as number,
    isEssential: r.is_essential as boolean,
    paidMonths: (r.paid_months as string[]) || [],
    createdAt: r.created_at as string,
  };
}

// ─── Load all data from Supabase ─────────────────────────────────────────────

export async function loadFromSupabase(userId: string): Promise<void> {
  useTaskStore.getState().setSyncStatus('syncing');
  beginSync();
  const [
    { data: companies, error: e1 },
    { data: subClients, error: e2 },
    { data: tasks, error: e3 },
    { data: leads, error: e4 },
    { data: quickNotes, error: e5 },
    { data: todoItems, error: e6 },
    { data: calendarEvents, error: e7 },
    { data: ideas, error: e8 },
    { data: transactions, error: e9 },
    { data: financialGoals, error: e10 },
    { data: recurringBills, error: e11 },
  ] = await Promise.all([
    supabase.from('companies').select('*').eq('user_id', userId),
    supabase.from('sub_clients').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('leads').select('*').eq('user_id', userId),
    supabase.from('quick_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('todo_items').select('*').eq('user_id', userId),
    supabase.from('calendar_events').select('*').eq('user_id', userId),
    supabase.from('ideas').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('financial_goals').select('*').eq('user_id', userId),
    supabase.from('recurring_bills').select('*').eq('user_id', userId),
  ]);

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11) {
    const firstErr = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6 ?? e7 ?? e8 ?? e9 ?? e10 ?? e11;
    console.error('Supabase load error:', firstErr);
    useTaskStore.getState().setSyncStatus('error');
    endSyncErr(firstErr);
    return;
  }

  // Merge Supabase data with local state to preserve fields not synced to DB
  const localState = useTaskStore.getState();
  const localTasks = localState.tasks;

  const mergedCompanies = (companies ?? []).map(r => companyFromDb(r as Record<string, unknown>));

  const mergedTasks = (tasks ?? []).map(r => {
    const remote = taskFromDb(r as Record<string, unknown>);
    const local  = localTasks.find(t => t.id === remote.id);
    return local
      ? {
          ...remote,
          taskCategory: local.taskCategory,
          customType:   local.customType,
          copy:         local.copy,
          hookIdea:     local.hookIdea,
          references:   local.references,
          versions:     local.versions,
          tags:         local.tags,
          estimate:     local.estimate,
        }
      : remote;
  });

  useTaskStore.getState().replaceAll({
    companies:  mergedCompanies,
    subClients: (subClients ?? []).map(r => subClientFromDb(r as Record<string, unknown>)),
    tasks:      mergedTasks,
    leads:      (leads ?? []).map(r => leadFromDb(r as Record<string, unknown>)),
    quickNotes: (quickNotes ?? []).map(r => quickNoteFromDb(r as Record<string, unknown>)),
    todoItems:  (todoItems ?? []).map(r => todoItemFromDb(r as Record<string, unknown>)),
    calendarEvents: (calendarEvents ?? []).map(r => calendarEventFromDb(r as Record<string, unknown>)),
  });

  useFinanceStore.getState().replaceAll({
    transactions:  (transactions ?? []).map(r => transactionFromDb(r as Record<string, unknown>)),
    goals:         (financialGoals ?? []).map(r => financialGoalFromDb(r as Record<string, unknown>)),
    recurringBills:(recurringBills ?? []).map(r => recurringBillFromDb(r as Record<string, unknown>)),
  });

  useIdeasStore.getState().replaceAll(
    (ideas ?? []).map(r => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string) || undefined,
        tag: row.tag as Idea['tag'],
        link: (row.link as string) || undefined,
        pinned: row.pinned as boolean,
        createdAt: row.created_at as string,
      } as Idea;
    })
  );

  useTaskStore.getState().setSyncStatus('idle');
  useTaskStore.getState().setLastSyncAt(new Date().toISOString());
  endSyncOk();
  useSyncStore.getState().markInitialSyncDone();
}

// ─── Push helpers (called by task store) ────────────────────────────────────

export async function syncTask(task: Task, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('tasks').upsert(taskToDb(task, userId));
  if (error) { console.error('syncTask error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeTask(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeTask error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncCompany(company: Company, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('companies').upsert(companyToDb(company, userId));
  if (error) { console.error('syncCompany error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeCompany(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('companies').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeCompany error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncSubClient(sub: SubClient, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('sub_clients').upsert(subClientToDb(sub, userId));
  if (error) { console.error('syncSubClient error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeSubClient(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('sub_clients').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeSubClient error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncLead(lead: Lead, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('leads').upsert(leadToDb(lead, userId));
  if (error) { console.error('syncLead error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeLead(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('leads').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeLead error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncQuickNote(note: QuickNote, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('quick_notes').upsert(quickNoteToDb(note, userId));
  if (error) { console.error('syncQuickNote error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeQuickNote(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('quick_notes').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeQuickNote error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncTodoItem(item: TodoItem, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('todo_items').upsert(todoItemToDb(item, userId));
  if (error) { console.error('syncTodoItem error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeTodoItem(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('todo_items').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeTodoItem error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncCalendarEvent(event: CalendarEvent, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('calendar_events').upsert(calendarEventToDb(event, userId));
  if (error) { console.error('syncCalendarEvent error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function removeCalendarEvent(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing'); beginSync();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeCalendarEvent error:', error); useTaskStore.getState().setSyncStatus('error'); endSyncErr(error); }
  else { useTaskStore.getState().setSyncStatus('idle'); endSyncOk(); }
}

export async function syncTransaction(transaction: Transaction, userId: string) {
  beginSync();
  const { error } = await supabase.from('transactions').upsert(transactionToDb(transaction, userId));
  if (error) { console.error('syncTransaction error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeTransaction(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeTransaction error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncFinancialGoal(goal: FinancialGoal, userId: string) {
  beginSync();
  const { error } = await supabase.from('financial_goals').upsert(financialGoalToDb(goal, userId));
  if (error) { console.error('syncFinancialGoal error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeFinancialGoal(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('financial_goals').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeFinancialGoal error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncRecurringBill(bill: RecurringBill, userId: string) {
  beginSync();
  const { error } = await supabase.from('recurring_bills').upsert(recurringBillToDb(bill, userId));
  if (error) { console.error('syncRecurringBill error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeRecurringBill(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('recurring_bills').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeRecurringBill error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncIdea(idea: Idea, userId: string) {
  beginSync();
  const { error } = await supabase.from('ideas').upsert({
    id: idea.id, user_id: userId,
    title: idea.title,
    description: idea.description ?? null,
    tag: idea.tag,
    link: idea.link ?? null,
    pinned: idea.pinned,
    created_at: idea.createdAt,
  });
  if (error) { console.error('syncIdea error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeIdea(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('ideas').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeIdea error:', error); endSyncErr(error); }
  else endSyncOk();
}

