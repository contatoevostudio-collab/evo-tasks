import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** duração em ms; 0 = não auto-fecha */
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  show(t: Omit<Toast, 'id'>): string;
  dismiss(id: string): void;
  clear(): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (t) => {
    const id = uid();
    const full: Toast = { duration: 4000, ...t, id };
    set((s) => ({ toasts: [...s.toasts, full] }));
    if (full.duration && full.duration > 0) {
      setTimeout(() => get().dismiss(id), full.duration);
    }
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

/**
 * Helper imperativo pra disparar toasts de qualquer lugar:
 *   import { toast } from '../store/toasts';
 *   toast.success('Salvo');
 *   toast.error('Falha ao sincronizar', { description: '...' });
 */
export const toast = {
  success: (title: string, opts?: Partial<Toast>) =>
    useToastStore.getState().show({ kind: 'success', title, ...opts }),
  error: (title: string, opts?: Partial<Toast>) =>
    useToastStore.getState().show({ kind: 'error', title, duration: 6000, ...opts }),
  info: (title: string, opts?: Partial<Toast>) =>
    useToastStore.getState().show({ kind: 'info', title, ...opts }),
  warning: (title: string, opts?: Partial<Toast>) =>
    useToastStore.getState().show({ kind: 'warning', title, ...opts }),
};
