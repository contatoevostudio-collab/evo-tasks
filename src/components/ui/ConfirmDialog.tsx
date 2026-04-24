import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
}

/**
 * Dialog pequeno pra confirmação de ação. Uso típico: ação destrutiva (excluir).
 *   <ConfirmDialog
 *     open={x} onClose={close} onConfirm={handleDelete}
 *     title="Excluir tarefa?"
 *     description="Essa ação não pode ser desfeita."
 *     confirmLabel="Excluir" destructive
 *   />
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  destructive, icon,
}: ConfirmDialogProps) {
  const { accentColor } = useTaskStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') { onConfirm(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onConfirm]);

  const confirmColor = destructive ? '#ff453a' : accentColor;
  const confirmRgb = destructive ? '255,69,58' : hexToRgb(accentColor);

  const defaultIcon = destructive ? <FiAlertTriangle size={20} style={{ color: '#ff453a' }} /> : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.16 }}
            role="alertdialog"
            aria-labelledby="confirm-title"
            style={{
              width: 360, maxWidth: '92vw',
              background: 'var(--modal-bg, rgba(7,11,28,0.94))',
              border: '1px solid var(--b2)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(20px) saturate(1.6)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {(icon ?? defaultIcon) && (
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: destructive ? 'rgba(255,69,58,0.14)' : `${accentColor}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {icon ?? defaultIcon}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div id="confirm-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{title}</div>
                {description && (
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6, lineHeight: 1.45 }}>{description}</div>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex' }}
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  background: 'var(--s2)', border: '1px solid var(--b2)',
                  color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                autoFocus
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  background: confirmColor, border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 0 20px -4px rgba(${confirmRgb}, 0.6)`,
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const clean = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}
