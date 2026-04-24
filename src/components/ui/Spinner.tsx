import { useTaskStore } from '../../store/tasks';

interface SpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
  /** se true, ocupa 100% do container e centraliza */
  centered?: boolean;
}

/**
 * Spinner SVG girando. 3 tamanhos típicos: 14 (inline/button), 20 (seção), 36 (página).
 *   <Spinner />                // 16 default
 *   <Spinner size={14} />      // em botão
 *   <Spinner size={36} centered /> // loader de página
 */
export function Spinner({ size = 16, color, thickness = 2, centered }: SpinnerProps) {
  const { accentColor } = useTaskStore();
  const c = color ?? accentColor;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;

  const svg = (
    <svg width={size} height={size} style={{ animation: 'spin 0.9s linear infinite' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--s2)" strokeWidth={thickness} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={c} strokeWidth={thickness} fill="none" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * 0.75}
      />
    </svg>
  );

  if (!centered) return svg;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 20 }}>
      {svg}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  fullscreen?: boolean;
}

/**
 * Overlay semitransparente com spinner central. Use ao carregar um bloco inteiro.
 *   <LoadingOverlay message="Sincronizando..." />
 *   <LoadingOverlay fullscreen />
 */
export function LoadingOverlay({ message, fullscreen }: LoadingOverlayProps) {
  return (
    <div
      aria-busy="true"
      style={{
        position: fullscreen ? 'fixed' : 'absolute',
        inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: fullscreen ? 50 : 10,
      }}
    >
      <Spinner size={28} thickness={2.5} />
      {message && <div style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>{message}</div>}
    </div>
  );
}
