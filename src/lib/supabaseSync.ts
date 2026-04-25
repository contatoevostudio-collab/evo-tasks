import { supabase } from './supabase';
import { useTaskStore } from '../store/tasks';
import { useFinanceStore } from '../store/finance';
import { useIdeasStore } from '../store/ideas';
import { useContentApprovalsStore } from '../store/contentApprovals';
import { useInvoicesStore } from '../store/invoices';
import { useBriefingsStore } from '../store/briefings';
import { useOnboardingStore } from '../store/onboarding';
import { useSnippetsStore } from '../store/snippets';
import { useHabitsStore } from '../store/habits';
import { useWorkspacesStore } from '../store/workspaces';
import { useProposalsStore } from '../store/proposals';
import { useTimeTrackingStore } from '../store/timeTracking';
import { useSyncStore } from '../store/sync';
import type {
  Task, Company, SubClient, Lead, QuickNote, TodoItem, CalendarEvent,
  Transaction, FinancialGoal, RecurringBill, Idea,
  ContentApproval, Invoice, Briefing, OnboardingTemplate, Snippet, Habit,
  Workspace, Proposal, TimeEntry, ApprovalFolder,
} from '../types';

// ─── Sync state helpers ──────────────────────────────────────────────────────

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

// ─── Mappers ─────────────────────────────────────────────────────────────────

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
    extra_data: {
      taskCategory: t.taskCategory,
      customType: t.customType,
      copy: t.copy,
      hookIdea: t.hookIdea,
      references: t.references,
      versions: t.versions,
      tags: t.tags,
      estimate: t.estimate,
      linkedProposalId: t.linkedProposalId,
      recurrence: t.recurrence,
      recurrenceRule: t.recurrenceRule,
      recurrenceParentId: t.recurrenceParentId,
      workspaceId: t.workspaceId,
    },
  };
}

function taskFromDb(r: Record<string, unknown>): Task {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    taskCategory: extra.taskCategory as Task['taskCategory'],
    customType: extra.customType as string | undefined,
    copy: extra.copy as string | undefined,
    hookIdea: extra.hookIdea as string | undefined,
    references: extra.references as string[] | undefined,
    versions: extra.versions as Task['versions'],
    tags: extra.tags as string[] | undefined,
    estimate: extra.estimate as number | undefined,
    linkedProposalId: extra.linkedProposalId as string | undefined,
    recurrence: extra.recurrence as Task['recurrence'],
    recurrenceRule: extra.recurrenceRule as Task['recurrenceRule'],
    recurrenceParentId: extra.recurrenceParentId as string | undefined,
    workspaceId: extra.workspaceId as string | undefined,
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
    extra_data: {
      avatar: c.avatar,
      cnpj: c.cnpj,
      segment: c.segment,
      followers: c.followers,
      contractStart: c.contractStart,
      contractRenewal: c.contractRenewal,
      invoiceDueDay: c.invoiceDueDay,
      archived: c.archived,
      paymentStatus: c.paymentStatus,
      paymentHistory: c.paymentHistory,
      monthlyNote: c.monthlyNote,
      monthlyNoteMonth: c.monthlyNoteMonth,
      nextContactDate: c.nextContactDate,
      linkedLeadId: c.linkedLeadId,
      linkedProposalId: c.linkedProposalId,
      onboardingChecklist: c.onboardingChecklist,
      feedbackRatings: c.feedbackRatings,
      inactivityAlertDays: c.inactivityAlertDays,
      interactions: c.interactions,
      compactMode: c.compactMode,
      workspaceId: c.workspaceId,
      empresaTipo: c.empresaTipo,
    },
  };
}

