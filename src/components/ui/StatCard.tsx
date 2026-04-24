import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { Sparkline } from './Sparkline';
import { fmtPct } from '../../lib/format';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** cor semântica do card (verde, vermelho, accent). Ativa halo interno. */
  accent?: { hex: string; rgb: string };
  /** variante visual */
  variant?: 'simple' | 'trend' | 'sparkline';
  /** para trend: variação em % (ex: 15.7 ou -3.2). Positivo = verde */
  trendPct?: number;
  /** interpretação do sinal — em 'expense' menor é melhor (trendPct negativo é verde) */
  positiveDir?: 'up' | 'down';
  /** para sparkline */
  sparkData?: number[];
  subtitle?: React.ReactNode;
}

/**
 * Card de estatística em 3 variantes padronizadas.
 *
 *   simple   — só o valor
 *   trend    — valor + pill de variação %
 *   sparkline — valor + mini-chart abaixo
 *
 * Exemplo:
 *   <StatCard label="Income" value={fmtShort(income)}
 *             variant="trend" trendPct={incomePct} positiveDir="up"
 *             accent={{hex:'#30d158', rgb:'48,209,88'}} icon={<FiTrendingUp />} />
 */
export function StatCard({
  label, value, icon, accent, variant = 'simple', trendPct, positiveDir = 'up',
  sparkData, subtitle,
}: StatCardProps) {
  const hasAccent = !!accent;

  const baseStyle: React.CSSProperties = {
    background: 'var(--s1)',
    borderRadius: 16,
    padding: 18,
    border: '1px solid var(--b2)',
    position: 'relative',
    overflow: 'hidden',
  };

  const accentStyle: React.CSSProperties = hasAccent
    ? {
        backgroundImage: `radial-gradient(circle at 110% 100%, rgba(${accent!.rgb}, 0.22), transparent 58%)`,
        boxShadow: `0 0 0 1px var(--b2), 0 0 30px -8px rgba(${accent!.rgb}, 0.35)`,
      }
    : {};

  const pillPositive = trendPct !== undefined
    ? (positiveDir === 'up' ? trendPct >= 0 : trendPct <= 0)
    : true;

  const pillColor = pillPositive ? '#30d158' : '#ff453a';
  const pillRgb   = pillPositive ? '48,209,88' : '255,69,58';

  return (
    <div style={{ ...baseStyle, ...accentStyle }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{label}</span>
        {icon && (
          <span style={{ display: 'flex', color: accent?.hex ?? 'var(--t3)' }}>{icon}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>{value}</span>
        </div>
        {variant === 'trend' && trendPct !== undefined && (
          <span
            className="glow"
            style={{
              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
              background: pillColor, color: '#071007',
              ['--glow' as any]: pillRgb,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}
          >
            {pillPositive ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
            {fmtPct(trendPct, { signed: false })}
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, position: 'relative' }}>{subtitle}</div>
      )}

      {variant === 'sparkline' && sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 10, position: 'relative' }}>
          <Sparkline data={sparkData} width={160} height={28} color={accent?.hex} />
        </div>
      )}
    </div>
  );
}
