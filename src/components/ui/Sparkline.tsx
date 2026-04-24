import { useTaskStore } from '../../store/tasks';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  showDot?: boolean; // marcador no último ponto
}

function hexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

/**
 * Mini-gráfico de linha inline. Ideal pra mostrar tendência num card compacto.
 *   <Sparkline data={[4,7,5,8,12,10,14]} />
 *   <Sparkline data={monthly} width={80} height={24} color="#30d158" fill showDot />
 */
export function Sparkline({
  data, width = 80, height = 24, color, fill = true, showDot = true,
}: SparklineProps) {
  const { accentColor } = useTaskStore();
  const c = color ?? accentColor;
  const rgb = hexToRgb(c);

  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pad = 2;

  const points = data.map((v, i) => ({
    x: i * step,
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = path + ` L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

  const last = points[points.length - 1];
  const id = `spark-grad-${Math.abs(data.reduce((a, b) => a * 31 + b, 7)) % 1000}`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px rgba(${rgb}, 0.5))` }} />
      {showDot && (
        <circle cx={last.x} cy={last.y} r={2.5} fill={c}
          style={{ filter: `drop-shadow(0 0 4px rgba(${rgb}, 0.9))` }} />
      )}
    </svg>
  );
}