function companyFromDb(r: Record<string, unknown>): Company {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    avatar: extra.avatar as string | undefined,
    cnpj: extra.cnpj as string | undefined,
    segment: extra.segment as string | undefined,
    followers: extra.followers as Company['followers'],
    contractStart: extra.contractStart as string | undefined,
    contractRenewal: extra.contractRenewal as string | undefined,
    invoiceDueDay: extra.invoiceDueDay as number | undefined,
    archived: extra.archived as boolean | undefined,
    paymentStatus: extra.paymentStatus as Company['paymentStatus'],
    paymentHistory: extra.paymentHistory as Company['paymentHistory'],
    monthlyNote: extra.monthlyNote as string | undefined,
    monthlyNoteMonth: extra.monthlyNoteMonth as string | undefined,
    nextContactDate: extra.nextContactDate as string | undefined,
    linkedLeadId: extra.linkedLeadId as string | undefined,
    linkedProposalId: extra.linkedProposalId as string | undefined,
    onboardingChecklist: extra.onboardingChecklist as Company['onboardingChecklist'],
    feedbackRatings: extra.feedbackRatings as number[] | undefined,
    inactivityAlertDays: extra.inactivityAlertDays as number | undefined,
    interactions: extra.interactions as Company['interactions'],
    compactMode: extra.compactMode as boolean | undefined,
    workspaceId: extra.workspaceId as string | undefined,
    empresaTipo: extra.empresaTipo as Company['empresaTipo'],
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
    extra_data: {
      avatar: s.avatar,
      feedbackScore: s.feedbackScore,
      workspaceId: s.workspaceId,
    },
  };
}

function subClientFromDb(r: Record<string, unknown>): SubClient {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    avatar: extra.avatar as string | undefined,
    feedbackScore: extra.feedbackScore as number | undefined,
    workspaceId: extra.workspaceId as string | undefined,
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
    extra_data: {
      temperature: l.temperature,
      nextFollowUp: l.nextFollowUp,
      interactions: l.interactions,
      linkedCompanyId: l.linkedCompanyId,
      linkedProposalIds: l.linkedProposalIds,
      workspaceId: l.workspaceId,
    },
  };
}

function leadFromDb(r: Record<string, unknown>): Lead {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    temperature: extra.temperature as Lead['temperature'],
    nextFollowUp: extra.nextFollowUp as string | undefined,
    interactions: extra.interactions as Lead['interactions'],
    linkedCompanyId: extra.linkedCompanyId as string | undefined,
    linkedProposalIds: extra.linkedProposalIds as string[] | undefined,
    workspaceId: extra.workspaceId as string | undefined,
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
    extra_data: { workspaceId: t.workspaceId },
  };
}

function todoItemFromDb(r: Record<string, unknown>): TodoItem {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    workspaceId: extra.workspaceId as string | undefined,
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
    extra_data: { workspaceId: e.workspaceId },
  };
}

function calendarEventFromDb(r: Record<string, unknown>): CalendarEvent {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
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
    workspaceId: extra.workspaceId as string | undefined,
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

function ideaToDb(idea: Idea, userId: string) {
  return {
    id: idea.id, user_id: userId,
    title: idea.title,
    description: idea.description ?? null,
    tag: idea.tag,
    link: idea.link ?? null,
    pinned: idea.pinned,
    created_at: idea.createdAt,
    extra_data: {
      extraTags: idea.extraTags,
      status: idea.status,
      linkedCompanyId: idea.linkedCompanyId,
      linkedProposalId: idea.linkedProposalId,
      linkedIdeaIds: idea.linkedIdeaIds,
      subtasks: idea.subtasks,
      reviewDate: idea.reviewDate,
      convertedToTodoId: idea.convertedToTodoId,
      pinOrder: idea.pinOrder,
      updatedAt: idea.updatedAt,
      deletedAt: idea.deletedAt,
      workspaceId: idea.workspaceId,
    },
  };
}

function ideaFromDb(r: Record<string, unknown>): Idea {
  const extra = (r.extra_data as Record<string, unknown>) ?? {};
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || undefined,
    tag: r.tag as Idea['tag'],
    link: (r.link as string) || undefined,
    pinned: r.pinned as boolean,
    createdAt: r.created_at as string,
    extraTags: extra.extraTags as Idea['extraTags'],
    status: (extra.status as Idea['status']) || 'rascunho',
    linkedCompanyId: extra.linkedCompanyId as string | undefined,
    linkedProposalId: extra.linkedProposalId as string | undefined,
    linkedIdeaIds: extra.linkedIdeaIds as string[] | undefined,
    subtasks: extra.subtasks as Idea['subtasks'],
    reviewDate: extra.reviewDate as string | undefined,
    convertedToTodoId: extra.convertedToTodoId as string | undefined,
    pinOrder: extra.pinOrder as number | undefined,
    updatedAt: extra.updatedAt as string | undefined,
    deletedAt: extra.deletedAt as string | undefined,
    workspaceId: extra.workspaceId as string | undefined,
  };
}

// ─── Load all data from Supabase ──────────────────────────────────────────────

