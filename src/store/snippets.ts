import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Snippet } from '../types';
import { useAuthStore } from './auth';
import { syncSnippet, removeSnippet } from '../lib/supabaseSync';

interface SnippetsStore {
  snippets: Snippet[];
  addSnippet(p: Omit<Snippet, 'id' | 'createdAt' | 'useCount'>): string;
  updateSnippet(id: string, updates: Partial<Snippet>): void;
  deleteSnippet(id: string): void;
  incrementUse(id: string): void;
  replaceAll(items: Snippet[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => SnippetsStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const s = get().snippets.find(x => x.id === id);
  if (s) syncSnippet(s, userId).catch(console.error);
};

export const useSnippetsStore = create<SnippetsStore>()(
  persist(
    (set, get) => ({
      snippets: [],

      addSnippet: (p) => {
        const id = uid();
        const full: Snippet = {
          ...p,
          id,
          useCount: 0,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ snippets: [full, ...s.snippets] }));
        syncOne(id, get);
        return id;
      },
      updateSnippet: (id, updates) => {
        set(s => ({ snippets: s.snippets.map(sn => sn.id === id ? { ...sn, ...updates } : sn) }));
        syncOne(id, get);
      },
      deleteSnippet: (id) => {
        set(s => ({ snippets: s.snippets.filter(sn => sn.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeSnippet(id, userId).catch(console.error);
      },
      incrementUse: (id) => {
        set(s => ({ snippets: s.snippets.map(sn => sn.id === id ? { ...sn, useCount: (sn.useCount ?? 0) + 1 } : sn) }));
        syncOne(id, get);
      },
      replaceAll: (items) => set({ snippets: items }),
    }),
    { name: 'evo-snippets' },
  ),
);

/** Resolve {variavel} placeholders. Variáveis comuns: nome_cliente, etc. */
export function fillSnippet(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => vars[key] ?? m);
}
