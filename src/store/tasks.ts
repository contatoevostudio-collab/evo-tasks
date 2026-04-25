import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskTemplate, Company, SubClient, Lead, LeadInteraction, LeadStage, TaskStatus, TaskType, TaskCategory, ViewMode, Priority, Theme, QuickNote, TodoItem, TodoItemStatus, TodoContext, CalendarEvent, CalendarEventCategory, PomodoroSession, PaymentRecord, CompanyInteraction } from '../types';
import { format } from 'date-fns';
import { syncTask, removeTask, syncCompany, removeCompany, syncSubClient, removeSubClient, syncLead, removeLead, syncQuickNote, removeQuickNote, syncTodoItem, removeTodoItem, syncCalendarEvent, removeCalendarEvent } from '../lib/supabaseSync';
import { useAuthStore } from './auth';
import { useWorkspacesStore } from './workspaces';

const DEFAULT_COMPANIES: Company[] = [
  { id: 'imperio',    name: 'IMPERIO',      color: '#30d158' },
  { id: 'plus',       name: 'PLUS DIGITAL', color: '#ff9f0a' },
  { id: 'pessoal',    name: 'PESSOAL',      color: '#ff453a' },
  { id: 'portfolio',  name: 'PORTFOLIO',    color: '#bf5af2' },
  { id: 'financeiro', name: 'FINANCEIRO',   color: '#636366' },
];

const DEFAULT_SUB_CLIENTS: SubClient[] = [
  { id: 'sc-trindade',    name: 'Trindade',    companyId: 'imperio' },
  { id: 'sc-iorrana',     name: 'Iorrana',     companyId: 'imperio' },
  { id: 'sc-chametec',    name: 'Chametec',    companyId: 'imperio' },
  { id: 'sc-monique',     name: 'Monique',     companyId: 'imperio' },
  { id: 'sc-quazeda',     name: 'Quazeda',     companyId: 'imperio' },
  { id: 'sc-clinica-polo', name: 'Clínica Polo', companyId: 'plus' },
];

const today = format(new Date(), 'yyyy-MM-dd');

const SAMPLE_TASKS: Task[] = [
  { id: '1', companyId: 'imperio', subClientId: 'sc-trindade',    taskType: 'carrossel', sequence: 1, date: today, status: 'todo',  allDay: true, priority: 'alta',  createdAt: new Date().toISOString() },
  { id: '2', companyId: 'imperio', subClientId: 'sc-iorrana',     taskType: 'reels',     sequence: 1, date: today, status: 'doing', allDay: true, priority: 'media', createdAt: new Date().toISOString() },
  { id: '3', companyId: 'plus',    subClientId: 'sc-clinica-polo', taskType: 'feed',     sequence: 1, date: today, status: 'done',  allDay: true, priority: 'baixa', createdAt: new Date().toISOString() },
];

interface TaskStore {
  companies: Company[];
  subClients: SubClient[];
  tasks: Task[];
  leads: Lead[];
  viewMode: ViewMode;
  currentDate: Date;
  selectedCompanies: string[];
  hideDone: boolean;
  filterPriority: Priority | null;
  filterSubClient: string | null;   // #3 / #53
  filterTaskType: TaskType | null;  // #50
  filterTaskCategory: TaskCategory | null;
  filterTags: string[];             // #5 — tag filter
  sidebarCollapsed: boolean;        // #5
  theme: Theme;                     // #60
  kanbanOrder: Record<TaskStatus, string[]>;
  pin: string | null;

  // Task CRUD
  addTask(t: Omit<Task, 'id'>): string;
  updateTask(id: string, updates: Partial<Task>): void;
  deleteTask(id: string): void;                     // soft-delete → lixeira
  permanentlyDeleteTask(id: string): void;          // remove de vez (lixeira)
  restoreTask(id: string): void;                    // restaurar da lixeira
  duplicateTask(id: string): string;       // #2
  updateTaskStatus(id: string, status: TaskStatus): void;
  cycleTaskStatus(id: string): void;       // #34/#37 todo→doing→done→todo
  toggleArchive(id: string): void;         // #13

  // Subtask CRUD (#10)
  addSubTask(taskId: string, label: string): void;
  toggleSubTask(taskId: string, subId: string): void;
  deleteSubTask(taskId: string, subId: string): void;

  // Company CRUD
  addCompany(c: Omit<Company, 'id'>): void;
  updateCompany(id: string, updates: Partial<Company>): void;
  deleteCompany(id: string): void;                  // soft-delete → lixeira
  permanentlyDeleteCompany(id: string): void;       // remove de vez
  restoreCompany(id: string): void;                 // restaurar da lixeira
  moveCompanyUp(id: string): void;    // #55
  moveCompanyDown(id: string): void;  // #55