// Lock global pra evitar múltiplas chamadas simultâneas (auth events frequentes
// podem disparar várias) — Cloudflare bot management flagra requests rápidas e
// retorna challenge sem CORS headers, fazendo browser bloquear tudo.
let _loadInProgress: Promise<void> | null = null;
let _lastLoadedUserId: string | null = null;

export async function loadFromSupabase(userId: string): Promise<void> {
  if (_loadInProgress) return _loadInProgress;
  if (_lastLoadedUserId === userId) return;

  _loadInProgress = (async () => {
    try {
      await _loadFromSupabaseImpl(userId);
      _lastLoadedUserId = userId;
    } finally {
      _loadInProgress = null;
    }
  })();
  return _loadInProgress;
}

export function resetLoadFromSupabaseCache() {
  _lastLoadedUserId = null;
  _loadInProgress = null;
}

async function _loadFromSupabaseImpl(userId: string): Promise<void> {
  useTaskStore.getState().setSyncStatus('syncing');
  beginSync();

  // Carga 100% sequencial com delay entre cada query.
  // Free tier do Supabase tem postgres lento (~400-500ms por query com RLS),
  // e múltiplas queries simultâneas timeout no upstream → Cloudflare retorna
  // 520 sem CORS headers → browser bloqueia tudo.
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Fase 1: dados críticos ────────────────────────────────────────────────
  const { data: companies,       error: e1 }  = await supabase.from('companies').select('*').eq('user_id', userId);                                            await sleep(40);
  const { data: subClients,      error: e2 }  = await supabase.from('sub_clients').select('*').eq('user_id', userId);                                          await sleep(40);
  const { data: tasks,           error: e3 }  = await supabase.from('tasks').select('*').eq('user_id', userId);                                                await sleep(40);
  const { data: leads,           error: e4 }  = await supabase.from('leads').select('*').eq('user_id', userId);                                                await sleep(40);
  const { data: quickNotes,      error: e5 }  = await supabase.from('quick_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true }); await sleep(40);
  const { data: todoItems,       error: e6 }  = await supabase.from('todo_items').select('*').eq('user_id', userId);                                           await sleep(40);
  const { data: calendarEvents,  error: e7 }  = await supabase.from('calendar_events').select('*').eq('user_id', userId);                                      await sleep(40);
  const { data: ideas,           error: e8 }  = await supabase.from('ideas').select('*').eq('user_id', userId);                                                await sleep(40);
  const { data: transactions,    error: e9 }  = await supabase.from('transactions').select('*').eq('user_id', userId);                                         await sleep(40);
  const { data: financialGoals,  error: e10 } = await supabase.from('financial_goals').select('*').eq('user_id', userId);                                      await sleep(40);
  const { data: recurringBills,  error: e11 } = await supabase.from('recurring_bills').select('*').eq('user_id', userId);                                      await sleep(40);

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11) {
    const firstErr = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6 ?? e7 ?? e8 ?? e9 ?? e10 ?? e11;
    console.error('Supabase load error (fase 1):', firstErr);
    useTaskStore.getState().setSyncStatus('error');
    endSyncErr(firstErr);
    return;
  }

  useTaskStore.getState().replaceAll({
    companies:      (companies ?? []).map(r => companyFromDb(r as Record<string, unknown>)),
    subClients:     (subClients ?? []).map(r => subClientFromDb(r as Record<string, unknown>)),
    tasks:          (tasks ?? []).map(r => taskFromDb(r as Record<string, unknown>)),
    leads:          (leads ?? []).map(r => leadFromDb(r as Record<string, unknown>)),
    quickNotes:     (quickNotes ?? []).map(r => quickNoteFromDb(r as Record<string, unknown>)),
    todoItems:      (todoItems ?? []).map(r => todoItemFromDb(r as Record<string, unknown>)),
    calendarEvents: (calendarEvents ?? []).map(r => calendarEventFromDb(r as Record<string, unknown>)),
  });

  useFinanceStore.getState().replaceAll({
    transactions:   (transactions ?? []).map(r => transactionFromDb(r as Record<string, unknown>)),
    goals:          (financialGoals ?? []).map(r => financialGoalFromDb(r as Record<string, unknown>)),
    recurringBills: (recurringBills ?? []).map(r => recurringBillFromDb(r as Record<string, unknown>)),
  });

  useIdeasStore.getState().replaceAll(
    (ideas ?? []).map(r => ideaFromDb(r as Record<string, unknown>))
  );

  // ── Fase 2: dados de agência (Onda 5) — tolerante a erros ────────────────
  const { data: contentApprovals, error: ea1 } = await supabase.from('content_approvals').select('*').eq('user_id', userId); await sleep(40);
  const { data: approvalFolders,  error: ea2 } = await supabase.from('approval_folders').select('*').eq('user_id', userId);  await sleep(40);
  const { data: invoices,         error: ea3 } = await supabase.from('invoices').select('*').eq('user_id', userId);          await sleep(40);
  const { data: briefings,        error: ea4 } = await supabase.from('briefings').select('*').eq('user_id', userId);         await sleep(40);
  const { data: onboarding,       error: ea5 } = await supabase.from('onboarding_templates').select('*').eq('user_id', userId); await sleep(40);
  const { data: snippets,         error: ea6 } = await supabase.from('snippets').select('*').eq('user_id', userId);          await sleep(40);
  const { data: habits,           error: ea7 } = await supabase.from('habits').select('*').eq('user_id', userId);            await sleep(40);

  if (ea1) console.error('load content_approvals:', ea1);
  else {
    useContentApprovalsStore.getState().replaceAll(
      (contentApprovals ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          taskId: (row.task_id as string) || undefined,
          clientId: row.client_id as string,
          title: row.title as string,
          type: row.type as ContentApproval['type'],
          assets: (row.assets as ContentApproval['assets']) || [],
          status: row.status as ContentApproval['status'],
          shareToken: row.share_token as string,
          postDate: (row.post_date as string) || undefined,
          feedback: (row.feedback as string) || undefined,
          sentAt: (row.sent_at as string) || undefined,
          viewedAt: (row.viewed_at as string) || undefined,
          decidedAt: (row.decided_at as string) || undefined,
          deletedAt: (row.deleted_at as string) || undefined,
          createdAt: row.created_at as string,
        } as ContentApproval;
      })
    );
  }

  if (ea2) console.error('load approval_folders:', ea2);
  else {
    useContentApprovalsStore.getState().replaceFolders(
      (approvalFolders ?? []).map(r => {
        const row = r as Record<string, unknown>;
        const data = (row.data as Record<string, unknown>) ?? {};
        return { id: row.id as string, ...data } as ApprovalFolder;
      })
    );
  }

  if (ea3) console.error('load invoices:', ea3);
  else {
    useInvoicesStore.getState().replaceAll(
      (invoices ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          clientId: row.client_id as string,
          number: row.number as number,
          date: row.date as string,
          dueDate: (row.due_date as string) || undefined,
          items: (row.items as Invoice['items']) || [],
          subtotal: row.subtotal as number,
          taxes: (row.taxes as number) || 0,
          total: row.total as number,
          notes: (row.notes as string) || undefined,
          status: row.status as Invoice['status'],
          paidAt: (row.paid_at as string) || undefined,
          shareToken: (row.share_token as string) || undefined,
          pixKey: (row.pix_key as string) || undefined,
          pixName: (row.pix_name as string) || undefined,
          deletedAt: (row.deleted_at as string) || undefined,
          createdAt: row.created_at as string,
        } as Invoice;
      })
    );
  }

  if (ea4) console.error('load briefings:', ea4);
  else {
    useBriefingsStore.getState().replaceAll(
      (briefings ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          clientId: row.client_id as string,
          title: row.title as string,
          shareToken: row.share_token as string,
          status: row.status as Briefing['status'],
          questions: (row.questions as Briefing['questions']) || [],
          respondedAt: (row.responded_at as string) || undefined,
          deletedAt: (row.deleted_at as string) || undefined,
          createdAt: row.created_at as string,
        } as Briefing;
      })
    );
  }

  if (ea5) console.error('load onboarding_templates:', ea5);
  else {
    useOnboardingStore.getState().replaceAll(
      (onboarding ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          name: row.name as string,
          steps: (row.steps as OnboardingTemplate['steps']) || [],
          createdAt: row.created_at as string,
        } as OnboardingTemplate;
      })
    );
  }

  if (ea6) console.error('load snippets:', ea6);
  else {
    useSnippetsStore.getState().replaceAll(
      (snippets ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          title: row.title as string,
          text: row.text as string,
          category: (row.category as string) || undefined,
          useCount: (row.use_count as number) || 0,
          createdAt: row.created_at as string,
        } as Snippet;
      })
    );
  }

  if (ea7) console.error('load habits:', ea7);
  else {
    useHabitsStore.getState().replaceAll(
      (habits ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id as string,
          workspaceId: (row.workspace_id as string) || undefined,
          title: row.title as string,
          frequency: row.frequency as Habit['frequency'],
          weekdays: (row.weekdays as number[]) || undefined,
          monthlyDay: (row.monthly_day as number) || undefined,
          completions: (row.completions as Habit['completions']) || [],
          archived: (row.archived as boolean) || false,
          createdAt: row.created_at as string,
        } as Habit;
      })
    );
  }

  // ── Fase 3: workspaces, propostas, time tracking ──────────────────────────
  const { data: workspaces,   error: eb1 } = await supabase.from('workspaces').select('*').eq('user_id', userId);    await sleep(40);
  const { data: proposals,    error: eb2 } = await supabase.from('proposals').select('*').eq('user_id', userId);     await sleep(40);
  const { data: timeEntries,  error: eb3 } = await supabase.from('time_entries').select('*').eq('user_id', userId);

  if (eb1) console.error('load workspaces:', eb1);
  else if (workspaces && workspaces.length > 0) {
    useWorkspacesStore.getState().replaceAll(
      workspaces.map(r => {
        const row = r as Record<string, unknown>;
        return { id: row.id as string, ...(row.data as Record<string, unknown>) } as Workspace;
      })
    );
  }

  if (eb2) console.error('load proposals:', eb2);
  else if (proposals && proposals.length > 0) {
    useProposalsStore.getState().replaceAll(
      proposals.map(r => {
        const row = r as Record<string, unknown>;
        return { id: row.id as string, ...(row.data as Record<string, unknown>) } as Proposal;
      })
    );
  }

  if (eb3) console.error('load time_entries:', eb3);
  else {
    useTimeTrackingStore.getState().replaceAll(
      (timeEntries ?? []).map(r => {
        const row = r as Record<string, unknown>;
        return { id: row.id as string, ...(row.data as Record<string, unknown>) } as TimeEntry;
      })
    );
  }

  useTaskStore.getState().setSyncStatus('idle');
  useTaskStore.getState().setLastSyncAt(new Date().toISOString());
  endSyncOk();
  useSyncStore.getState().markInitialSyncDone();
}

