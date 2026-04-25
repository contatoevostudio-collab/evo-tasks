// Primitivos visuais reutilizáveis pra dashboards/páginas no estilo Home.
// Veja DESIGN_SYSTEM_DASHBOARD.md na raiz do projeto pras regras de uso.

export { Card, CardHeader }       from './Card';
export { EmptyState }             from './EmptyState';
export { KpiTile }                from './KpiTile';
export { Sparkline }              from './Sparkline';
export { AreaChart }              from './AreaChart';
export { Funnel }                 from './Funnel';
export { DonutChart }             from './DonutChart';
export { ProgressRing }           from './ProgressRing';
export { ProductivityHeatmap }    from './ProductivityHeatmap';
export type { HeatmapView }       from './ProductivityHeatmap';
export { hexToRgb, fmtBRL, fmtBRLfull } from './utils';
