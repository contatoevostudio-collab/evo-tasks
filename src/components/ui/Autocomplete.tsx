import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

export interface AutocompleteOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface AutocompleteProps<T extends string | number> {
  value: T | null;
  options: AutocompleteOption<T>[];
  onChange: (v: T | null) => void;
  placeholder?: string;
  emptyText?: string;
  allowCreate?: boolean;
  onCreate?: (text: string) => void;
  width?: number | string;
}

/**
 * Input de busca com lista flutuante filtrada. Ideal para escolher cliente,
 * categoria, tag — listas grandes onde Select seria denso.
 */
export function Autocomplete<T extends string | number>({
  value, options, onChange, placeholder = 'Buscar...', emptyText = 'Nada encontrado',
  allowCreate, onCreate, width = '100%',
}: AutocompleteProps<T>) {
  const { accentColor } = useTaskStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }, [query, options]);

  useEffect(() => { setFocus(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const pick = (opt: AutocompleteOption<T>) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(f + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[focus]) pick(filtered[focus]);
      else if (allowCreate && onCreate && query.trim()) {
        onCreate(query.trim());
        setOpen(false);
        setQuery('');
      }
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const showCreate = allowCreate && onCreate && query.trim() &&
    !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={rootRef} style={{ position: 'relative', width }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--ib)',
          border: `1px solid ${open ? accentColor : 'var(--b2)'}`,
          borderRadius: 8,
          padding: '9px 12px',
          transition: 'border-color .12s',
        }}
      >
        <FiSearch size={13} style={{ color: 'var(--t4)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={open ? query : (selected?.label ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={selected ? selected.label : placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--t1)',
            fontSize: 13,
            minWidth: 0,
          }}
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(''); inputRef.current?.focus(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex' }}
          >
            <FiX size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: 260,
              overflowY: 'auto',
              background: 'var(--s1)',
              border: '1px solid var(--b2)',
              borderRadius: 10,
              padding: 4,
              zIndex: 10,
              boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {filtered.length === 0 && !showCreate && (
              <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--t4)', textAlign: 'center' }}>
                {emptyText}
              </div>
            )}
            {filtered.map((opt, i) => {
              const isSelected = opt.value === value;
              const isFocused = i === focus;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onMouseEnter={() => setFocus(i)}
                  onClick={() => pick(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: isFocused ? 'var(--s2)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--t1)',
                    fontSize: 12,
                    textAlign: 'left',
                  }}
                >
                  {opt.icon && <span style={{ display: 'flex', color: 'var(--t3)' }}>{opt.icon}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</div>
                    {opt.description && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>{opt.description}</div>}
                  </div>
                  {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />}
                </button>
              );
            })}
            {showCreate && (
              <button
                type="button"
                onClick={() => { onCreate!(query.trim()); setOpen(false); setQuery(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: accentColor,
                  fontSize: 12,
                  textAlign: 'left',
                  fontWeight: 600,
                  borderTop: filtered.length > 0 ? '1px solid var(--b2)' : 'none',
                  marginTop: filtered.length > 0 ? 4 : 0,
                  paddingTop: filtered.length > 0 ? 10 : 8,
                }}
              >
                + Criar "{query.trim()}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
