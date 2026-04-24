/**
 * Skeleton mostrado enquanto a primeira sincronização Supabase está em andamento.
 * Reusa o keyframe `skeletonShimmer` definido em src/index.css.
 */
export function PageSkeleton() {
  const Block = ({ w, h, mb }: { w: string; h: number; mb?: number }) => (
    <div
      style={{
        width: w,
        height: h,
        marginBottom: mb ?? 12,
        borderRadius: 8,
        background: 'linear-gradient(90deg, var(--s2) 0%, var(--s1) 50%, var(--s2) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.4s linear infinite',
      }}
    />
  );

  return (
    <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      <Block w="40%" h={28} mb={8} />
      <Block w="60%" h={14} mb={20} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Block w="100%" h={60} />
        <Block w="100%" h={60} />
        <Block w="100%" h={60} />
      </div>
      <Block w="100%" h={300} />
    </div>
  );
}
