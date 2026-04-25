import { hexToRgb } from './utils';

/**
 * Mini sparkline chart (SVG).
 * - usado dentro de KpiTile pra mostrar tendência de 7 dias
 * - preserveAspectRatio="none" pra esticar; sem texto interno
 */
export function Sparkline({ values, color, height = 28 }: {
  values: number[];
  color: string;
  height?: number;
}) {
  const rgb = hexToRgb(color);
  const W = 100, H = height;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return [x, y];
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
  const areaD = `${pathD} L ${W},${H} L 0,${H} Z`;
  const id = `spark-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgba(${rgb},0.4)`} />
          <stop offset="100%" stopColor={`rgba(${rgb},0)`} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