// ─── Push helpers ─────────────────────────────────────────────────────────────

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
  const { error } = await supabase.from('ideas').upsert(ideaToDb(idea, userId));
  if (error) { console.error('syncIdea error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeIdea(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('ideas').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeIdea error:', error); endSyncErr(error); }
  else endSyncOk();
}

// ─── Onda 5 — sync helpers ────────────────────────────────────────────────────

export async function syncContentApproval(a: ContentApproval, userId: string) {
  beginSync();
  const { error } = await supabase.from('content_approvals').upsert({
    id: a.id, user_id: userId,
    workspace_id: a.workspaceId ?? null,
    task_id: a.taskId ?? null,
    client_id: a.clientId,
    title: a.title,
    type: a.type,
    assets: a.assets,
    status: a.status,
    share_token: a.shareToken,
    post_date: a.postDate ?? null,
    feedback: a.feedback ?? null,
    sent_at: a.sentAt ?? null,
    viewed_at: a.viewedAt ?? null,
    decided_at: a.decidedAt ?? null,
    deleted_at: a.deletedAt ?? null,
    created_at: a.createdAt,
  });
  if (error) { console.error('syncContentApproval error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeContentApproval(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('content_approvals').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeContentApproval error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncApprovalFolder(folder: ApprovalFolder, userId: string) {
  beginSync();
  const { id, createdAt, ...rest } = folder;
  const { error } = await supabase.from('approval_folders').upsert({
    id, user_id: userId,
    data: rest,
    created_at: createdAt,
  });
  if (error) { console.error('syncApprovalFolder error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeApprovalFolder(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('approval_folders').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeApprovalFolder error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncInvoice(inv: Invoice, userId: string) {
  beginSync();
  const { error } = await supabase.from('invoices').upsert({
    id: inv.id, user_id: userId,
    workspace_id: inv.workspaceId ?? null,
    client_id: inv.clientId,
    number: inv.number,
    date: inv.date,
    due_date: inv.dueDate ?? null,
    items: inv.items,
    subtotal: inv.subtotal,
    taxes: inv.taxes ?? 0,
    total: inv.total,
    notes: inv.notes ?? null,
    status: inv.status,
    paid_at: inv.paidAt ?? null,
    share_token: inv.shareToken ?? null,
    pix_key: inv.pixKey ?? null,
    pix_name: inv.pixName ?? null,
    deleted_at: inv.deletedAt ?? null,
    created_at: inv.createdAt,
  });
  if (error) { console.error('syncInvoice error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeInvoice(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeInvoice error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncBriefing(b: Briefing, userId: string) {
  beginSync();
  const { error } = await supabase.from('briefings').upsert({
    id: b.id, user_id: userId,
    workspace_id: b.workspaceId ?? null,
    client_id: b.clientId,
    title: b.title,
    share_token: b.shareToken,
    status: b.status,
    questions: b.questions,
    responded_at: b.respondedAt ?? null,
    deleted_at: b.deletedAt ?? null,
    created_at: b.createdAt,
  });
  if (error) { console.error('syncBriefing error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeBriefing(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('briefings').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeBriefing error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncOnboardingTemplate(t: OnboardingTemplate, userId: string) {
  beginSync();
  const { error } = await supabase.from('onboarding_templates').upsert({
    id: t.id, user_id: userId,
    workspace_id: t.workspaceId ?? null,
    name: t.name,
    steps: t.steps,
    created_at: t.createdAt,
  });
  if (error) { console.error('syncOnboardingTemplate error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeOnboardingTemplate(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('onboarding_templates').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeOnboardingTemplate error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncSnippet(sn: Snippet, userId: string) {
  beginSync();
  const { error } = await supabase.from('snippets').upsert({
    id: sn.id, user_id: userId,
    workspace_id: sn.workspaceId ?? null,
    title: sn.title,
    text: sn.text,
    category: sn.category ?? null,
    use_count: sn.useCount ?? 0,
    created_at: sn.createdAt,
  });
  if (error) { console.error('syncSnippet error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeSnippet(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('snippets').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeSnippet error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function syncHabit(h: Habit, userId: string) {
  beginSync();
  const { error } = await supabase.from('habits').upsert({
    id: h.id, user_id: userId,
    workspace_id: h.workspaceId ?? null,
    title: h.title,
    frequency: h.frequency,
    weekdays: h.weekdays ?? null,
    monthly_day: h.monthlyDay ?? null,
    completions: h.completions,
    archived: h.archived ?? false,
    created_at: h.createdAt,
  });
  if (error) { console.error('syncHabit error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeHabit(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('habits').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeHabit error:', error); endSyncErr(error); }
  else endSyncOk();
}

// ─── Workspaces (Onda 4) ──────────────────────────────────────────────────────

export async function syncWorkspace(w: Workspace, userId: string) {
  beginSync();
  const { id, createdAt, ...rest } = w;
  const { error } = await supabase.from('workspaces').upsert({
    id, user_id: userId,
    data: rest,
    created_at: createdAt,
  });
  if (error) { console.error('syncWorkspace error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeWorkspace(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('workspaces').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeWorkspace error:', error); endSyncErr(error); }
  else endSyncOk();
}

// ─── Propostas ────────────────────────────────────────────────────────────────

export async function syncProposal(p: Proposal, userId: string) {
  beginSync();
  const { id, createdAt, ...rest } = p;
  const { error } = await supabase.from('proposals').upsert({
    id, user_id: userId,
    data: rest,
    created_at: createdAt,
  });
  if (error) { console.error('syncProposal error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeProposal(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('proposals').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeProposal error:', error); endSyncErr(error); }
  else endSyncOk();
}

// ─── Time tracking (Onda 6) ───────────────────────────────────────────────────

export async function syncTimeEntry(entry: TimeEntry, userId: string) {
  beginSync();
  const { id, createdAt, ...rest } = entry;
  const { error } = await supabase.from('time_entries').upsert({
    id, user_id: userId,
    data: rest,
    created_at: createdAt,
  });
  if (error) { console.error('syncTimeEntry error:', error); endSyncErr(error); }
  else endSyncOk();
}

export async function removeTimeEntry(id: string, userId: string) {
  beginSync();
  const { error } = await supabase.from('time_entries').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeTimeEntry error:', error); endSyncErr(error); }
  else endSyncOk();
}
