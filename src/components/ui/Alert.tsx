import { FiCheck, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  severity?: Severity;
  title?: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const CFG: Record<Severity, { icon: React.ReactNode; hex: string; rgb: string }> = {
  info:    { icon: <FiInfo size={14} />,          hex: '#64d2ff', rgb: '100,210,255' },
  success: { icon: <FiCheck size={14} />,         hex: '#30d158', rgb: '48,209,88' },
  warning: { icon: <FiAlertTriangle size={14} />, hex: '#ff9f0a', rgb: '255,159,10' },
  error:   { icon: <FiAlertCircle size={14} />,   hex: '#ff453a', rgb: '255,69,58' },
};

/**
 * Banner inline fixo dentro do fluxo da página (diferente do Toast, que é efêmero).
 *   <Alert severity="warning" title="Sync atrasado">Última sincronização há 2h</Alert>
 *   <Alert severity="info" onClose={dismiss}>Nova versão disponível</Alert>
 */
export function Alert({ severity = 'info', title, children, onClose, icon, action }: AlertProps) {
  const c = CFG[severity];

  return (
    <div
      role={severity === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 14px',
        background: `rgba(${c.rgb}, 0.08)`,
        border: `1px solid rgba(${c.rgb}, 0.28)`,
        borderRadius: 10,
        boxShadow: `0 0 18px -8px rgba(${c.rgb}, 0.45)`,
        color: 'var(--t1)',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: `rgba(${c.rgb}, 0.18)`,
          color: c.hex,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {icon ?? c.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.45 }}>{children}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', padding: 2, display: 'flex',
          }}
        >
          <FiX size={12} />
        </button>
      )}
    </div>
  );
}
