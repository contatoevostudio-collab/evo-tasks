import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Workspace, WorkspaceType, WorkspaceSettings, WorkspacePalette, ViewLens, PageType } from '../types';

// ─── Paletas pré-definidas ──────────────────────────────────────────────────
// User não escolhe cor custom — pega de uma destas.
export const WORKSPACE_PALETTES: WorkspacePalette[] = [
  { id: 'ocean',    name: 'Oceano',     primary: '#356BFF', secondary: '#64C4FF' },
  { id: 'sunset',   name: 'Pôr do sol', primary: '#ff9f0a', secondary: '#ff6b6b' },
  { id: 'forest',   name: 'Floresta',   primary: '#30d158', secondary: '#86efac' },
  { id: 'orchid',   name: 'Orquídea',   primary: '#bf5af2', secondary: '#f472b6' },
  { id: 'crimson',  name: 'Carmim',     primary: '#ff453a', secondary: '#ff9f0a' },
  { id: 'mint',     name: 'Menta',      primary: '#14b8a6', secondary: '#5eead4' },
  { id: 'gold',     name: 'Ouro',       primary: '#ffd60a', secondary: '#fbbf24' },
  { id: 'graphite', name: 'Grafite',    primary: '#636366', secondary: '#9ca3af' },
];

export function getPalette(id: string): WorkspacePalette {
  return WORKSPACE_PALETTES.find(p => p.id === id) ?? WORKSPACE_PALETTES[0];
}

// ─── Páginas habilitadas por tipo de workspace ──────────────────────────────
const ALL_PAGES: PageType[] = [
  'home', 'inbox', 'tarefas', 'empresas', 'crm', 'propostas',
  'aprovacoes', 'editorial', 'briefings', 'onboarding',
  'todo', 'ideias', 'snippets', 'habitos',
  'financas', 'faturas', 'kpis', 'arquivo',
];

const PAGES_BY_TYPE: Record<WorkspaceType, PageType[]> = {
  freelance: ['home', 'inbox', 'tarefas', 'empresas', 'crm', 'propostas', 'todo', 'financas', 'ideias', 'arquivo'],
  agencia:   [
    'home', 'inbox', 'tarefas', 'empresas', 'crm', 'propostas',
    'aprovacoes', 'editorial', 'briefings', 'onboarding',
    'snippets', 'habitos',
    'financas', 'faturas', 'kpis', 'ideias', 'arquivo',
  ],
  pessoal:   ['home', 'inbox', 'todo', 'ideias', 'financas', 'arquivo'],
  blank:     ALL_PAGES,
};

export function defaultSettingsFor(type: WorkspaceType): WorkspaceSettings {
  return { enabledPages: [...PAGES_BY_TYPE[type]] };
}

/**
 * Retorna as páginas habilitadas para um workspace.
 * Para tipos fixos (não blank), sempre usa a definição atual do PAGES_BY_TYPE,
 * ignorando o valor persistido — assim atualizações no PAGES_BY_TYPE se propagam
 * automaticamente para workspaces existentes sem precisar de migração.
 * Workspaces blank respeitam o settings.enabledPages customizado pelo usuário.
 */
export function getEnabledPages(workspace: { type: WorkspaceType; settings?: WorkspaceSettings }): PageType[] {
  if (workspace.type === 'blank') {
    return workspace.settings?.enabledPages ?? [...ALL_PAGES];
  }
  return [...PAGES_BY_TYPE[workspace.type]];
}

// ─── Store ──────────────────────────────────────────────────────────────────
interface WorkspacesStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  lens: ViewLens;

  addWorkspace(w: Omit<Workspace, 'id' | 'createdAt'>): string;
  updateWorkspace(id: string, updates: Partial<Workspace>): void;
  deleteWorkspace(id: string): void;
  setActiveWorkspace(id: string): void;
  setLens(lens: ViewLens): void;

  // Visible workspace ids resolved against the current lens
  getVisibleIds(): string[];

  // Initial migration helper — creates default workspace if none exists
  ensureDefaultWorkspace(): string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Hook reativo: retorna ids visíveis pela lente atual. Usa shallow equality
 * pra evitar re-renders infinitos quando o selector retorna novo array
 * com mesmo conteúdo (Zustand compara por referência por default).
 */
export function useVisibleWorkspaceIds(): string[] {
  return useWorkspacesStore(
    useShallow(s => {
      if (s.workspaces.length === 0) return [];
      if (s.lens.mode === 'all') return s.workspaces.map(w => w.id);
      if ((s.lens.mode === 'multi' || s.lens.mode === 'other') && s.lens.selectedWorkspaceIds && s.lens.selectedWorkspaceIds.length > 0) {
        return s.lens.selectedWorkspaceIds;
      }
      return s.activeWorkspaceId ? [s.activeWorkspaceId] : [];
    })
  );
}

/**
 * Helper: item passa na lente se não tem workspaceId (legacy/global) OU
 * o id está em visibleIds.
 */
export function isInLens(item: { workspaceId?: string }, visibleIds: string[]): boolean {
  if (!item.workspaceId) return true;
  return visibleIds.includes(item.workspaceId);
}

export const useWorkspacesStore = create<WorkspacesStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      lens: { mode: 'active' },

      addWorkspace: (w) => {
        const id = uid();
        const full: Workspace = { ...w, id, createdAt: new Date().toISOString() };
        set(s => ({
          workspaces: [...s.workspaces, full],
          activeWorkspaceId: s.activeWorkspaceId ?? id,
        }));
        return id;
      },
      updateWorkspace: (id, updates) => {
        set(s => ({
          workspaces: s.workspaces.map(w => w.id === id ? { ...w, ...updates } : w),
        }));
      },
      deleteWorkspace: (id) => {
        set(s => {
          const remaining = s.workspaces.filter(w => w.id !== id);
          const newActive = s.activeWorkspaceId === id
            ? (remaining[0]?.id ?? null)
            : s.activeWorkspaceId;
          return { workspaces: remaining, activeWorkspaceId: newActive };
        });
      },
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setLens: (lens) => set({ lens }),

      getVisibleIds: () => {
        const { workspaces, activeWorkspaceId, lens } = get();
        if (workspaces.length === 0) return [];
        if (lens.mode === 'all') return workspaces.map(w => w.id);
        if (lens.mode === 'multi' && lens.selectedWorkspaceIds && lens.selectedWorkspaceIds.length > 0) {
          return lens.selectedWorkspaceIds;
        }
        if (lens.mode === 'other' && lens.selectedWorkspaceIds && lens.selectedWorkspaceIds.length > 0) {
          return lens.selectedWorkspaceIds;
        }
        return activeWorkspaceId ? [activeWorkspaceId] : [];
      },

      ensureDefaultWorkspace: () => {
        const { workspaces, addWorkspace } = get();
        if (workspaces.length > 0) {
          return workspaces[0].id;
        }
        return addWorkspace({
          name: 'Freelance Design',
          type: 'freelance',
          paletteId: 'ocean',
          settings: defaultSettingsFor('freelance'),
        });
      },
    }),
    { name: 'evo-workspaces-store' }
  )
);
