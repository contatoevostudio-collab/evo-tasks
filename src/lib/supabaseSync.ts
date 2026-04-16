import { supabase } from './supabase';
import { useTaskStore } from '../store/tasks';
import type { Task, Company, SubClient, Lead, QuickNote } from '../types';

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
  };
}

function companyToDb(c: Company, userId: string) {
  return { id: c.id, user_id: userId, name: c.name, color: c.color, status: c.status ?? 'ativo' };
}

function companyFromDb(r: Record<string, unknown>): Company {
  return { id: r.id as string, name: r.name as string, color: r.color as string, status: ((r.status as string) || 'ativo') as Company['status'] };
}

function subClientToDb(s: SubClient, userId: string) {
  return {
    id: s.id, user_id: userId, name: s.name,
    company_id: s.companyId, notes: s.notes ?? null,
    tips: s.tips ?? [],
    monthly_quota: s.monthlyQuota ?? null,
  };
}

function subClientFromDb(r: Record<string, unknown>): SubClient {
  return {
    id: r.id as string, name: r.name as string,
    companyId: r.company_id as string,
    monthlyQuota: (r.monthly_quota as number) || undefined,
    notes: (r.notes as string) || undefined,
    tips: (r.tips as string[]) || [],
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
  };
}

// ─── Load all data from Supabase ─────────────────────────────────────────────

export async function loadFromSupabase(userId: string): Promise<void> {
  useTaskStore.getState().setSyncStatus('syncing');
  const [
    { data: companies, error: e1 },
    { data: subClients, error: e2 },
    { data: tasks, error: e3 },
    { data: leads, error: e4 },
    { data: quickNotes, error: e5 },
  ] = await Promise.all([
    supabase.from('companies').select('*').eq('user_id', userId),
    supabase.from('sub_clients').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('leads').select('*').eq('user_id', userId),
    supabase.from('quick_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  if (e1 || e2 || e3 || e4 || e5) {
    console.error('Supabase load error:', e1 ?? e2 ?? e3 ?? e4 ?? e5);
    useTaskStore.getState().setSyncStatus('error');
    return;
  }

  useTaskStore.getState().replaceAll({
    companies: (companies ?? []).map(r => companyFromDb(r as Record<string, unknown>)),
    subClients: (subClients ?? []).map(r => subClientFromDb(r as Record<string, unknown>)),
    tasks: (tasks ?? []).map(r => taskFromDb(r as Record<string, unknown>)),
    leads: (leads ?? []).map(r => leadFromDb(r as Record<string, unknown>)),
    quickNotes: (quickNotes ?? []).map(r => quickNoteFromDb(r as Record<string, unknown>)),
  });
  useTaskStore.getState().setSyncStatus('idle');
}

// ─── Push helpers (called by task store) ────────────────────────────────────

export async function syncTask(task: Task, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('tasks').upsert(taskToDb(task, userId));
  if (error) { console.error('syncTask error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function removeTask(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeTask error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function syncCompany(company: Company, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('companies').upsert(companyToDb(company, userId));
  if (error) { console.error('syncCompany error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function removeCompany(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('companies').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeCompany error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function syncSubClient(sub: SubClient, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('sub_clients').upsert(subClientToDb(sub, userId));
  if (error) { console.error('syncSubClient error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function removeSubClient(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('sub_clients').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeSubClient error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function syncLead(lead: Lead, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('leads').upsert(leadToDb(lead, userId));
  if (error) { console.error('syncLead error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function removeLead(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('leads').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeLead error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function syncQuickNote(note: QuickNote, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('quick_notes').upsert(quickNoteToDb(note, userId));
  if (error) { console.error('syncQuickNote error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}

export async function removeQuickNote(id: string, userId: string) {
  useTaskStore.getState().setSyncStatus('syncing');
  const { error } = await supabase.from('quick_notes').delete().eq('id', id).eq('user_id', userId);
  if (error) { console.error('removeQuickNote error:', error); useTaskStore.getState().setSyncStatus('error'); }
  else useTaskStore.getState().setSyncStatus('idle');
}
