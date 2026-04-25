import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ContentApproval, ContentAsset, ContentComment, ApprovalStatus } from '../types';
import { useAuthStore } from './auth';
import { syncContentApproval, removeContentApproval } from '../lib/supabaseSync';

interface ContentApprovalsStore {
  approvals: ContentApproval[];
  addApproval(p: Omit<ContentApproval, 'id' | 'createdAt' | 'shareToken'>): string;
  updateApproval(id: string, updates: Partial<ContentApproval>): void;
  deleteApproval(id: string): void;       // soft
  permanentDelete(id: string): void;
  restoreApproval(id: string): void;
  addAsset(approvalId: string, asset: Omit<ContentAsset, 'id' | 'position'>): void;
  removeAsset(approvalId: string, assetId: string): void;
  addComment(approvalId: string, assetId: string, c: Omit<ContentComment, 'id' | 'createdAt'>): void;
  resolveComment(approvalId: string, assetId: string, commentId: string): void;
  markSent(id: string): void;
  markViewed(id: string): void;
  requestChanges(id: string, feedback: string): void;
  approve(id: string): void;
  markPosted(id: string): void;
  replaceAll(items: ContentApproval[]): void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

const syncOne = (id: string, get: () => ContentApprovalsStore) => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const a = get().approvals.find(x => x.id === id);
  if (a) syncContentApproval(a, userId).catch(console.error);
};

export const useContentApprovalsStore = create<ContentApprovalsStore>()(
  persist(
    (set, get) => ({
      approvals: [],

      addApproval: (p) => {
        const id = uid();
        const now = new Date().toISOString();
        const full: ContentApproval = {
          ...p,
          id,
          shareToken: token(),
          createdAt: now,
        };
        set(s => ({ approvals: [full, ...s.approvals] }));
        syncOne(id, get);
        return id;
      },
      updateApproval: (id, updates) => {
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, ...updates } : a) }));
        syncOne(id, get);
      },
      deleteApproval: (id) => {
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, deletedAt: new Date().toISOString() } : a) }));
        syncOne(id, get);
      },
      permanentDelete: (id) => {
        set(s => ({ approvals: s.approvals.filter(a => a.id !== id) }));
        const userId = useAuthStore.getState().user?.id;
        if (userId) removeContentApproval(id, userId).catch(console.error);
      },
      restoreApproval: (id) => {
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, deletedAt: undefined } : a) }));
        syncOne(id, get);
      },
      addAsset: (approvalId, asset) => {
        set(s => ({
          approvals: s.approvals.map(a => {
            if (a.id !== approvalId) return a;
            const position = a.assets.length;
            const newAsset: ContentAsset = { id: uid(), position, ...asset };
            return { ...a, assets: [...a.assets, newAsset] };
          }),
        }));
        syncOne(approvalId, get);
      },
      removeAsset: (approvalId, assetId) => {
        set(s => ({
          approvals: s.approvals.map(a => a.id === approvalId
            ? { ...a, assets: a.assets.filter(x => x.id !== assetId).map((x, i) => ({ ...x, position: i })) }
            : a),
        }));
        syncOne(approvalId, get);
      },
      addComment: (approvalId, assetId, c) => {
        const newC: ContentComment = { id: uid(), createdAt: new Date().toISOString(), ...c };
        set(s => ({
          approvals: s.approvals.map(a => a.id === approvalId
            ? {
                ...a,
                assets: a.assets.map(asset => asset.id === assetId
                  ? { ...asset, comments: [...(asset.comments ?? []), newC] }
                  : asset),
              }
            : a),
        }));
        syncOne(approvalId, get);
      },
      resolveComment: (approvalId, assetId, commentId) => {
        set(s => ({
          approvals: s.approvals.map(a => a.id === approvalId
            ? {
                ...a,
                assets: a.assets.map(asset => asset.id === assetId
                  ? { ...asset, comments: (asset.comments ?? []).map(c => c.id === commentId ? { ...c, resolved: !c.resolved } : c) }
                  : asset),
              }
            : a),
        }));
        syncOne(approvalId, get);
      },
      markSent: (id) => {
        const now = new Date().toISOString();
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, status: 'enviado' as ApprovalStatus, sentAt: now } : a) }));
        syncOne(id, get);
      },
      markViewed: (id) => {
        const now = new Date().toISOString();
        set(s => ({
          approvals: s.approvals.map(a => a.id === id && !a.viewedAt
            ? { ...a, status: a.status === 'enviado' ? ('visualizado' as ApprovalStatus) : a.status, viewedAt: now }
            : a),
        }));
        syncOne(id, get);
      },
      requestChanges: (id, feedback) => {
        const now = new Date().toISOString();
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, status: 'alteracao' as ApprovalStatus, feedback, decidedAt: now } : a) }));
        syncOne(id, get);
      },
      approve: (id) => {
        const now = new Date().toISOString();
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, status: 'aprovado' as ApprovalStatus, decidedAt: now } : a) }));
        syncOne(id, get);
      },
      markPosted: (id) => {
        set(s => ({ approvals: s.approvals.map(a => a.id === id ? { ...a, status: 'postado' as ApprovalStatus } : a) }));
        syncOne(id, get);
      },
      replaceAll: (items) => set({ approvals: items }),
    }),
    { name: 'evo-content-approvals' },
  ),
);

export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; rgb: string }> = {
  rascunho:     { label: 'Rascunho',      color: '#636366', rgb: '99,99,102' },
  enviado:      { label: 'Enviado',       color: '#356BFF', rgb: '53,107,255' },
  visualizado:  { label: 'Visualizado',   color: '#bf5af2', rgb: '191,90,242' },
  alteracao:    { label: 'Alteração',     color: '#ff9f0a', rgb: '255,159,10' },
  aprovado:     { label: 'Aprovado',      color: '#30d158', rgb: '48,209,88' },
  postado:      { label: 'Postado',       color: '#64C4FF', rgb: '100,196,255' },
};

export const CONTENT_TYPE_LABELS: Record<NonNullable<ContentAsset['type']>, string> = {
  card:          'Card',
  carrossel:     'Carrossel',
  reels:         'Reels',
  story:         'Story',
  video:         'Vídeo',
  apresentacao:  'Apresentação',
  moodboard:     'Moodboard',
  site:          'Site',
  identidade:    'Identidade',
  outro:         'Outro',
};
