import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiCornerDownLeft } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  onRun: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  emptyText?: string;
}

/**
 * Paleta de comandos central (⌘K).
 * Controle externo: pai define `open` e registra o atalho.
 *
 * Para atalho global, use junto com `useCommandShortcut(setOpen)` (ver abaixo).
 */
export function CommandPalette({
  open, onClose, items, placeholder = 'Digite um comando ou busca…', emptyText = 'Nada encontrado',
}: CommandPaletteProps) {
  const { accentColor } = useTaskStore();
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open) { setQuery(''); setFocus(0); } }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [it.label, it.group ?? '', ...(it.keywords ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [query, items]);

  // Group by `group` field, preserve order
  const grouped = useMemo(() => {
    const groups: { group: string; items: CommandItem[] }[] = [];
    const byName = new Map<string, CommandItem[]>();
    filtered.forEach((it) => {
      const g = it.group ?? '';
      if (!byName.has(g)) { byName.set(g, []); groups.push({ group: g, items: byName.get(g)! }); }
      byName.get(g)!.push(it);
    });
    return groups;
  }, [filtered]);

  const flatIds = useMemo(() => filtered.map((i) => i.id), [filtered]);

  useEffect(() => { setFocus(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(f + 1, flatIds.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const id = flatIds[focus];
        const it = filtered.find((x) => x.id === id);
        if (it) { it.onRun(); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, focus, flatIds, filtered, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 50, // var(--z-modal)
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '12vh',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              width: 560, maxWidth: '90vw', maxHeight: '70vh',
              background: 'var(--modal-bg, rgba(7,11,28,0.92))',
              border: '1px solid var(--b2)',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(20px) saturate(1.6)',
            }}
          >
            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--b2)' }}>
              <FiSearch size={15} style={{ color: 'var(--t3)' }} />
              <input
                autoFocus value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--t1)', fontSize: 14,
                }}
              />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1px',
                color: 'var(--t4)', background: 'var(--s2)', border: '1px solid var(--b2)',
                borderRadius: 4, padding: '2px 6px', fontFamily: 'ui-monospace, monospace',
              }}>
                ESC
              </span>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ overflowY: 'auto', padding: 6, flex: 1 }}>
              {filtered.length === 0 && (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>{emptyText}</div>
              )}
              {grouped.map((g) => (
                <div key={g.group}>
                  {g.group && (
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', padding: '10px 10px 6px' }}>
                      {g.group}
                    </div>
                  )}
                  {g.items.map((it) => {
                    const globalIdx = flatIds.indexOf(it.id);
                    const isFocused = globalIdx === focus;
                    return (
                      <button
                        key={it.id} type="button"
                        onMouseEnter={() => setFocus(globalIdx)}
                        onClick={() => { it.onRun(); onClose(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '10px 12px', borderRadius: 8,
                          background: isFocused ? 'var(--s2)' : 'transparent',
                          border: 'none', cursor: 'pointer', color: 'var(--t1)',
                          fontSize: 13, textAlign: 'left',
                          borderLeft: `2px solid ${isFocused ? accentColor : 'transparent'}`,
                        }}
                      >
                        {it.icon && <span style={{ display: 'flex', color: 'var(--t3)' }}>{it.icon}</span>}
                        <span style={{ flex: 1 }}>{it.label}</span>
                        {it.shortcut && (
                          <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'ui-monospace, monospace' }}>
                            {it.shortcut}
                          </span>
                        )}
                        {isFocused && <FiCornerDownLeft size={11} style={{ color: 'var(--t4)' }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hook de atalho ⌘K / Ctrl+K ──────────────────────────────────────────────

export function useCommandShortcut(toggle: (open?: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}
