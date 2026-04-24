import { FiX } from 'react-icons/fi';

interface TagProps {
  children: React.ReactNode;
  color?: string; // hex
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
  variant?: 'soft' | 'solid' | 'outline';
}

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

/**
 * Chip / tag colorido. Três variantes:
 *   - soft (default): fundo com opacity baixa da cor
 *   - solid: fundo saturado + glow
 *   - outline: só borda e texto
 *
 *   <Tag>urgente</Tag>
 *   <Tag color="#ff453a" variant="solid">atrasado</Tag>
 *   <Tag color="#5e5ce6" onRemove={() => remove()}>cliente A</Tag>
 */
export function Tag({ children, color, onRemove, onClick, size = 'md', variant = 'soft' }: TagProps) {
  const c = color ?? '#5e5ce6';
  const rgb = hexToRgb(c);

  const pad = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? 10 : 11;

  const styles: React.CSSProperties =
    variant === 'solid'
      ? {
          background: c,
          color: '#071007',
          boxShadow: `0 0 10px rgba(${rgb}, 0.45), 0 0 22px rgba(${rgb}, 0.22)`,
        }
      : variant === 'outline'
      ? {
          background: 'transparent',
          color: c,
          border: `1px solid ${c}66`,
        }
      : {
          background: `rgba(${rgb}, 0.14)`,
          color: c,
          border: `1px solid rgba(${rgb}, 0.28)`,
        };

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: pad,
        borderRadius: 99,
        fontSize,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        ...styles,
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remover"
          style={{
            display: 'flex',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          <FiX size={size === 'sm' ? 9 : 10} />
        </button>
      )}
    </span>
  );
}
