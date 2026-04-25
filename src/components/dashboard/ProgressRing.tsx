/**
 * Anel de progresso (% de meta).
 * - usado pra mostrar progresso de meta diária/mensal
 * - texto central é a porcentagem em branco
 */
export function ProgressRing({ value, goal, color, size = 62 }: {
  value: number;
  goal: number;
  color: string;
  size?: number;
}) {
  const R = (size - 10) / 2, STROKE = 5;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, value / Math.max(1, goal));
  return (
    <svg viewBox={`0 0 ${R * 2 + STROKE} ${R * 2 + STROKE}`} width={size} height={size}>
      <g transform={`translate(${R + STROKE / 2}, ${R + STROKE / 2}) rotate(-90)`}>
        <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
        <circle
          cx={0} cy={0} r={R} fill="none"
          stroke={color} strokeWidth={STROKE}
          strokeDasharray={`${pct * C} ${C}`}
          strokeLinecap="round"
        />
      </g>
      <text x="50%" y="50%" textAnchor="middle" dy="0.34em" fontSize={11} fontWeight={800} fill="#ffffff">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
