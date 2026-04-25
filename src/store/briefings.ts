import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Briefing, BriefingQuestion, BriefingStatus } from '../types';
import { useAuthStore } from './auth';
import { syncBriefing, removeBriefing } from '../lib/supabaseSync';

interface BriefingsStore {
  briefings: Briefing[];
  addBriefing(p: Omit<Briefing, 'id' | 'createdAt' | 'shareToken'>): string;
  updateBriefing(id: string, updates: Partial<Briefing>): void;
  deleteBriefing(id: string): void;
  permanentDelete(id: string): void;
  restoreBriefing(id: string): void;
  addQuestion(briefingId: string, q: Omit<BriefingQuestion, 'id'>): void;
  removeQuestion(briefingId: string, qId: string): void;
  updateQuestion(briefingId: string, qId: string, updates: Partial<BriefingQuestion>): void;
  setStatus(id: string, status: BriefingStatus): void;
  markResponded(id: string): void;
  replaceAll(items: Briefing[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => BriefingsStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const b = get().briefings.find(x => x.id === id);
  if (b) syncBriefing(b, userId).catch(console.error);
};

const DEFAULT_QUESTIONS: Omit<BriefingQuestion, 'id'>[] = [
  { label: 'Sobre a empresa', type: 'long', required: true },
  { label: 'Público-alvo', type: 'long', required: true },
  { label: 'Concorrentes', type: 'long' },
  { label: 'Objetivos do projeto', type: 'long', required: true },
  { label: 'Prazo desejado', type: 'text' },
  { label: 'Investimento previsto', type: 'text' },
  { label: 'Referências (URLs, prints)', type: 'long' },
];

export const useBriefingsStore = create<BriefingsStore>()(
  persist(
    (set, get) => ({
      briefings: [],

      addBriefing: (p) => {
        const id = uid();
        const questions = (p.questions && p.questions.length > 0)
          ? p.questions
          : DEFAULT_QUESTIONS.map(q => ({ id: uid(), ...q }));
        const full: Briefing = {
          ...p,
          id,
          shareToken: token(),
          questions,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ briefings: [full, ...s.briefings] }));
        syncOne(id, get);
        return id;
      },
      updateBriefing: (id, updates) => {
        set(s => ({ briefings: s.briefings.map(b => b.id === id ? { ...b, ...updates } : b) }));
        syncOne(id, get);
      },
      deleteBriefing: (id) => {
        set(s => ({ briefings: s.briefings.map(b => b.id === id ? { ...b, deletedAt: new Date().toISOString() } : b) }));
        syncOne(id, get);
      },
      permanentDelete: (id) => {
        set(s => ({ briefings: s.briefings.filter(b => b.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeBriefing(id, userId).catch(console.error);
      },
      restoreBriefing: (id) => {
        set(s => ({ briefings: s.briefings.map(b => b.id === id ? { ...b, deletedAt: undefined } : b) }));
        syncOne(id, get);
      },
      addQuestion: (briefingId, q) => {
        set(s => ({
          briefings: s.briefings.map(b => b.id === briefingId
            ? { ...b, questions: [...b.questions, { id: uid(), ...q }] } : b),
        }));
        syncOne(briefingId, get);
      },
      removeQuestion: (briefingId, qId) => {
        set(s => ({
          briefings: s.briefings.map(b => b.id === briefingId
            ? { ...b, questions: b.questions.filter(q => q.id !== qId) } : b),
        }));
        syncOne(briefingId, get);
      },
      updateQuestion: (briefingId, qId, updates) => {
        set(s => ({
          briefings: s.briefings.map(b => b.id === briefingId
            ? { ...b, questions: b.questions.map(q => q.id === qId ? { ...q, ...updates } : q) } : b),
        }));
        syncOne(briefingId, get);
      },
      setStatus: (id, status) => {
        set(s => ({ briefings: s.briefings.map(b => b.id === id ? { ...b, status } : b) }));
        syncOne(id, get);
      },
      markResponded: (id) => {
        const now = new Date().toISOString();
        set(s => ({ briefings: s.briefings.map(b => b.id === id ? { ...b, status: 'respondido' as BriefingStatus, respondedAt: now } : b) }));
        syncOne(id, get);
      },
      replaceAll: (items) => set({ briefings: items }),
    }),
    { name: 'evo-briefings' },
  ),
);
