import { create } from 'zustand';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface SyncStore {
  state: SyncState;
  lastSync?: number; // epoch ms
  errorMessage?: string;
  /** True once the first successful pull from Supabase finished. */
  hasInitialSync: boolean;
  setState(state: SyncState, errorMessage?: string): void;
  setSynced(): void;
  markInitialSyncDone(): void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  hasInitialSync: false,
  setState: (state, errorMessage) => set({ state, errorMessage }),
  setSynced: () => set({ state: 'synced', lastSync: Date.now(), errorMessage: undefined }),
  markInitialSyncDone: () => set({ hasInitialSync: true }),
}));

// Wire online/offline listeners once at module load (browser only)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Coming back online — show "synced" feel; the next sync call will refresh state.
    useSyncStore.getState().setState('synced');
  });
  window.addEventListener('offline', () => {
    useSyncStore.getState().setState('offline');
  });
}
