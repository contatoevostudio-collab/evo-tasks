import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import { useAuthStore } from './auth';
import { syncInvoice, removeInvoice } from '../lib/supabaseSync';

interface InvoicesStore {
  invoices: Invoice[];
  addInvoice(p: Omit<Invoice, 'id' | 'createdAt' | 'number' | 'subtotal' | 'total'>): string;
  updateInvoice(id: string, updates: Partial<Invoice>): void;
  deleteInvoice(id: string): void;
  permanentDelete(id: string): void;
  restoreInvoice(id: string): void;
  addItem(invId: string, item: Omit<InvoiceItem, 'id'>): void;
  removeItem(invId: string, itemId: string): void;
  setStatus(id: string, status: InvoiceStatus): void;
  markPaid(id: string): void;
  replaceAll(items: Invoice[]): void;
  nextNumber(): number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const recomputeTotals = (items: InvoiceItem[], taxes = 0) => {
  const subtotal = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  return { subtotal, total: subtotal + taxes };
};

const syncOne = (id: string, get: () => InvoicesStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const inv = get().invoices.find(x => x.id === id);
  if (inv) syncInvoice(inv, userId).catch(console.error);
};

export const useInvoicesStore = create<InvoicesStore>()(
  persist(
    (set, get) => ({
      invoices: [],

      nextNumber: () => {
        const max = get().invoices.reduce((m, i) => Math.max(m, i.number), 0);
        return max + 1;
      },

      addInvoice: (p) => {
        const id = uid();
        const items = p.items ?? [];
        const totals = recomputeTotals(items, p.taxes);
        const full: Invoice = {
          ...p,
          id,
          number: get().nextNumber(),
          ...totals,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ invoices: [full, ...s.invoices] }));
        syncOne(id, get);
        return id;
      },
      updateInvoice: (id, updates) => {
        set(s => ({
          invoices: s.invoices.map(inv => {
            if (inv.id !== id) return inv;
            const merged = { ...inv, ...updates };
            if ('items' in updates || 'taxes' in updates) {
              const t = recomputeTotals(merged.items, merged.taxes);
              return { ...merged, ...t };
            }
            return merged;
          }),
        }));
        syncOne(id, get);
      },
      deleteInvoice: (id) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, deletedAt: new Date().toISOString() } : i) }));
        syncOne(id, get);
      },
      permanentDelete: (id) => {
        set(s => ({ invoices: s.invoices.filter(i => i.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeInvoice(id, userId).catch(console.error);
      },
      restoreInvoice: (id) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, deletedAt: undefined } : i) }));
        syncOne(id, get);
      },
      addItem: (invId, item) => {
        set(s => ({
          invoices: s.invoices.map(inv => {
            if (inv.id !== invId) return inv;
            const items = [...inv.items, { id: uid(), ...item }];
            return { ...inv, items, ...recomputeTotals(items, inv.taxes) };
          }),
        }));
        syncOne(invId, get);
      },
      removeItem: (invId, itemId) => {
        set(s => ({
          invoices: s.invoices.map(inv => {
            if (inv.id !== invId) return inv;
            const items = inv.items.filter(it => it.id !== itemId);
            return { ...inv, items, ...recomputeTotals(items, inv.taxes) };
          }),
        }));
        syncOne(invId, get);
      },
      setStatus: (id, status) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, status } : i) }));
        syncOne(id, get);
      },
      markPaid: (id) => {
        const now = new Date().toISOString();
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, status: 'paga' as InvoiceStatus, paidAt: now } : i) }));
        syncOne(id, get);
      },
      replaceAll: (items) => set({ invoices: items }),
    }),
    { name: 'evo-invoices' },
  ),
);

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  rascunho:  { label: 'Rascunho',  color: '#636366' },
  enviada:   { label: 'Enviada',   color: '#356BFF' },
  paga:      { label: 'Paga',      color: '#30d158' },
  cancelada: { label: 'Cancelada', color: '#ff453a' },
};
