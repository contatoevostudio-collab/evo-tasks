import '@testing-library/jest-dom';

// UUID para jsdom
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => Math.random().toString(36).slice(2) },
  writable: true,
});

// localStorage completo para Zustand persist
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
