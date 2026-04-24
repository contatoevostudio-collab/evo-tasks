import { useEffect } from 'react';
import type { PageType } from '../types';

interface Options {
  onNewTask: () => void;
  onSearch: () => void;
  onNavigate: (page: PageType) => void;
  onEscape: () => void;
  disabled?: boolean;
}

const PAGE_KEYS: Record<string, PageType> = {
  '1': 'home',
  '2': 'tarefas',
  '3': 'empresas',
  '4': 'arquivo',
  '5': 'crm',
};

export function useKeyboardShortcuts({ onNewTask, onSearch, onNavigate, onEscape, disabled }: Options) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape — sempre ativo
      if (e.key === 'Escape') {
        onEscape();
        return;
      }

      // Cmd+K — busca
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch();
        return;
      }

      if (isEditing) return;

      // N — nova tarefa
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewTask();
        return;
      }

      // 1–5 — navegar entre páginas
      if (PAGE_KEYS[e.key]) {
        onNavigate(PAGE_KEYS[e.key]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewTask, onSearch, onNavigate, onEscape, disabled]);
}
