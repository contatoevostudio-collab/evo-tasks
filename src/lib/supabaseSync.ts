import { supabase } from './supabase';
import { useTaskStore } from '../store/tasks';
import type { Task, Company, SubClient } from '../types';

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
  return { id: c.id, user_id: userId, name: c.name, color: c.color };
}

function companyFromDb(r: Record<string, unknown>): Company {
  return { id: r.id as string, name: r.name as string, color: r.color as string };
}

function subClientToDb(s: SubClient, userId: string) {
  return {
    id: s.id, user_id: userId, name: s.name,
    company_id: s.companyId, notes: s.notes ?? null,
    tips: s.tips ?? [],
  };
}

function subClientFromDb(r: Record<string, unknown>): SubClient {
  return {
    id: r.id as string, name: r.name as string,
    companyId: r.company_id as string,
    notes: (r.notes as string) || undefined,
    tips: (r.tips as string[]) || [],
  };
}

// ─── Load all data from Supabase ─────────────────────────────────────────────

export async function loadFromSupabase(userId: string): Promise<void> {
  const [
    { data: companies, error: e1 },
    { data: subClients, error: e2 },
    { data: tasks, error: e3 },
  ] = await Promise.all([
    supabase.from('companies').select('*').eq('user_id', userId),
    supabase.from('sub_clients').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
  ]);

  if (e1 || e2 || e3) {
    console.error('Supabase load error:', e1 ?? e2 ?? e3);
    return;
  }

  if (companies && subClients && tasks) {
    useTaskStore.getState().replaceAll({
      companies: (companies as Record<string, unknown>[]).map(companyFromDb),
      subClients: (subClients as Record<string, unknown>[]).map(subClientFromDb),
      tasks: (tasks as Record<string, unknown>[]).map(taskFromDb),
    });
  }
}

// ─── Push helpers (called by task store) ────────────────────────────────────

export async function syncTask(task: Task, userId: string) {
  const { error } = await supabase.from('tasks').upsert(taskToDb(task, userId));
  if (error) console.error('syncTask error:', error);
}

export async function removeTask(id: string, userId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('removeTask error:', error);
}

export async function syncCompany(company: Company, userId: string) {
  const { error } = await supabase.from('companies').upsert(companyToDb(company, userId));
  if (error) console.error('syncCompany error:', error);
}

export async function removeCompany(id: string, userId: string) {
  const { error } = await supabase.from('companies').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('removeCompany error:', error);
}

export async function syncSubClient(sub: SubClient, userId: string) {
  const { error } = await supabase.from('sub_clients').upsert(subClientToDb(sub, userId));
  if (error) console.error('syncSubClient error:', error);
}

export async function removeSubClient(id: string, userId: string) {
  const { error } = await supabase.from('sub_clients').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('removeSubClient error:', error);
}
