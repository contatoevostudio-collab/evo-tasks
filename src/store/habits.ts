import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit, HabitFrequency } from '../types';
import { format } from 'date-fns';
import { useAuthStore } from './auth';
import { syncHabit, removeHabit } from '../lib/supabaseSync';

interface HabitsStore {
  habits: Habit[];
  addHabit(p: Omit<Habit, 'id' | 'createdAt' | 'completions'>): string;
  updateHabit(id: string, updates: Partial<Habit>): void;
  deleteHabit(id: string): void;
  toggleCompletion(habitId: string, date: string): void;
  archiveHabit(id: string, archived?: boolean): void;
  replaceAll(items: Habit[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => HabitsStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const h = get().habits.find(x => x.id === id);
  if (h) syncHabit(h, userId).catch(console.error);
};

export const useHabitsStore = create<HabitsStore>()(
  persist(
    (set, get) => ({
      habits: [],

      addHabit: (p) => {
        const id = uid();
        const full: Habit = {
          ...p,
          id,
          completions: [],
          createdAt: new Date().toISOString(),
        };
        set(s => ({ habits: [full, ...s.habits] }));
        syncOne(id, get);
        return id;
      },
      updateHabit: (id, updates) => {
        set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, ...updates } : h) }));
        syncOne(id, get);
      },
      deleteHabit: (id) => {
        set(s => ({ habits: s.habits.filter(h => h.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeHabit(id, userId).catch(console.error);
      },
      toggleCompletion: (habitId, date) => {
        set(s => ({
          habits: s.habits.map(h => {
            if (h.id !== habitId) return h;
            const existing = h.completions.find(c => c.date === date);
            const completions = existing
              ? h.completions.filter(c => c.date !== date)
              : [...h.completions, { date, completed: true }];
            return { ...h, completions };
          }),
        }));
        syncOne(habitId, get);
      },
      archiveHabit: (id, archived = true) => {
        set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, archived } : h) }));
        syncOne(id, get);
      },
      replaceAll: (items) => set({ habits: items }),
    }),
    { name: 'evo-habits' },
  ),
);

/** True se o hábito é "esperado" hoje (frequency match). */
export function isHabitDueToday(h: Habit, date = new Date()): boolean {
  if (h.archived) return false;
  if (h.frequency === 'daily') return true;
  if (h.frequency === 'weekly') {
    const wd = date.getDay();
    return (h.weekdays ?? []).includes(wd);
  }
  if (h.frequency === 'monthly') {
    return date.getDate() === h.monthlyDay;
  }
  return false;
}

export function isHabitDoneOn(h: Habit, dateStr: string): boolean {
  return h.completions.some(c => c.date === dateStr && c.completed);
}

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export const FREQUENCY_LABEL: Record<HabitFrequency, string> = {
  daily:   'Todo dia',
  weekly:  'Semanal',
  monthly: 'Mensal',
};

export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
