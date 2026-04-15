import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Company, SubClient, Lead, LeadStage, TaskStatus, TaskType, ViewMode, Priority, Theme } from '../types';
import { format } from 'date-fns';
import { syncTask, removeTask, syncCompany, removeCompany, syncSubClient, removeSubClient } from '../lib/supabaseSync';

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
  sidebarCollapsed: boolean;        // #5
  theme: Theme;                     // #60
  kanbanOrder: Record<TaskStatus, string[]>;
  pin: string | null;

  // Task CRUD
  addTask(t: Omit<Task, 'id'>): string;
  updateTask(id: string, updates: Partial<Task>): void;
  deleteTask(id: string): void;
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
  deleteCompany(id: string): void;
  moveCompanyUp(id: string): void;    // #55
  moveCompanyDown(id: string): void;  // #55

  // SubClient CRUD
  addSubClient(s: Omit<SubClient, 'id'>): void;
  updateSubClient(id: string, updates: Partial<SubClient>): void;
  deleteSubClient(id: string): void;
  updateSubClientNotes(id: string, notes: string): void;
  updateSubClientTips(id: string, tips: string[]): void;

  // Lead CRM CRUD
  addLead(l: Omit<Lead, 'id' | 'createdAt'>): string;
  updateLead(id: string, updates: Partial<Lead>): void;
  deleteLead(id: string): void;
  moveLead(id: string, stage: LeadStage): void;
  convertLead(id: string, companyName: string, color: string): void;

  setKanbanOrder(status: TaskStatus, ids: string[]): void;
  setPin(p: string | null): void;

  // Auth / sync
  userId: string | null;
  setUserId(id: string | null): void;
  replaceAll(data: { companies: Company[]; subClients: SubClient[]; tasks: Task[] }): void;

  // Toast / undo
  toast: { text: string; undoFn?: () => void } | null;
  showToast(text: string, undoFn?: () => void): void;
  hideToast(): void;

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
  clearAllFilters(): void;       // #51
  toggleSidebar(): void;         // #5
  setTheme(t: Theme): void;      // #60

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
      viewMode: 'month',
      currentDate: new Date(),
      selectedCompanies: DEFAULT_COMPANIES.map((c) => c.id),
      hideDone: false,
      filterPriority: null,
      filterSubClient: null,
      filterTaskType: null,
      sidebarCollapsed: false,
      theme: 'dark-blue',
      kanbanOrder: { todo: [], doing: [], done: [] },
      pin: null,
      toast: null,
      userId: null,

      addTask: (task) => {
        const id = crypto.randomUUID();
        const full = { ...task, id, createdAt: task.createdAt ?? new Date().toISOString() };
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
        const userId = get().userId;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        if (userId) removeTask(id, userId).catch(console.error);
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

      addSubTask: (taskId, label) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const st = t.subtasks ?? [];
            return { ...t, subtasks: [...st, { id: crypto.randomUUID(), label, done: false }] };
          }),
        })),

      toggleSubTask: (taskId, subId) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              subtasks: (t.subtasks ?? []).map((s) => s.id === subId ? { ...s, done: !s.done } : s),
            };
          }),
        })),

      deleteSubTask: (taskId, subId) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            return { ...t, subtasks: (t.subtasks ?? []).filter((s) => s.id !== subId) };
          }),
        })),

      addCompany: (company) => {
        const full = { ...company, id: crypto.randomUUID() };
        set((state) => ({ companies: [...state.companies, full] }));
        const userId = get().userId;
        if (userId) syncCompany(full, userId).catch(console.error);
      },

      updateCompany: (id, updates) => {
        set((state) => ({ companies: state.companies.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
        const { userId, companies } = get();
        if (userId) { const c = companies.find(x => x.id === id); if (c) syncCompany(c, userId).catch(console.error); }
      },

      deleteCompany: (id) => {
        const userId = get().userId;
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          subClients: state.subClients.filter((s) => s.companyId !== id),
          tasks: state.tasks.filter((t) => t.companyId !== id),
          selectedCompanies: state.selectedCompanies.filter((cid) => cid !== id),
        }));
        if (userId) removeCompany(id, userId).catch(console.error);
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
        const userId = get().userId;
        set((state) => ({
          subClients: state.subClients.filter((s) => s.id !== id),
          tasks: state.tasks.filter((t) => t.subClientId !== id),
        }));
        if (userId) removeSubClient(id, userId).catch(console.error);
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

      addLead: (lead) => {
        const id = crypto.randomUUID();
        const full: Lead = { ...lead, id, createdAt: new Date().toISOString() };
        set((state) => ({ leads: [...state.leads, full] }));
        return id;
      },

      updateLead: (id, updates) =>
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),

      deleteLead: (id) =>
        set((state) => ({ leads: state.leads.filter((l) => l.id !== id) })),

      moveLead: (id, stage) =>
        set((state) => ({ leads: state.leads.map((l) => (l.id === id ? { ...l, stage } : l)) })),

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
        if (userId) syncCompany(company, userId).catch(console.error);
      },

      setKanbanOrder: (status, ids) =>
        set(s => ({ kanbanOrder: { ...s.kanbanOrder, [status]: ids } })),

      setPin: (pin) => set({ pin }),

      setUserId: (userId) => set({ userId }),

      replaceAll: ({ companies, subClients, tasks }) =>
        set((state) => ({
          companies,
          subClients,
          tasks,
          selectedCompanies: companies.map(c => c.id),
          kanbanOrder: { todo: [], doing: [], done: [] },
          // preserve UI state
          viewMode: state.viewMode,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        })),

      showToast: (text, undoFn) => set({ toast: { text, undoFn } }),
      hideToast: () => set({ toast: null }),

      setViewMode: (viewMode) => set({ viewMode }),
      setCurrentDate: (currentDate) => set({ currentDate }),

      toggleCompany: (id) =>
        set((state) => ({
          selectedCompanies: state.selectedCompanies.includes(id)
            ? state.selectedCompanies.filter((c) => c !== id)
            : [...state.selectedCompanies, id],
        })),

      selectAllCompanies: () =>
        set((state) => ({ selectedCompanies: state.companies.map(c => c.id) })),

      deselectAllCompanies: () =>
        set({ selectedCompanies: [] }),

      toggleHideDone: () => set((s) => ({ hideDone: !s.hideDone })),

      setFilterPriority: (p) =>
        set((s) => ({ filterPriority: s.filterPriority === p ? null : p })),

      setFilterSubClient: (id) =>
        set((s) => ({ filterSubClient: s.filterSubClient === id ? null : id })),

      setFilterTaskType: (t) =>
        set((s) => ({ filterTaskType: s.filterTaskType === t ? null : t })),

      clearAllFilters: () =>
        set({ filterPriority: null, filterSubClient: null, filterTaskType: null, hideDone: false }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),

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
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        kanbanOrder: state.kanbanOrder,
        pin: state.pin,
      }),
    }
  )
);
