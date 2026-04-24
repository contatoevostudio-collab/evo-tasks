interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  circle?: boolean;
  style?: React.CSSProperties;
}

/**
 * Retângulo cinza com shimmer. Usar pra placeholders enquanto dados carregam.
 *   <Skeleton width={200} height={14} />
 *   <Skeleton circle width={32} height={32} />
 *   <SkeletonText lines={3} />
 */
export function Skeleton({ width = '100%', height = 14, radius = 6, circle, style }: SkeletonProps) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : radius,
        background: 'linear-gradient(90deg, var(--s2) 0%, var(--s1) 50%, var(--s2) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.4s linear infinite',
        ...style,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  gap?: number;
}

export function SkeletonText({ lines = 3, lastLineWidth = '60%', gap = 6 }: SkeletonTextProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={10} width={i === lines - 1 ? lastLineWidth : '100%'} />
      ))}
    </div>
  );
}
