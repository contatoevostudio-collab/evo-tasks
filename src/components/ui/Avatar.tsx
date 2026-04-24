import { useMemo } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  color?: string; // override cor de fallback
  status?: 'online' | 'offline' | 'busy' | 'away';
  onClick?: () => void;
}

const SIZES: Record<AvatarSize, { px: number; font: number; dot: number; dotPx: number }> = {
  xs: { px: 20, font: 9,  dot: 6,  dotPx: 1.5 },
  sm: { px: 24, font: 10, dot: 7,  dotPx: 1.5 },
  md: { px: 32, font: 12, dot: 9,  dotPx: 2 },
  lg: { px: 40, font: 14, dot: 11, dotPx: 2 },
  xl: { px: 56, font: 18, dot: 13, dotPx: 2 },
};

const STATUS_COLOR: Record<NonNullable<AvatarProps['status']>, string> = {
  online:  '#30d158',
  offline: '#636366',
  busy:    '#ff453a',
  away:    '#ff9f0a',
};

// Hash determinístico nome→cor (palette suave)
const PALETTE = ['#5e5ce6', '#bf5af2', '#64d2ff', '#30d158', '#ff9f0a', '#ff375f', '#ffd60a', '#356BFF'];
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

/**
 * Avatar circular: foto ou iniciais coloridas.
 *   <Avatar name="Gabriel Busquet" size="md" status="online" />
 *   <Avatar src="https://..." size="lg" />
 */
export function Avatar({ name = '', src, size = 'md', color, status, onClick }: AvatarProps) {
  const dim = SIZES[size];
  const bg = useMemo(() => color ?? colorFromName(name || '?'), [name, color]);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: dim.px,
        height: dim.px,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: src ? 'transparent' : `linear-gradient(135deg, ${bg}, ${bg}cc)`,
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: dim.font, fontWeight: 700,
          userSelect: 'none',
        }}
      >
        {!src && initials(name)}
      </div>
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: -1, right: -1,
            width: dim.dot, height: dim.dot, borderRadius: '50%',
            background: STATUS_COLOR[status],
            border: `${dim.dotPx}px solid var(--s1)`,
            boxShadow: status === 'online' ? `0 0 6px ${STATUS_COLOR.online}99` : 'none',
          }}
        />
      )}
    </div>
  );
}

// ─── AvatarStack ────────────────────────────────────────────────────────────

interface AvatarStackProps {
  avatars: Array<{ name?: string; src?: string; color?: string }>;
  max?: number;
  size?: AvatarSize;
  onClickMore?: () => void;
}

/**
 * Grupo de avatares sobrepostos. Mostra no máximo `max` e o resto vira "+N".
 *   <AvatarStack avatars={[{name:'Ana'},{name:'Bob'},{name:'Carol'}]} max={3} />
 */
export function AvatarStack({ avatars, max = 4, size = 'sm', onClickMore }: AvatarStackProps) {
  const dim = SIZES[size];
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - visible.length;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {visible.map((a, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -dim.px * 0.32,
            borderRadius: '50%',
            boxShadow: '0 0 0 2px var(--s1)',
            position: 'relative', zIndex: visible.length - i,
          }}
        >
          <Avatar name={a.name} src={a.src} color={a.color} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          onClick={onClickMore}
          style={{
            marginLeft: -dim.px * 0.32,
            width: dim.px, height: dim.px, borderRadius: '50%',
            background: 'var(--s2)', border: '2px solid var(--s1)',
            color: 'var(--t2)', fontSize: dim.font, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: onClickMore ? 'pointer' : 'default',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
