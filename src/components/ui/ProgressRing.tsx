import { useTaskStore } from '../../store/tasks';

interface ProgressRingProps {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string; // override
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

/**
 * Ring de progresso circular. Bom pra metas e orçamento (substitui barra).
 *   <ProgressRing value={72} size={72} label="72%" sublabel="meta" />
 */
export function ProgressRing({
  value, size = 64, stroke = 6, color, trackColor = 'var(--s2)', label, sublabel,
}: ProgressRingProps) {
  const { accentColor } = useTaskStore();
  const c = color ?? accentColor;
  const rgb = hexToRgb(c);
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (clamped / 100) * C;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={c} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset .5s var(--ease-out, cubic-bezier(.4,0,.2,1))',
            filter: `drop-shadow(0 0 4px rgba(${rgb}, 0.6))`,
          }}
        />
      </svg>
      {(label || sublabel) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {label && <div style={{ fontSize: size > 70 ? 14 : 11, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>{label}</div>}
          {sublabel && <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>{sublabel}</div>}
        </div>
      )}
    </div>
  );
}
