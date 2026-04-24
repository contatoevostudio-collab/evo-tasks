import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Idea, IdeaTag, IdeaStatus } from '../types';
import { useAuthStore } from './auth';
import { syncIdea, removeIdea } from '../lib/supabaseSync';

interface IdeasStore {
  ideas: Idea[];
  addIdea(i: Omit<Idea, 'id' | 'createdAt'>): string;
  updateIdea(id: string, updates: Partial<Idea>): void;
  deleteIdea(id: string): void;            // soft-delete (sets deletedAt)
  permanentDelete(id: string): void;       // hard delete
  restoreIdea(id: string): void;           // un-set deletedAt
  togglePin(id: string): void;
  setStatus(id: string, status: IdeaStatus): void;
  addSubtask(id: string, label: string): void;
  toggleSubtask(id: string, subId: string): void;
  deleteSubtask(id: string, subId: string): void;
  reorderPinned(orderedIds: string[]): void;
  replaceAll(ideas: Idea[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => IdeasStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const idea = get().ideas.find((x) => x.id === id);
  if (idea) syncIdea(idea, userId).catch(console.error);
};

export const useIdeasStore = create<IdeasStore>()(
  persist(
    (set, get) => ({
      ideas: [],
      addIdea: (i) => {
        const now = new Date().toISOString();
        const full: Idea = {
          status: 'rascunho',
          ...i,
          id: uid(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ ideas: [full, ...s.ideas] }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncIdea(full, userId).catch(console.error);
        return full.id;
      },
      updateIdea: (id, updates) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
          ),
        }));
        syncOne(id, get);
      },
      deleteIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? { ...i, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : i
          ),
        }));
        syncOne(id, get);
      },
      permanentDelete: (id) => {
        set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeIdea(id, userId).catch(console.error);
      },
      restoreIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? { ...i, deletedAt: undefined, updatedAt: new Date().toISOString() }
              : i
          ),
        }));
        syncOne(id, get);
      },
      togglePin: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? { ...i, pinned: !i.pinned, updatedAt: new Date().toISOString() }
              : i
          ),
        }));
        syncOne(id, get);
      },
      setStatus: (id, status) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i
          ),
        }));
        syncOne(id, get);
      },
      addSubtask: (id, label) => {
        const lbl = label.trim();
        if (!lbl) return;
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? {
                  ...i,
                  subtasks: [...(i.subtasks ?? []), { id: uid(), label: lbl, done: false }],
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        }));
        syncOne(id, get);
      },
      toggleSubtask: (id, subId) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? {
                  ...i,
                  subtasks: (i.subtasks ?? []).map((st) =>
                    st.id === subId ? { ...st, done: !st.done } : st
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        }));
        syncOne(id, get);
      },
      deleteSubtask: (id, subId) => {
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? {
                  ...i,
                  subtasks: (i.subtasks ?? []).filter((st) => st.id !== subId),
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        }));
        syncOne(id, get);
      },
      reorderPinned: (orderedIds) => {
        set((s) => {
          const orderMap = new Map<string, number>();
          orderedIds.forEach((id, idx) => orderMap.set(id, idx));
          return {
            ideas: s.ideas.map((i) =>
              orderMap.has(i.id)
                ? { ...i, pinOrder: orderMap.get(i.id)!, updatedAt: new Date().toISOString() }
                : i
            ),
          };
        });
        // sync each
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          orderedIds.forEach((id) => {
            const idea = get().ideas.find((x) => x.id === id);
            if (idea) syncIdea(idea, userId).catch(console.error);
          });
        }
      },
      replaceAll: (ideas) => set({ ideas }),
    }),
    { name: 'evo-ideas-store' }
  )
);

export const TAG_CONFIG: Record<IdeaTag, { label: string; color: string }> = {
  negocio:   { label: 'Negócio',   color: '#ff9f0a' },
  pessoal:   { label: 'Pessoal',   color: '#356BFF' },
  design:    { label: 'Design',    color: '#64C4FF' },
  marketing: { label: 'Marketing', color: '#bf5af2' },
  dev:       { label: 'Dev',       color: '#30d158' },
  outro:     { label: 'Outro',     color: '#636366' },
};

export const STATUS_CONFIG: Record<IdeaStatus, { label: string; color: string; rgb: string }> = {
  rascunho:      { label: 'Rascunho',      color: '#636366', rgb: '99,99,102' },
  desenvolvendo: { label: 'Desenvolvendo', color: '#356BFF', rgb: '53,107,255' },
  executada:     { label: 'Executada',     color: '#30d158', rgb: '48,209,88' },
  arquivada:     { label: 'Arquivada',     color: '#ff9f0a', rgb: '255,159,10' },
};
