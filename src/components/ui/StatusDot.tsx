interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'success' | 'error' | 'warning' | 'info';
  size?: number;
  pulse?: boolean;
  label?: string;
}

const COLOR: Record<StatusDotProps['status'], { bg: string; rgb: string }> = {
  online:  { bg: '#30d158', rgb: '48,209,88' },
  offline: { bg: '#636366', rgb: '99,99,102' },
  busy:    { bg: '#ff453a', rgb: '255,69,58' },
  away:    { bg: '#ff9f0a', rgb: '255,159,10' },
  success: { bg: '#30d158', rgb: '48,209,88' },
  error:   { bg: '#ff453a', rgb: '255,69,58' },
  warning: { bg: '#ff9f0a', rgb: '255,159,10' },
  info:    { bg: '#64d2ff', rgb: '100,210,255' },
};

/**
 * Pontinho colorido para indicar estado. Pode pulsar quando "online/ativo".
 *   <StatusDot status="online" pulse />
 *   <StatusDot status="error" label="Falhou" />
 */
export function StatusDot({ status, size = 8, pulse, label }: StatusDotProps) {
  const c = COLOR[status];
  const dot = (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.bg,
        boxShadow: `0 0 ${size * 0.75}px rgba(${c.rgb}, 0.6)`,
        flexShrink: 0,
        animation: pulse ? 'syncPulse 1.6s ease-in-out infinite' : undefined,
      }}
    />
  );

  if (!label) return dot;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)' }}>
      {dot}
      {label}
    </span>
  );
}
