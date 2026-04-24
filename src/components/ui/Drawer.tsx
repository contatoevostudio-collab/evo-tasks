import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  width?: number;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Painel lateral deslizante. Bom pra edição rápida sem abrir modal.
 *   <Drawer open={x} onClose={close} title="Editar tarefa" width={380}>
 *     <form>...</form>
 *   </Drawer>
 */
export function Drawer({ open, onClose, side = 'right', width = 380, title, children, footer }: DrawerProps) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: side === 'right' ? width : -width }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? width : -width }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            style={{
              position: 'fixed',
              top: 0, bottom: 0,
              [side]: 0,
              width,
              zIndex: 50,
              background: 'var(--modal-bg, rgba(7,11,28,0.95))',
              borderLeft: side === 'right' ? '1px solid var(--b2)' : undefined,
              borderRight: side === 'left' ? '1px solid var(--b2)' : undefined,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: side === 'right' ? '-24px 0 60px rgba(0,0,0,0.35)' : '24px 0 60px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(20px) saturate(1.6)',
            }}
          >
            {/* Header */}
            {title !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--b2)',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{title}</div>
                <button
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4, display: 'flex' }}
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {children}
            </div>
            {/* Footer */}
            {footer && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--b2)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
