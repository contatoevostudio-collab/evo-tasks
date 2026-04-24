import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card } from '../types';

interface CardsStore {
  cards: Card[];
  addCard(c: Omit<Card, 'id' | 'createdAt'>): void;
  updateCard(id: string, updates: Partial<Card>): void;
  deleteCard(id: string): void;
  reorderCards(ids: string[]): void;
  replaceAll(cards: Card[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useCardsStore = create<CardsStore>()(
  persist(
    (set) => ({
      cards: [],

      addCard: (c) => {
        const full: Card = { ...c, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ cards: [full, ...s.cards] }));
      },

      updateCard: (id, updates) => {
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      deleteCard: (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
      },

      reorderCards: (ids) => {
        set((s) => {
          const map = new Map(s.cards.map((c) => [c.id, c]));
          const next = ids.map((id) => map.get(id)).filter(Boolean) as Card[];
          return { cards: next };
        });
      },

      replaceAll: (cards) => set({ cards }),
    }),
    { name: 'evo-cards-store' },
  ),
);