  // SubClient CRUD
  addSubClient(s: Omit<SubClient, 'id'>): void;
  updateSubClient(id: string, updates: Partial<SubClient>): void;
  deleteSubClient(id: string): void;                // soft-delete → lixeira
  permanentlyDeleteSubClient(id: string): void;     // remove de vez
  restoreSubClient(id: string): void;               // restaurar da lixeira
  updateSubClientNotes(id: string, notes: string): void;
  updateSubClientTips(id: string, tips: string[]): void;
  reorderSubClients(companyId: string, orderedIds: string[]): void;
  archiveCompany(id: string): void;
  unarchiveCompany(id: string): void;
  addPaymentRecord(companyId: string, record: Omit<PaymentRecord, 'id'>): void;
  deletePaymentRecord(companyId: string, recordId: string): void;
  addInteraction(companyId: string, interaction: Omit<CompanyInteraction, 'id'>): void;
  deleteInteraction(companyId: string, interactionId: string): void;

  // Lead CRM CRUD
  addLead(l: Omit<Lead, 'id' | 'createdAt'>): string;
  updateLead(id: string, updates: Partial<Lead>): void;
  deleteLead(id: string): void;                     // soft-delete → lixeira
  permanentlyDeleteLead(id: string): void;          // remove de vez
  restoreLead(id: string): void;                    // restaurar da lixeira
  moveLead(id: string, stage: LeadStage): void;
  convertLead(id: string, companyName: string, color: string): void;
  addLeadInteraction(leadId: string, i: Omit<LeadInteraction, 'id'>): void; // #37
  deleteLeadInteraction(leadId: string, interactionId: string): void;

  // Lixeira (30 dias)
  purgeOldTrash(): void;

  setKanbanOrder(status: TaskStatus, ids: string[]): void;
  setPin(p: string | null): void;

  // Auth / sync
  userId: string | null;
  setUserId(id: string | null): void;
  replaceAll(data: { companies: Company[]; subClients: SubClient[]; tasks: Task[]; leads: Lead[]; quickNotes?: QuickNote[]; todoItems?: TodoItem[]; calendarEvents?: CalendarEvent[] }): void;

  // Toast / undo
  toast: { text: string; undoFn?: () => void } | null;
  showToast(text: string, undoFn?: () => void): void;
  hideToast(): void;

  // User display name + profile
  userName: string;
  userPhoto: string;
  accentColor: string;
  setUserName(name: string): void;
  setUserPhoto(photo: string): void;
  setAccentColor(color: string): void;
  clearAllData(): void;

  // Animations toggle (#43)
  animationsEnabled: boolean;
  setAnimationsEnabled(v: boolean): void;

  // Compact mode (#45)
  compactMode: boolean;
  toggleCompactMode(): void;

  // Sidebar width (#51)
  sidebarWidth: number;
  setSidebarWidth(w: number): void;

  // Home section layout (#50)
  homeLayout: string[];
  setHomeLayout(layout: string[]): void;

  // Home bento grid layout (react-grid-layout per breakpoint)
  homeGridLayouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>;
  setHomeGridLayouts(layouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>>): void;
  resetHomeGridLayouts(): void;

  // Last sync timestamp (#55)
  lastSyncAt: string | null;
  setLastSyncAt(t: string): void;

  // Pomodoro sessions (#30)
  pomodoroSessions: PomodoroSession[];
  addPomodoroSession(s: Omit<PomodoroSession, 'id'>): void;
  clearPomodoroSessions(): void;

  // Pomodoro daily goal (#34)
  pomodoroGoal: number;
  setPomodoroGoal(n: number): void;

  // Sync indicator (#50)
  syncStatus: 'idle' | 'syncing' | 'error';
  setSyncStatus(s: 'idle' | 'syncing' | 'error'): void;

  // Navigation
  setViewMode(mode: ViewMode): void;
  setCurrentDate(date: Date): void;
  toggleCompany(id: string): void;
  selectAllCompanies(): void;    // #4
  deselectAllCompanies(): void;  // #4
  toggleHideDone(): void;
  setFilterPriority(p: Priority | null): void;
  setFilterSubClient(id: string | null): void;  // #3
  setFilterTaskType(t: TaskType | null): void;  // #50
  setFilterTaskCategory(c: TaskCategory | null): void;
  toggleFilterTag(tag: string): void; // #5 — toggle tag filter
  clearAllFilters(): void;       // #51
  toggleSidebar(): void;         // #5
  setTheme(t: Theme): void;      // #60

  // Quick Notes
  quickNotes: QuickNote[];
  addQuickNote(text: string): void;
  toggleQuickNote(id: string): void;
  deleteQuickNote(id: string): void;
  reorderQuickNotes(activeId: string, overId: string): void;

