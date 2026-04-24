import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';
import { useToastStore, type Toast as ToastT, type ToastKind } from '../../store/toasts';

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <FiCheck size={14} />,
  error:   <FiAlertCircle size={14} />,
  info:    <FiInfo size={14} />,
  warning: <FiAlertTriangle size={14} />,
};

const COLOR: Record<ToastKind, { hex: string; rgb: string }> = {
  success: { hex: '#30d158', rgb: '48,209,88' },
  error:   { hex: '#ff453a', rgb: '255,69,58' },
  info:    { hex: '#64d2ff', rgb: '100,210,255' },
  warning: { hex: '#ff9f0a', rgb: '255,159,10' },
};

/**
 * Container global de toasts. Monte uma vez no App (fora de qualquer Route).
 * Para disparar, use `toast.success(...)` ou o hook da store.
 *
 * No App.tsx:
 *   <ToastContainer />
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 100, // var(--z-toast)
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastT; onDismiss: () => void }) {
  const c = COLOR[toast.kind];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role="status"
      style={{
        pointerEvents: 'auto',
        minWidth: 280,
        maxWidth: 360,
        display: 'flex',
        gap: 10,
        padding: '12px 14px',
        background: 'var(--modal-bg, rgba(7,11,28,0.94))',
        border: `1px solid rgba(${c.rgb}, 0.28)`,
        borderRadius: 12,
        boxShadow: `0 12px 32px rgba(0,0,0,0.35), 0 0 24px rgba(${c.rgb}, 0.18)`,
        backdropFilter: 'blur(16px) saturate(1.6)',
        color: 'var(--t1)',
      }}
    >
      <div
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: `rgba(${c.rgb}, 0.18)`,
          border: `1px solid rgba(${c.rgb}, 0.35)`,
          color: c.hex,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 10px rgba(${c.rgb}, 0.35)`,
        }}
      >
        {ICON[toast.kind]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{toast.title}</div>
        {toast.description && (
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, lineHeight: 1.4 }}>
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            onClick={() => { toast.action!.onClick(); onDismiss(); }}
            style={{
              marginTop: 6,
              background: 'none', border: 'none',
              color: c.hex, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', padding: 0,
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--t4)', padding: 2, display: 'flex',
          alignSelf: 'flex-start',
        }}
      >
        <FiX size={12} />
      </button>
    </motion.div>
  );
}
