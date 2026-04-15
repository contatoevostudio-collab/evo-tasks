import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  guestMode: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  initialize(): Promise<void>;
  clearError(): void;
  setGuestMode(v: boolean): void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,
  guestMode: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, loading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },

  signIn: async (email, password) => {
    set({ error: null, loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message, loading: false });
    else set({ loading: false });
  },

  signUp: async (email, password) => {
    set({ error: null, loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message, loading: false });
    else set({ loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  updatePassword: async (newPassword) => {
    set({ error: null, loading: true });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) set({ error: error.message, loading: false });
    else set({ loading: false });
  },

  clearError: () => set({ error: null }),
  setGuestMode: (v) => set({ guestMode: v }),
}));
