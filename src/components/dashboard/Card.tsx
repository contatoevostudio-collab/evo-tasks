import { hexToRgb } from './utils';

/**
 * Standard dashboard card.
 * - radius 14, border var(--b2), subtle shadow
 * - optional accent left border
 */
export function Card({ children, style, accentLeft }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentLeft?: string;
}) {
  return (
    <div style={{
      background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)',
      overflow: 'hidden', position: 'relative',
      boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 6px 22px rgba(0,0,0,0.28)',
      ...(accentLeft ? { borderLeft: `3px solid ${accentLeft}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

/**
 * Standard card header.
 * - icon in colored bubble (28×28, accent-tinted)
 * - title in white uppercase 11px / 700 / 1.4px letter-spacing
 * - optional `right` slot for badges, "Ver →" links, or counters
 */
export function CardHeader({ icon, title, accent, right }: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  right?: React.ReactNode;
}) {
  const rgb = hexToRgb(accent);
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--b1)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `rgba(${rgb},0.14)`,
        border: `1px solid rgba(${rgb},0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '1.4px',
        textTransform: 'uppercase', color: '#ffffff', flex: 1,
      }}>
        {title}
      </span>
      {right}
    </div>
  );
}
