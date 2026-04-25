import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { hexToRgb } from './utils';
import { Sparkline } from './Sparkline';

/**
 * KPI tile — usado em dashboards executivos.
 * - número grande em branco (26px / 800)
 * - delta em verde/vermelho com seta
 * - sparkline opcional embaixo
 *
 * @param deltaPositiveIsGood — false pra métricas onde queda é boa (ex: tempo de resposta)
 */
export function KpiTile({
  label, value, delta, deltaPositiveIsGood = true, icon, color, sparkline, suffix,
}: {
  label: string;
  value: string | number;
  delta?: number;            // % variation, can be negative
  deltaPositiveIsGood?: boolean;
  icon: React.ReactNode;
  color: string;
  sparkline?: number[];
  suffix?: string;
}) {
  const rgb = hexToRgb(color);
  const deltaSign = delta === undefined ? 0 : (delta > 0 ? 1 : delta < 0 ? -1 : 0);
  const deltaGood = deltaPositiveIsGood ? deltaSign > 0 : deltaSign < 0;
  const deltaColor = deltaSign === 0 ? 'rgba(255,255,255,0.4)' : (deltaGood ? '#30d158' : '#ff453a');

  return (
    <div style={{
      borderRadius: 14,
      background: `linear-gradient(160deg, rgba(${rgb},0.10) 0%, var(--s1) 60%)`,
      border: `1px solid rgba(${rgb},0.22)`,
      padding: '14px 16px', position: 'relative', overflow: 'hidden',
      boxShadow: `0 6px 18px rgba(${rgb},0.08), 0 1px 0 rgba(255,255,255,0.04) inset`,
      display: 'flex', flexDirection: 'column', gap: 8,
      minHeight: 110,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: `rgba(${rgb},0.18)`, border: `1px solid rgba(${rgb},0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', flex: 1 }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.6px', lineHeight: 1 }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{suffix}</span>}
      </div>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: deltaColor }}>
          {deltaSign > 0 ? <FiArrowUp size={10} /> : deltaSign < 0 ? <FiArrowDown size={10} /> : null}
          {deltaSign === 0 ? '—' : `${Math.abs(delta).toFixed(0)}% vs anterior`}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 4 }}>
          <Sparkline values={sparkline} color={color} />
        </div>
      )}
    </div>
  );
}
