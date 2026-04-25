/**
 * Donut chart com legenda lateral.
 * - número total no centro + label customizável
 * - top N items à direita com bolinha colorida + nome + valor
 *
 * Uso típico: distribuição (por empresa, por categoria, por origem, etc.)
 */
export function DonutChart({ data, total, centerLabel = 'TOTAL' }: {
  data: { label: string; value: number; color: string }[];
  total: number;
  centerLabel?: string;
}) {
  const R = 60, STROKE = 18;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px 16px' }}>
      <svg viewBox={`0 0 ${R * 2 + STROKE} ${R * 2 + STROKE}`} width={140} height={140} style={{ flexShrink: 0 }}>
        <g transform={`translate(${R + STROKE / 2}, ${R + STROKE / 2}) rotate(-90)`}>
          <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />
          {data.map((d, i) => {
            const frac = d.value / Math.max(1, total);
            const dash = frac * C;
            const offset = -acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                cx={0} cy={0} r={R} fill="none"
                stroke={d.color} strokeWidth={STROKE}
                strokeDasharray={`${dash} ${C}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
        <text x="50%" y="48%" textAnchor="middle" fontSize={20} fontWeight={800} fill="#ffffff">{total}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.5)" letterSpacing="1.2px">{centerLabel}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.slice(0, 6).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0, boxShadow: `0 0 6px ${d.color}88` }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: '#ffffff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, flexShrink: 0 }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
