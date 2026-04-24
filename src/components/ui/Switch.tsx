import { useTaskStore } from '../../store/tasks';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  description?: string;
}

/**
 * On/off toggle. Track ganha accent + glow quando ligado.
 * Uso: <Switch checked={x} onChange={setX} label="Notificações" />
 */
export function Switch({ checked, onChange, disabled, size = 'md', label, description }: SwitchProps) {
  const { accentColor } = useTaskStore();

  const dims = size === 'sm'
    ? { track: 28, trackH: 16, knob: 12, travel: 12 }
    : { track: 36, trackH: 20, knob: 16, travel: 16 };

  const hexToRgb = (hex: string) => {
    const v = hex.replace('#', '');
    const r = parseInt(v.slice(0, 2), 16) || 0;
    const g = parseInt(v.slice(2, 4), 16) || 0;
    const b = parseInt(v.slice(4, 6), 16) || 0;
    return `${r},${g},${b}`;
  };

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative',
        width: dims.track,
        height: dims.trackH,
        borderRadius: 99,
        background: checked ? accentColor : 'var(--s2)',
        border: `1px solid ${checked ? accentColor : 'var(--b2)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .18s var(--ease-out, cubic-bezier(.4,0,.2,1))',
        opacity: disabled ? 0.4 : 1,
        padding: 0,
        flexShrink: 0,
        boxShadow: checked ? `0 0 12px 0 rgba(${hexToRgb(accentColor)}, 0.45)` : 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: checked ? dims.travel + 2 : 2,
          transform: 'translateY(-50%)',
          width: dims.knob,
          height: dims.knob,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
          transition: 'left .18s var(--ease-out, cubic-bezier(.4,0,.2,1))',
        }}
      />
    </button>
  );

  if (!label && !description) return toggle;

  return (
    <label
      style={{
        display: 'flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {toggle}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        )}
        {description && (
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: label ? 2 : 0 }}>{description}</div>
        )}
      </div>
    </label>
  );
}
