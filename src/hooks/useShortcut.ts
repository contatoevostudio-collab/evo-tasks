import { useEffect } from 'react';

/**
 * Hook genérico de atalho de teclado. Aceita notação "mod+k", "shift+/", "escape".
 *   useShortcut('mod+n',    () => newTask());
 *   useShortcut('/',        () => focusSearch());
 *   useShortcut('escape',   () => close());
 *   useShortcut('?',        () => openShortcutsHelp());
 *
 * - "mod" vira Cmd no Mac e Ctrl no Windows/Linux
 * - não dispara quando o foco está num input/textarea (a menos que `allowInEditable: true`)
 */
interface Options {
  allowInEditable?: boolean;
  /** se o atalho só deve ativar quando um container específico tem foco */
  scopeRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function useShortcut(combo: string, handler: (e: KeyboardEvent) => void, opts: Options = {}) {
  useEffect(() => {
    if (opts.disabled) return;

    const { parts, mainKey } = parseCombo(combo);

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditing && !opts.allowInEditable) return;

      if (opts.scopeRef?.current && !opts.scopeRef.current.contains(target)) return;

      // Verificar modifiers
      if (parts.mod && !(e.metaKey || e.ctrlKey)) return;
      if (!parts.mod && (e.metaKey || e.ctrlKey)) return;
      if (parts.shift !== e.shiftKey) return;
      if (parts.alt !== e.altKey) return;

      if (e.key.toLowerCase() !== mainKey.toLowerCase()) return;

      e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, handler, opts.allowInEditable, opts.disabled, opts.scopeRef]);
}

function parseCombo(combo: string): { parts: { mod: boolean; shift: boolean; alt: boolean }; mainKey: string } {
  const tokens = combo.toLowerCase().split('+').map((t) => t.trim());
  const parts = { mod: false, shift: false, alt: false };
  let mainKey = '';
  for (const t of tokens) {
    if (t === 'mod' || t === 'cmd' || t === 'ctrl') parts.mod = true;
    else if (t === 'shift') parts.shift = true;
    else if (t === 'alt' || t === 'option') parts.alt = true;
    else {
      const alias: Record<string, string> = {
        esc: 'escape', return: 'enter', space: ' ', slash: '/', question: '?',
      };
      mainKey = alias[t] ?? t;
    }
  }
  return { parts, mainKey };
}
