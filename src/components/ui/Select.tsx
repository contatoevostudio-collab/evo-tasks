import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SelectProps<T extends string | number> {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  width?: number | string;
}

/**
 * Select custom (não usa <select> nativo). Keyboard: ↑↓ navegar, Enter selecionar, Esc fechar.
 */
export function Select<T extends string | number>({
  value, options, onChange, placeholder = 'Selecione…', disabled, invalid, width = '100%',
}: SelectProps<T>) {
  const { accentColor } = useTaskStore();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<number>(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx === -1 ? 0 : idx;
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setFocus((f) => (f + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setFocus((f) => (f - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options[focus]) {
        onChange(options[focus].value);
        setOpen(false);
      } else {
        setOpen(true);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', width }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--ib)',
          border: `1px solid ${invalid ? '#ff453a' : open ? accentColor : 'var(--b2)'}`,
          borderRadius: 8,
          padding: '9px 12px',
          color: selected ? 'var(--t1)' : 'var(--t4)',
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          textAlign: 'left',
          transition: 'border-color .12s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {selected?.icon && <span style={{ display: 'flex', color: 'var(--t3)' }}>{selected.icon}</span>}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown
          size={14}
          style={{ color: 'var(--t3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="listbox"
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
              zIndex: 10, // var(--z-dropdown)
              boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isFocused = i === focus;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setFocus(i)}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
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
                  {isSelected && <FiCheck size={12} style={{ color: accentColor, flexShrink: 0 }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
