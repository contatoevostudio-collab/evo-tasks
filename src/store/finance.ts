import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction, FinancialGoal, RecurringBill } from '../types';
import { useAuthStore } from './auth';
import { syncTransaction, removeTransaction, syncFinancialGoal, removeFinancialGoal, syncRecurringBill, removeRecurringBill } from '../lib/supabaseSync';

interface FinanceStore {
  transactions: Transaction[];
  goals: FinancialGoal[];
  recurringBills: RecurringBill[];
  monthlyBudget: number;

  addTransaction(t: Omit<Transaction, 'id' | 'createdAt'>): void;
  updateTransaction(id: string, updates: Partial<Transaction>): void;
  deleteTransaction(id: string): void;

  addGoal(g: Omit<FinancialGoal, 'id' | 'createdAt'>): void;
  updateGoal(id: string, updates: Partial<FinancialGoal>): void;
  deleteGoal(id: string): void;
  addToGoal(id: string, amount: number): void;

  addRecurringBill(b: Omit<RecurringBill, 'id' | 'createdAt' | 'paidMonths'>): void;
  updateRecurringBill(id: string, updates: Partial<RecurringBill>): void;
  deleteRecurringBill(id: string): void;
  toggleRecurringPaid(id: string, monthKey: string): void;

  setMonthlyBudget(amount: number): void;
  replaceAll(data: { transactions: Transaction[]; goals: FinancialGoal[]; recurringBills: RecurringBill[] }): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      goals: [],
      recurringBills: [],
      monthlyBudget: 0,

      addTransaction: (t) => {
        const full: Transaction = { ...t, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ transactions: [full, ...s.transactions] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncTransaction(full, userId).catch(console.error);
      },

      updateTransaction: (id, updates) => {
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const t = get().transactions.find(x => x.id === id); if (t) syncTransaction(t, userId).catch(console.error); }
      },

      deleteTransaction: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        if (userId) removeTransaction(id, userId).catch(console.error);
      },

      addGoal: (g) => {
        const full: FinancialGoal = { ...g, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ goals: [...s.goals, full] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncFinancialGoal(full, userId).catch(console.error);
      },

      updateGoal: (id, updates) => {
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const g = get().goals.find(x => x.id === id); if (g) syncFinancialGoal(g, userId).catch(console.error); }
      },

      deleteGoal: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        if (userId) removeFinancialGoal(id, userId).catch(console.error);
      },

      addToGoal: (id, amount) => {
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, current: Math.min(g.current + amount, g.target) } : g,
          ),
        }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const g = get().goals.find(x => x.id === id); if (g) syncFinancialGoal(g, userId).catch(console.error); }
      },

      addRecurringBill: (b) => {
        const full: RecurringBill = { ...b, id: uid(), paidMonths: [], createdAt: new Date().toISOString() };
        set((s) => ({ recurringBills: [...s.recurringBills, full] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncRecurringBill(full, userId).catch(console.error);
      },

      updateRecurringBill: (id, updates) => {
        set((s) => ({
          recurringBills: s.recurringBills.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const b = get().recurringBills.find(x => x.id === id); if (b) syncRecurringBill(b, userId).catch(console.error); }
      },

      deleteRecurringBill: (id) => {
        const userId = useAuthStore.getState().user?.id;
        set((s) => ({ recurringBills: s.recurringBills.filter((b) => b.id !== id) }));
        if (userId) removeRecurringBill(id, userId).catch(console.error);
      },

      toggleRecurringPaid: (id, monthKey) => {
        set((s) => ({
          recurringBills: s.recurringBills.map((b) => {
            if (b.id !== id) return b;
            const paid = b.paidMonths.includes(monthKey);
            return {
              ...b,
              paidMonths: paid
                ? b.paidMonths.filter((m) => m !== monthKey)
                : [...b.paidMonths, monthKey],
            };
          }),
        }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) { const b = get().recurringBills.find(x => x.id === id); if (b) syncRecurringBill(b, userId).catch(console.error); }
      },

      setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),

      replaceAll: ({ transactions, goals, recurringBills }) =>
        set({ transactions, goals, recurringBills }),
    }),
    { name: 'evo-finance-store' },
  ),
);
