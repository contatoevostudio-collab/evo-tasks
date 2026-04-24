import { cloneElement, isValidElement, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
  divider?: boolean; // se true, renderiza um separador (ignora outros campos)
}

interface MenuProps {
  items: MenuItem[];
  children: React.ReactElement;
  align?: 'start' | 'end';
  width?: number;
}

/**
 * Dropdown menu acionado por click no trigger.
 *   <Menu items={[{ label: 'Editar', onClick }, { label: 'Excluir', destructive, onClick }]}>
 *     <button><FiMoreHorizontal /></button>
 *   </Menu>
 */
export function Menu({ items, children, align = 'end', width = 180 }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children as React.ReactElement<any>, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen((o) => !o);
      const original = (children as any).props?.onClick;
      if (original) original(e);
    },
  });

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger}
      <MenuPanel
        open={open}
        items={items}
        width={width}
        onClose={() => setOpen(false)}
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          [align === 'end' ? 'right' : 'left']: 0,
        }}
      />
    </span>
  );
}

// ─── ContextMenu (right-click) ──────────────────────────────────────────────

interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Menu acionado por clique-direito sobre qualquer elemento.
 *   <ContextMenu items={[...]}>
 *     <div>Conteúdo que aceita right-click</div>
 *   </ContextMenu>
 */
export function ContextMenu({ items, children, disabled }: ContextMenuProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  return (
    <>
      <div
        onContextMenu={(e) => {
          if (disabled) return;
          e.preventDefault();
          setPos({ x: e.clientX, y: e.clientY });
        }}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
      {pos && (
        <div
          style={{
            position: 'fixed',
            top: pos.y,
            left: pos.x,
            zIndex: 40, // var(--z-overlay)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuPanel open items={items} width={180} onClose={() => setPos(null)} />
        </div>
      )}
    </>
  );
}

// ─── Shared panel ───────────────────────────────────────────────────────────

interface MenuPanelProps {
  open: boolean;
  items: MenuItem[];
  width: number;
  onClose: () => void;
  style?: React.CSSProperties;
}

function MenuPanel({ open, items, width, onClose, style }: MenuPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -4 }}
          transition={{ duration: 0.12 }}
          role="menu"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b2)',
            borderRadius: 10,
            padding: 4,
            minWidth: width,
            zIndex: 40,
            boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
            backdropFilter: 'blur(12px)',
            ...style,
          }}
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} style={{ height: 1, background: 'var(--b2)', margin: '4px 0' }} />;
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  color: item.destructive ? '#ff453a' : 'var(--t2)',
                  fontSize: 12,
                  textAlign: 'left',
                  opacity: item.disabled ? 0.4 : 1,
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon && <span style={{ display: 'flex' }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'ui-monospace, monospace' }}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
