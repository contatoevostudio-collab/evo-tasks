import { motion } from 'framer-motion';
import { hexToRgb, fmtBRL } from './utils';

/**
 * Funil horizontal (estilo CRM).
 * - cada estágio tem nome, contagem, valor monetário opcional, cor própria
 * - barra com gradiente + glow no padrão da home
 *
 * Uso típico: pipeline de vendas, status de aprovações, etc.
 */
export function Funnel({ stages, onClick, valueFormat = (v: number) => fmtBRL(v) }: {
  stages: { label: string; count: number; value?: number; color: string }[];
  onClick?: () => void;
  valueFormat?: (v: number) => string;
}) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '14px 16px 16px' }}>
      {stages.map((s, i) => {
        const rgb = hexToRgb(s.color);
        const pct = (s.count / max) * 100;
        return (
          <div key={i} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px' }}>
                {s.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {s.count}{s.value !== undefined && s.value > 0 && ` · ${valueFormat(s.value)}`}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, pct)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${s.color}, rgba(${rgb},0.6))`,
                  boxShadow: `0 0 10px rgba(${rgb},0.4)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
