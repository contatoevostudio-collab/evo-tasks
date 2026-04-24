/**
 * Formatação padrão do app.
 *
 * Regra: toda exibição de moeda, porcentagem ou data deve passar por estas
 * funções. Nunca chamar `toLocaleString` ou `format()` direto em componente.
 */

import { format as dfFormat, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Números & moeda ─────────────────────────────────────────────────────────

/** R$ 1.234,56 — valor completo com 2 casas, sempre positivo */
export function fmtBRL(n: number): string {
  return `R$ ${Math.abs(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** R$ 1,2k ou R$ 890 — compacto, ideal para cards/charts com pouco espaço */
export function fmtShort(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/** Número sem prefixo de moeda: "1,2k" ou "890" */
export function fmtShortNum(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** "+15,7%" / "-3,2%" — com sinal e 1 casa decimal */
export function fmtPct(n: number, { signed = true }: { signed?: boolean } = {}): string {
  const s = Math.abs(n).toFixed(1).replace('.', ',');
  if (!signed) return `${s}%`;
  return `${n >= 0 ? '+' : '−'}${s}%`;
}

/** Inteiro localizado: "1.234" */
export function fmtInt(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// ─── Datas ───────────────────────────────────────────────────────────────────

/**
 * Tokens de formato de data em uso no app. Use estas constantes em vez de
 * strings mágicas (`format(d, 'dd/MM/yyyy')` vira `format(d, DATE_FMT.short)`).
 */
export const DATE_FMT = {
  /** "21/04/2026" — lista, tabela, header denso */
  short: 'dd/MM/yyyy',
  /** "21/04" — column compacta */
  shortNoYear: 'dd/MM',
  /** "21 de abril de 2026" — contexto longo */
  long: "d 'de' MMMM 'de' yyyy",
  /** "21 de abril" — próxima data, subscription */
  monthDay: "d 'de' MMMM",
  /** "abr 2026" — seletor de mês */
  monthYear: 'MMM yyyy',
  /** "abr" — label curto em chart */
  monthShort: 'MMM',
  /** "2026-04-21" — chave/ordenação/ISO */
  iso: 'yyyy-MM-dd',
  /** "2026-04" — chave de mês */
  monthKey: 'yyyy-MM',
  /** "14:30" — hora */
  time: 'HH:mm',
  /** "21/04 14:30" — data+hora curta */
  shortWithTime: 'dd/MM HH:mm',
} as const;

type DateFmtKey = keyof typeof DATE_FMT;

/** Formata uma data (Date ou ISO string) usando um dos tokens padrão + ptBR. */
export function fmtDate(d: Date | string, token: DateFmtKey = 'short'): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return dfFormat(date, DATE_FMT[token], { locale: ptBR });
}

/** Capitaliza primeira letra (útil pra meses "abr" → "Abr"). */
export function capitalize(s: string): string {
  return s.replace(/^\w/, (c) => c.toUpperCase());
}