  // Todo items (weekly calendar)
  todoItems: TodoItem[];
  addTodoItem(text: string, date: string, status?: TodoItemStatus, context?: TodoContext, priority?: Priority): void;
  toggleTodoItem(id: string): void;
  moveTodoItem(id: string, status: TodoItemStatus): void;
  deleteTodoItem(id: string): void;
  archiveTodoItem(id: string): void;
  updateTodoItem(id: string, updates: Partial<Pick<TodoItem, 'text' | 'context' | 'priority'>>): void;
  addTodoSubTask(todoId: string, label: string): void;  // #41
  toggleTodoSubTask(todoId: string, subId: string): void;
  deleteTodoSubTask(todoId: string, subId: string): void;
  convertTodoToTask(todoId: string): string;  // #44 — returns new task id

  // Calendar events
  calendarEvents: CalendarEvent[];
  calendarCategoryFilter: CalendarEventCategory | 'todos';
  addCalendarEvent(e: Omit<CalendarEvent, 'id' | 'createdAt'>): void;
  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): void;
  deleteCalendarEvent(id: string): void;
  setCalendarCategoryFilter(f: CalendarEventCategory | 'todos'): void;

  // Task templates (Onda 3C)
  taskTemplates: TaskTemplate[];
  addTaskTemplate(t: Omit<TaskTemplate, 'id' | 'createdAt'>): string;
  updateTaskTemplate(id: string, updates: Partial<TaskTemplate>): void;
  deleteTaskTemplate(id: string): void;

  // Helper
  nextSequence(companyId: string, subClientId: string, taskType: TaskType): number;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      companies: DEFAULT_COMPANIES,
      subClients: DEFAULT_SUB_CLIENTS,
      tasks: SAMPLE_TASKS,
      leads: [],
      viewMode: 'kanban',
      currentDate: new Date(),
      selectedCompanies: DEFAULT_COMPANIES.map((c) => c.id),
      hideDone: false,
      filterPriority: null,
      filterSubClient: null,
      filterTaskType: null,
      filterTaskCategory: null,
      filterTags: [],
      sidebarCollapsed: false,
      theme: 'dark-blue',
      kanbanOrder: { todo: [], doing: [], done: [] },
      pin: null,
      toast: null,
      userId: null,
      userName: '',
      userPhoto: '',
      accentColor: '#356BFF',
      animationsEnabled: true,
      compactMode: false,
      sidebarWidth: 220,
      homeLayout: ['stats', 'quota', 'categories', 'next3', 'streak', 'chart', 'heatmap'],
      homeGridLayouts: {},
      lastSyncAt: null,
      pomodoroSessions: [],
      pomodoroGoal: 4,
      syncStatus: 'idle' as const,
      quickNotes: [],
      todoItems: [],
      calendarEvents: [],
      calendarCategoryFilter: 'todos' as const,
      taskTemplates: [],

      addTask: (task) => {
        const id = crypto.randomUUID();
        const wsId = useWorkspacesStore.getState().activeWorkspaceId;
        const full = { ...task, id, workspaceId: task.workspaceId ?? (wsId ?? undefined), createdAt: task.createdAt ?? new Date().toISOString() };
        set((state) => ({ tasks: [...state.tasks, full] }));
        const userId = get().userId;
        if (userId) syncTask(full, userId).catch(console.error);
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      deleteTask: (id) => {
        // Soft-delete → marca como deletado (vai para a lixeira por 30 dias)
        const deletedAt = new Date().toISOString();
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, deletedAt } : t)) }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      permanentlyDeleteTask: (id) => {
        const userId = get().userId;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        if (userId) removeTask(id, userId).catch(console.error);
      },

      restoreTask: (id) => {
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, deletedAt: undefined } : t)) }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      duplicateTask: (id) => {
        const src = get().tasks.find(t => t.id === id);
        if (!src) return '';
        const newId = crypto.randomUUID();
        const dup = { ...src, id: newId, status: 'todo' as TaskStatus, createdAt: new Date().toISOString(), versions: undefined, subtasks: undefined };
        set(state => ({ tasks: [...state.tasks, dup] }));
        const userId = get().userId;
        if (userId) syncTask(dup, userId).catch(console.error);
        return newId;
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      cycleTaskStatus: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const next: TaskStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
            return { ...t, status: next };
          }),
        }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      toggleArchive: (id) => {
        set((state) => ({ tasks: state.tasks.map((t) => t.id === id ? { ...t, archived: !t.archived } : t) }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === id); if (t) syncTask(t, userId).catch(console.error); }
      },

      addSubTask: (taskId, label) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const st = t.subtasks ?? [];
            return { ...t, subtasks: [...st, { id: crypto.randomUUID(), label, done: false }] };
          }),
        }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === taskId); if (t) syncTask(t, userId).catch(console.error); }
      },

      toggleSubTask: (taskId, subId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return { ...t, subtasks: (t.subtasks ?? []).map((s) => s.id === subId ? { ...s, done: !s.done } : s) };
          }),
        }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === taskId); if (t) syncTask(t, userId).catch(console.error); }
      },

      deleteSubTask: (taskId, subId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return { ...t, subtasks: (t.subtasks ?? []).filter((s) => s.id !== subId) };
          }),
        }));
        const { userId, tasks } = get();
        if (userId) { const t = tasks.find(x => x.id === taskId); if (t) syncTask(t, userId).catch(console.error); }
      },

      addCompany: (company) => {
        const wsId = useWorkspacesStore.getState().activeWorkspaceId;
        const full = { ...company, id: crypto.randomUUID(), workspaceId: company.workspaceId ?? (wsId ?? undefined) };
        set((state) => ({ companies: [...state.companies, full], selectedCompanies: [...state.selectedCompanies, full.id] }));
        const userId = get().userId;
        if (userId) syncCompany(full, userId).catch(console.error);
      },

      updateCompany: (id, updates) => {
        set((state) => ({ companies: state.companies.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      deleteCompany: (id) => {
        // Soft-delete → marca como deletado (vai para a lixeira por 30 dias)
        const deletedAt = new Date().toISOString();
        set((state) => ({
          companies: state.companies.map((c) => (c.id === id ? { ...c, deletedAt } : c)),
          selectedCompanies: state.selectedCompanies.filter((cid) => cid !== id),
        }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      permanentlyDeleteCompany: (id) => {
        const userId = get().userId;
        // Coleta IDs de subclients e tarefas para também remover do Supabase
        const subIds = get().subClients.filter(s => s.companyId === id).map(s => s.id);
        const taskIds = get().tasks.filter(t => t.companyId === id).map(t => t.id);
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          subClients: state.subClients.filter((s) => s.companyId !== id),
          tasks: state.tasks.filter((t) => t.companyId !== id),
          selectedCompanies: state.selectedCompanies.filter((cid) => cid !== id),
        }));
        if (userId) {
          removeCompany(id, userId).catch(console.error);
          subIds.forEach(sid => removeSubClient(sid, userId).catch(console.error));
          taskIds.forEach(tid => removeTask(tid, userId).catch(console.error));
        }
      },

      restoreCompany: (id) => {
        set((state) => ({
          companies: state.companies.map((c) => (c.id === id ? { ...c, deletedAt: undefined } : c)),
          selectedCompanies: state.selectedCompanies.includes(id) ? state.selectedCompanies : [...state.selectedCompanies, id],
        }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      moveCompanyUp: (id) =>
        set((state) => {
          const list = [...state.companies];
          const idx = list.findIndex(c => c.id === id);
          if (idx <= 0) return {};
          [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
          return { companies: list };
        }),

      moveCompanyDown: (id) =>
        set((state) => {
          const list = [...state.companies];
          const idx = list.findIndex(c => c.id === id);
          if (idx < 0 || idx >= list.length - 1) return {};
          [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
          return { companies: list };
        }),

      addSubClient: (sub) => {
        const full = { ...sub, id: crypto.randomUUID() };
        set((state) => ({ subClients: [...state.subClients, full] }));
        const userId = get().userId;
        if (userId) syncSubClient(full, userId).catch(console.error);
      },

      updateSubClient: (id, updates) => {
        set((state) => ({ subClients: state.subClients.map((s) => (s.id === id ? { ...s, ...updates } : s)) }));
        const { userId, subClients } = get();
        if (userId) { const s = subClients.find(x => x.id === id); if (s) syncSubClient(s, userId).catch(console.error); }
      },

      deleteSubClient: (id) => {
        // Soft-delete → marca como deletado (vai para a lixeira por 30 dias)
        const deletedAt = new Date().toISOString();
        set((state) => ({
          subClients: state.subClients.map((s) => (s.id === id ? { ...s, deletedAt } : s)),
        }));
        const { userId, subClients } = get();
        if (userId) { const s = subClients.find(x => x.id === id); if (s) syncSubClient(s, userId).catch(console.error); }
      },

      permanentlyDeleteSubClient: (id) => {
        const userId = get().userId;
        const taskIds = get().tasks.filter(t => t.subClientId === id).map(t => t.id);
        set((state) => ({
          subClients: state.subClients.filter((s) => s.id !== id),
          tasks: state.tasks.filter((t) => t.subClientId !== id),
        }));
        if (userId) {
          removeSubClient(id, userId).catch(console.error);
          taskIds.forEach(tid => removeTask(tid, userId).catch(console.error));
        }
      },

      restoreSubClient: (id) => {
        set((state) => ({
          subClients: state.subClients.map((s) => (s.id === id ? { ...s, deletedAt: undefined } : s)),
        }));
        const { userId, subClients } = get();
        if (userId) { const s = subClients.find(x => x.id === id); if (s) syncSubClient(s, userId).catch(console.error); }
      },

      updateSubClientNotes: (id, notes) => {
        set((state) => ({ subClients: state.subClients.map(s => s.id === id ? { ...s, notes } : s) }));
        const { userId, subClients } = get();
        if (userId) { const s = subClients.find(x => x.id === id); if (s) syncSubClient(s, userId).catch(console.error); }
      },

      updateSubClientTips: (id, tips) => {
        set((state) => ({ subClients: state.subClients.map(s => s.id === id ? { ...s, tips } : s) }));
        const { userId, subClients } = get();
        if (userId) { const s = subClients.find(x => x.id === id); if (s) syncSubClient(s, userId).catch(console.error); }
      },

      reorderSubClients: (companyId, orderedIds) => {
        set(state => {
          const sorted = orderedIds.map(id => state.subClients.find(s => s.id === id)).filter(Boolean) as typeof state.subClients;
          const others = state.subClients.filter(s => s.companyId !== companyId);
          return { subClients: [...others, ...sorted] };
        });
      },

      archiveCompany: (id) => {
        set(state => ({ companies: state.companies.map(c => c.id === id ? { ...c, archived: true } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      unarchiveCompany: (id) => {
        set(state => ({ companies: state.companies.map(c => c.id === id ? { ...c, archived: false } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      addPaymentRecord: (companyId, record) => {
        const full: PaymentRecord = { ...record, id: crypto.randomUUID() };
        set(state => ({ companies: state.companies.map(c => c.id === companyId ? { ...c, paymentHistory: [...(c.paymentHistory ?? []), full] } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === companyId); if (c) syncCompany(c, userId).catch(console.error); }
      },

      deletePaymentRecord: (companyId, recordId) => {
        set(state => ({ companies: state.companies.map(c => c.id === companyId ? { ...c, paymentHistory: (c.paymentHistory ?? []).filter(r => r.id !== recordId) } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === companyId); if (c) syncCompany(c, userId).catch(console.error); }
      },

      addInteraction: (companyId, interaction) => {
        const full: CompanyInteraction = { ...interaction, id: crypto.randomUUID() };
        set(state => ({ companies: state.companies.map(c => c.id === companyId ? { ...c, interactions: [...(c.interactions ?? []), full] } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === companyId); if (c) syncCompany(c, userId).catch(console.error); }
      },

      deleteInteraction: (companyId, interactionId) => {
        set(state => ({ companies: state.companies.map(c => c.id === companyId ? { ...c, interactions: (c.interactions ?? []).filter(i => i.id !== interactionId) } : c) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === companyId); if (c) syncCompany(c, userId).catch(console.error); }
      },

      addLead: (lead) => {
        const id = crypto.randomUUID();
        const wsId = useWorkspacesStore.getState().activeWorkspaceId;
        const full: Lead = { ...lead, id, workspaceId: lead.workspaceId ?? (wsId ?? undefined), createdAt: new Date().toISOString() };
        set((state) => ({ leads: [...state.leads, full] }));
        const userId = get().userId;
        if (userId) syncLead(full, userId).catch(console.error);
        return id;
      },

      updateLead: (id, updates) => {
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === id); if (l) syncLead(l, userId).catch(console.error); }
      },

      deleteLead: (id) => {
        // Soft-delete → marca como deletado (vai para a lixeira por 30 dias)
        const deletedAt = new Date().toISOString();
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, deletedAt } : l)) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === id); if (l) syncLead(l, userId).catch(console.error); }
      },

      permanentlyDeleteLead: (id) => {
        const userId = get().userId;
        set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
        if (userId) removeLead(id, userId).catch(console.error);
      },

      restoreLead: (id) => {
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, deletedAt: undefined } : l)) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === id); if (l) syncLead(l, userId).catch(console.error); }
      },

      moveLead: (id, stage) => {
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, stage } : l)) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === id); if (l) syncLead(l, userId).catch(console.error); }
      },

      convertLead: (id, companyName, color) => {
        const companyId = crypto.randomUUID();
        const name = companyName.trim().toUpperCase();
        const company: Company = { id: companyId, name, color };
        set((state) => ({
          companies: [...state.companies, company],
          selectedCompanies: [...state.selectedCompanies, companyId],
          leads: state.leads.map((l) => l.id === id ? { ...l, convertedToCompanyId: companyId, stage: 'fechado' as LeadStage } : l),
        }));
        const userId = get().userId;
        if (userId) {
          syncCompany(company, userId).catch(console.error);
          const { leads } = get();
          const l = leads.find(x => x.id === id);
          if (l) syncLead(l, userId).catch(console.error);
        }
      },

      addLeadInteraction: (leadId, interaction) => {
        const full: LeadInteraction = { ...interaction, id: crypto.randomUUID() };
        set(state => ({ leads: state.leads.map(l => l.id === leadId ? { ...l, interactions: [...(l.interactions ?? []), full] } : l) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === leadId); if (l) syncLead(l, userId).catch(console.error); }
      },

      deleteLeadInteraction: (leadId, interactionId) => {
        set(state => ({ leads: state.leads.map(l => l.id === leadId ? { ...l, interactions: (l.interactions ?? []).filter(i => i.id !== interactionId) } : l) }));
        const { userId, leads } = get();
        if (userId) { const l = leads.find(x => x.id === leadId); if (l) syncLead(l, userId).catch(console.error); }
      },

      setKanbanOrder: (status, ids) =>
        set(s => ({ kanbanOrder: { ...s.kanbanOrder, [status]: ids } })),

      setPin: (pin) => set({ pin }),

      setUserId: (userId) => set({ userId }),

      purgeOldTrash: () => {
        // Remove permanentemente itens que estão na lixeira há mais de 30 dias
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const isExpired = (iso?: string) => !!iso && new Date(iso).getTime() < cutoff;

        const { userId, tasks, leads, companies, subClients } = get();

        const expiredTaskIds   = tasks.filter(t => isExpired(t.deletedAt)).map(t => t.id);
        const expiredLeadIds   = leads.filter(l => isExpired(l.deletedAt)).map(l => l.id);
        const expiredCompIds   = companies.filter(c => isExpired(c.deletedAt)).map(c => c.id);
        const expiredSubIds    = subClients.filter(s => isExpired(s.deletedAt)).map(s => s.id);

        if (expiredTaskIds.length === 0 && expiredLeadIds.length === 0 && expiredCompIds.length === 0 && expiredSubIds.length === 0) return;

        // Quando uma empresa expira, também removemos seus subclients e tarefas
        // (mesmo que o deletedAt deles seja diferente — limpeza em cascata)
        const cascadeSubIds  = subClients.filter(s => expiredCompIds.includes(s.companyId)).map(s => s.id);
        const cascadeTaskIds = tasks.filter(t => expiredCompIds.includes(t.companyId) || expiredSubIds.includes(t.subClientId)).map(t => t.id);

        const allTaskIds = Array.from(new Set([...expiredTaskIds, ...cascadeTaskIds]));
        const allSubIds  = Array.from(new Set([...expiredSubIds, ...cascadeSubIds]));

        set((state) => ({
          tasks: state.tasks.filter(t => !allTaskIds.includes(t.id)),
          leads: state.leads.filter(l => !expiredLeadIds.includes(l.id)),
          subClients: state.subClients.filter(s => !allSubIds.includes(s.id)),
          companies: state.companies.filter(c => !expiredCompIds.includes(c.id)),
        }));

        if (userId) {
          allTaskIds.forEach(id => removeTask(id, userId).catch(console.error));
          expiredLeadIds.forEach(id => removeLead(id, userId).catch(console.error));
          allSubIds.forEach(id => removeSubClient(id, userId).catch(console.error));
          expiredCompIds.forEach(id => removeCompany(id, userId).catch(console.error));
        }
      },

      replaceAll: ({ companies, subClients, tasks, leads, quickNotes, todoItems, calendarEvents }) =>
        set((state) => {
          // Preserve existing selection; auto-select any brand-new companies
          const prev = new Set(state.selectedCompanies);
          const selectedCompanies = state.selectedCompanies.length === 0
            ? companies.map(c => c.id)
            : companies.map(c => c.id).filter(id => prev.has(id) || !state.companies.some(x => x.id === id));
          return {
            companies,
            subClients,
            tasks,
            leads,
            quickNotes: quickNotes ?? state.quickNotes,
            todoItems: todoItems ?? state.todoItems,
            calendarEvents: calendarEvents ?? state.calendarEvents,
            selectedCompanies,
            kanbanOrder: state.kanbanOrder,
            // preserve UI state
            viewMode: state.viewMode,
            theme: state.theme,
            sidebarCollapsed: state.sidebarCollapsed,
          };
        }),

      showToast: (text, undoFn) => set({ toast: { text, undoFn } }),
      hideToast: () => set({ toast: null }),

      setUserName: (name) => set({ userName: name }),
      setUserPhoto: (photo) => set({ userPhoto: photo }),
      setAccentColor: (color) => set({ accentColor: color }),
      clearAllData: () => set({
        tasks: [],
        companies: DEFAULT_COMPANIES,
        subClients: DEFAULT_SUB_CLIENTS,
        leads: [],
        quickNotes: [],
        todoItems: [],
        kanbanOrder: { todo: [], doing: [], done: [] },
        selectedCompanies: DEFAULT_COMPANIES.map(c => c.id),
        hideDone: false,
        filterPriority: null,
        filterSubClient: null,
        filterTaskType: null,
        filterTaskCategory: null,
      }),
      setAnimationsEnabled: (v) => set({ animationsEnabled: v }),
      toggleCompactMode: () => set(s => ({ compactMode: !s.compactMode })),
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(320, w)) }),
      setHomeLayout: (layout) => set({ homeLayout: layout }),

      setHomeGridLayouts: (layouts) => set({ homeGridLayouts: layouts }),
      resetHomeGridLayouts: () => set({ homeGridLayouts: {} }),
      setLastSyncAt: (t) => set({ lastSyncAt: t }),
      addPomodoroSession: (s) => set(state => ({ pomodoroSessions: [...state.pomodoroSessions, { ...s, id: crypto.randomUUID() }] })),
      clearPomodoroSessions: () => set({ pomodoroSessions: [] }),
      setPomodoroGoal: (n) => set({ pomodoroGoal: n }),
      setSyncStatus: (s) => set({ syncStatus: s }),

      setViewMode: (viewMode) => set({ viewMode }),
      setCurrentDate: (currentDate) => set({ currentDate }),

      toggleCompany: (id) =>
        set((state) => ({
          selectedCompanies: state.selectedCompanies.includes(id)
            ? state.selectedCompanies.filter((c) => c !== id)
            : [...state.selectedCompanies, id],
        })),

      selectAllCompanies: () =>
        set((state) => ({ selectedCompanies: state.companies.filter(c => !c.deletedAt).map(c => c.id) })),

      deselectAllCompanies: () =>
        set({ selectedCompanies: [] }),

      toggleHideDone: () => set((s) => ({ hideDone: !s.hideDone })),

      setFilterPriority: (p) =>
        set((s) => ({ filterPriority: s.filterPriority === p ? null : p })),

      setFilterSubClient: (id) =>
        set((s) => ({ filterSubClient: s.filterSubClient === id ? null : id })),

      setFilterTaskType: (t) =>
        set((s) => ({ filterTaskType: s.filterTaskType === t ? null : t })),
      setFilterTaskCategory: (c) =>
        set((s) => ({ filterTaskCategory: s.filterTaskCategory === c ? null : c })),

      toggleFilterTag: (tag) =>
        set((s) => ({
          filterTags: s.filterTags.includes(tag)
            ? s.filterTags.filter(t => t !== tag)
            : [...s.filterTags, tag],
        })),

      clearAllFilters: () =>
        set({ filterPriority: null, filterSubClient: null, filterTaskType: null, filterTaskCategory: null, filterTags: [], hideDone: false }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),

      addQuickNote: (text) => {
        const note: QuickNote = { id: crypto.randomUUID(), text, checked: false, createdAt: new Date().toISOString() };
        set(state => ({ quickNotes: [...state.quickNotes, note] }));
        const userId = get().userId;
        if (userId) syncQuickNote(note, userId).catch(console.error);
      },
      toggleQuickNote: (id) => {
        set(state => ({ quickNotes: state.quickNotes.map(n => n.id === id ? { ...n, checked: !n.checked } : n) }));
        const { userId, quickNotes } = get();
        if (userId) { const n = quickNotes.find(x => x.id === id); if (n) syncQuickNote(n, userId).catch(console.error); }
      },
      deleteQuickNote: (id) => {
        const userId = get().userId;
        set(state => ({ quickNotes: state.quickNotes.filter(n => n.id !== id) }));
        if (userId) removeQuickNote(id, userId).catch(console.error);
      },
      reorderQuickNotes: (activeId, overId) => {
        set(state => {
          const from = state.quickNotes.findIndex(n => n.id === activeId);
          const to   = state.quickNotes.findIndex(n => n.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          const arr = [...state.quickNotes];
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          return { quickNotes: arr };
        });
      },

      addTodoItem: (text, date, status = 'todo', context, priority) => {
        const item: TodoItem = { id: crypto.randomUUID(), text, checked: status === 'done', status, date, createdAt: new Date().toISOString(), context, priority };
        set(state => ({ todoItems: [...state.todoItems, item] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncTodoItem(item, userId).catch(console.error);
      },
      toggleTodoItem: (id) => {
        set(state => ({ todoItems: state.todoItems.map(t => {
          if (t.id !== id) return t;
          const newChecked = !t.checked;
          return { ...t, checked: newChecked, status: newChecked ? 'done' as TodoItemStatus : 'todo' as TodoItemStatus };
        }) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === id); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      moveTodoItem: (id, status) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id === id ? { ...t, status, checked: status === 'done' } : t) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === id); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      deleteTodoItem: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set(state => ({ todoItems: state.todoItems.filter(t => t.id !== id) }));
        if (userId) removeTodoItem(id, userId).catch(console.error);
      },
      archiveTodoItem: (id) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id === id ? { ...t, archived: true } : t) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === id); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      updateTodoItem: (id, updates) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id === id ? { ...t, ...updates } : t) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === id); if (t) syncTodoItem(t, userId).catch(console.error); }
      },

      addTodoSubTask: (todoId, label) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id === todoId ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), label, done: false }] } : t) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === todoId); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      toggleTodoSubTask: (todoId, subId) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id !== todoId ? t : { ...t, subtasks: (t.subtasks ?? []).map(s => s.id === subId ? { ...s, done: !s.done } : s) }) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === todoId); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      deleteTodoSubTask: (todoId, subId) => {
        set(state => ({ todoItems: state.todoItems.map(t => t.id !== todoId ? t : { ...t, subtasks: (t.subtasks ?? []).filter(s => s.id !== subId) }) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().todoItems.find(x => x.id === todoId); if (t) syncTodoItem(t, userId).catch(console.error); }
      },
      convertTodoToTask: (todoId) => {
        const todo = get().todoItems.find(t => t.id === todoId);
        if (!todo) return '';
        const { companies } = get();
        const newId = get().addTask({
          companyId: companies[0]?.id ?? '',
          subClientId: '',
          taskType: 'outro',
          customType: todo.text,
          sequence: 0,
          date: todo.date,
          status: todo.status === 'done' ? 'done' : todo.status === 'doing' ? 'doing' : 'todo',
          priority: todo.priority,
          allDay: true,
          createdAt: new Date().toISOString(),
        });
        get().archiveTodoItem(todoId);
        return newId;
      },

      addCalendarEvent: (e) => {
        const full: CalendarEvent = { ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set(state => ({ calendarEvents: [...state.calendarEvents, full] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncCalendarEvent(full, userId).catch(console.error);
      },
      updateCalendarEvent: (id, updates) => {
        set(state => ({ calendarEvents: state.calendarEvents.map(e => e.id === id ? { ...e, ...updates } : e) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const ev = get().calendarEvents.find(x => x.id === id); if (ev) syncCalendarEvent(ev, userId).catch(console.error); }
      },
      deleteCalendarEvent: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set(state => ({ calendarEvents: state.calendarEvents.filter(e => e.id !== id) }));
        if (userId) removeCalendarEvent(id, userId).catch(console.error);
      },
      setCalendarCategoryFilter: (f) => set({ calendarCategoryFilter: f }),

      addTaskTemplate: (t) => {
        const id = crypto.randomUUID();
        const full: TaskTemplate = { ...t, id, createdAt: new Date().toISOString() };
        set(state => ({ taskTemplates: [full, ...state.taskTemplates] }));
        return id;
      },
      updateTaskTemplate: (id, updates) => {
        set(state => ({
          taskTemplates: state.taskTemplates.map(tpl =>
            tpl.id === id ? { ...tpl, ...updates } : tpl,
          ),
        }));
      },
      deleteTaskTemplate: (id) => {
        set(state => ({ taskTemplates: state.taskTemplates.filter(tpl => tpl.id !== id) }));
      },

      nextSequence: (companyId, subClientId, taskType) => {
        const { tasks } = get();
        const count = tasks.filter(
          (t) => t.companyId === companyId && t.subClientId === subClientId && t.taskType === taskType
        ).length;
        return count + 1;
      },
    }),
    {
      name: 'evo-tasks-storage',
      partialize: (state) => ({
        companies: state.companies,
        subClients: state.subClients,
        tasks: state.tasks,
        leads: state.leads,
        selectedCompanies: state.selectedCompanies,
        viewMode: state.viewMode,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        kanbanOrder: state.kanbanOrder,
        pin: state.pin,
        quickNotes: state.quickNotes,
        todoItems: state.todoItems,
        calendarEvents: state.calendarEvents,
        calendarCategoryFilter: state.calendarCategoryFilter,
        taskTemplates: state.taskTemplates,
        compactMode: state.compactMode,
        sidebarWidth: state.sidebarWidth,
        homeLayout: state.homeLayout,
        homeGridLayouts: state.homeGridLayouts,
        pomodoroSessions: state.pomodoroSessions,
        pomodoroGoal: state.pomodoroGoal,
        lastSyncAt: state.lastSyncAt,
        animationsEnabled: state.animationsEnabled,
        userName: state.userName,
        userPhoto: state.userPhoto,
        accentColor: state.accentColor,
      }),
    }
  )
);
