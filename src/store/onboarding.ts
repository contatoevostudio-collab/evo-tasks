import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingTemplate, OnboardingStep } from '../types';
import { useAuthStore } from './auth';
import { syncOnboardingTemplate, removeOnboardingTemplate } from '../lib/supabaseSync';

interface OnboardingStore {
  templates: OnboardingTemplate[];
  addTemplate(p: Omit<OnboardingTemplate, 'id' | 'createdAt'>): string;
  updateTemplate(id: string, updates: Partial<OnboardingTemplate>): void;
  deleteTemplate(id: string): void;
  addStep(templateId: string, step: Omit<OnboardingStep, 'id'>): void;
  removeStep(templateId: string, stepId: string): void;
  updateStep(templateId: string, stepId: string, updates: Partial<OnboardingStep>): void;
  replaceAll(items: OnboardingTemplate[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => OnboardingStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const t = get().templates.find(x => x.id === id);
  if (t) syncOnboardingTemplate(t, userId).catch(console.error);
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (p) => {
        const id = uid();
        const full: OnboardingTemplate = {
          ...p,
          id,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ templates: [full, ...s.templates] }));
        syncOne(id, get);
        return id;
      },
      updateTemplate: (id, updates) => {
        set(s => ({ templates: s.templates.map(t => t.id === id ? { ...t, ...updates } : t) }));
        syncOne(id, get);
      },
      deleteTemplate: (id) => {
        set(s => ({ templates: s.templates.filter(t => t.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeOnboardingTemplate(id, userId).catch(console.error);
      },
      addStep: (templateId, step) => {
        set(s => ({
          templates: s.templates.map(t => t.id === templateId
            ? { ...t, steps: [...t.steps, { id: uid(), ...step }] } : t),
        }));
        syncOne(templateId, get);
      },
      removeStep: (templateId, stepId) => {
        set(s => ({
          templates: s.templates.map(t => t.id === templateId
            ? { ...t, steps: t.steps.filter(st => st.id !== stepId) } : t),
        }));
        syncOne(templateId, get);
      },
      updateStep: (templateId, stepId, updates) => {
        set(s => ({
          templates: s.templates.map(t => t.id === templateId
            ? { ...t, steps: t.steps.map(st => st.id === stepId ? { ...st, ...updates } : st) } : t),
        }));
        syncOne(templateId, get);
      },
      replaceAll: (items) => set({ templates: items }),
    }),
    { name: 'evo-onboarding' },
  ),
);
