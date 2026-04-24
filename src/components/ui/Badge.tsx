import { useTaskStore } from '../../store/tasks';

interface BadgeProps {
  count?: number;
  dot?: boolean;
  max?: number;
  color?: 'accent' | 'danger' | 'warning' | 'success';
  children: React.ReactElement;
  offset?: { top?: number; right?: number };
}

const PALETTE = {
  accent:  { fallback: null, rgb: null },
  danger:  { fallback: '#ff453a', rgb: '255,69,58' },
  warning: { fallback: '#ff9f0a', rgb: '255,159,10' },
  success: { fallback: '#30d158', rgb: '48,209,88' },
};

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

/**
 * Selinho numerado sobre um elemento. Se count=0 e dot=false, não renderiza.
 *   <Badge count={3}><FiBell /></Badge>
 *   <Badge dot color="success"><Avatar /></Badge>
 *   <Badge count={120} max={99}><button>Inbox</button></Badge>
 */
export function Badge({ count, dot, max = 99, color = 'danger', children, offset = {} }: BadgeProps) {
  const { accentColor } = useTaskStore();
  const bg = color === 'accent' ? accentColor : PALETTE[color].fallback!;
  const rgb = color === 'accent' ? hexToRgb(accentColor) : PALETTE[color].rgb!;

  const show = dot || (typeof count === 'number' && count > 0);
  if (!show) return children;

  const display = dot ? null : (count! > max ? `${max}+` : String(count));

  const badge = (
    <span
      style={{
        position: 'absolute',
        top: offset.top ?? -4,
        right: offset.right ?? -4,
        minWidth: dot ? 8 : 16,
        height: dot ? 8 : 16,
        borderRadius: 99,
        background: bg,
        color: '#071007',
        fontSize: 9,
        fontWeight: 700,
        padding: dot ? 0 : '0 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 8px rgba(${rgb}, 0.8), 0 0 0 2px var(--s1)`,
        pointerEvents: 'none',
      }}
    >
      {display}
    </span>
  );

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      {badge}
    </span>
  );
}
