import { fmtBRL } from './utils';

/**
 * Area chart com gradiente.
 * - SVG só pros paths (sem texto interno) — preserveAspectRatio="none" sem distorcer
 * - Y-axis labels em HTML à esquerda
 * - X-axis labels em HTML embaixo
 * - Pontos de dados em HTML (position: absolute) pra não distorcer
 *
 * @param formatY — formatador customizável (default: BRL)
 */
export function AreaChart({
  series, accentColor, accentRgb, height = 180, formatY = (v: number) => fmtBRL(v),
}: {
  series: { label: string; value: number }[];
  accentColor: string;
  accentRgb: string;
  height?: number;
  formatY?: (v: number) => string;
}) {
  const W = 600, H = height, padL = 0, padR = 0, padT = 14, padB = 14;
  const max = Math.max(...series.map(s => s.value), 1);
  const niceMax = Math.ceil(max * 1.1 / 1000) * 1000 || 1000;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const points = series.map((s, i) => {
    const x = padL + (i / Math.max(1, series.length - 1)) * innerW;
    const y = padT + (1 - s.value / niceMax) * innerH;
    return { x, y, xPct: (x / W) * 100, yPct: (y / H) * 100, ...s };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x},${padT + innerH} L ${padL},${padT + innerH} Z`;
  const yTicks = [0, 0.5, 1].map(t => Math.round(niceMax * t));
  const gradId = `area-fill-${accentColor.replace('#', '')}`;

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8, padding: '4px 8px 0' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        height, paddingTop: padT, paddingBottom: padB + 22, flexShrink: 0,
      }}>
        {yTicks.slice().reverse().map((t, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', lineHeight: 1 }}>
            {formatY(t)}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgba(${accentRgb},0.45)`} />
              <stop offset="100%" stopColor={`rgba(${accentRgb},0.02)`} />
            </linearGradient>
          </defs>
          {yTicks.map((_, i) => {
            const y = padT + (i / (yTicks.length - 1)) * innerH;
            return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />;
          })}
          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={accentColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {points.map((p, i) => (
          <div key={i}
            style={{
              position: 'absolute',
              left: `${p.xPct}%`, top: `${p.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 9, height: 9, borderRadius: '50%',
              background: accentColor,
              border: '2px solid #0b1028',
              boxShadow: `0 0 0 2px rgba(${accentRgb},0.18)`,
              pointerEvents: 'none',
            }}
            title={`${p.label}: ${formatY(p.value)}`}
          />
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {series.map((s, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
