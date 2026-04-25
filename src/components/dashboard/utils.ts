/** Convert hex color to "r,g,b" string for use in rgba(). */
export const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const v = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(v.slice(0, 2), 16) || 0;
  const g = parseInt(v.slice(2, 4), 16) || 0;
  const b = parseInt(v.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
};

/** Format BRL currency without decimals (R$ 1.234). */
export const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** Format BRL currency with decimals (R$ 1.234,56). */
export const fmtBRLfull = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
