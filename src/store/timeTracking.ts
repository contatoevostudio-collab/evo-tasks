import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimeEntry, ActiveTimer } from '../types';

interface TimeTrackingStore {
  entries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  startTimer(opts?: Partial<Omit<ActiveTimer, 'startedAt'>>): void;
  stopTimer(): void;
  addEntry(e: Omit<TimeEntry, 'id' | 'createdAt'>): void;
  deleteEntry(id: string): void;
  replaceAll(items: TimeEntry[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useTimeTrackingStore = create<TimeTrackingStore>()(
  persist(
    (set, get) => ({
      entries: [],
      activeTimer: null,

      startTimer: (opts = {}) => {
        set({ activeTimer: { ...opts, startedAt: new Date().toISOString() } });
      },

      stopTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer) return;
        const endedAt = new Date().toISOString();
        const duration = Math.round(
          (new Date(endedAt).getTime() - new Date(activeTimer.startedAt).getTime()) / 1000
        );
        if (duration < 5) { set({ activeTimer: null }); return; }
        const entry: TimeEntry = {
          id: uid(),
          workspaceId: activeTimer.workspaceId,
          taskId: activeTimer.taskId,
          companyId: activeTimer.companyId,
          description: activeTimer.description,
          startedAt: activeTimer.startedAt,
          endedAt,
          duration,
          source: 'manual',
          createdAt: new Date().toISOString(),
        };
        set(s => ({ entries: [entry, ...s.entries], activeTimer: null }));
      },

      addEntry: (e) => {
        const entry: TimeEntry = { ...e, id: uid(), createdAt: new Date().toISOString() };
        set(s => ({ entries: [entry, ...s.entries] }));
      },

      deleteEntry: (id) => {
        set(s => ({
          entries: s.entries.map(e => e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e),
        }));
      },

      replaceAll: (items) => set({ entries: items }),
    }),
    { name: 'evo-timetracking' }
  )
);
