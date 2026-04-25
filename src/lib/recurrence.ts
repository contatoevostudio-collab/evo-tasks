import { addDays, addWeeks, addMonths, parseISO, format, getDay, startOfMonth, endOfMonth } from 'date-fns';
import type { RecurrenceRule } from '../types';

const DEFAULT_HORIZON_MONTHS = 3;
const SAFETY_LIMIT = 500;

/** Default occurrence count if user didn't set one — ~3 months ahead. */
function defaultCount(rule: RecurrenceRule): number {
  const i = Math.max(1, rule.interval);
  if (rule.freq === 'daily')   return Math.min(60, Math.floor(90 / i));
  if (rule.freq === 'weekly')  return Math.max(1, Math.floor((DEFAULT_HORIZON_MONTHS * 4) / i)) * Math.max(1, rule.byWeekday?.length ?? 1);
  if (rule.freq === 'monthly') return Math.max(1, Math.floor(DEFAULT_HORIZON_MONTHS / i));
  return 1;
}

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Get Nth occurrence of a weekday in a given month. nth: 1..5 or -1 (last). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  const first = startOfMonth(new Date(year, month, 1));
  const last  = endOfMonth(first);
  const matches: Date[] = [];
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    if (getDay(d) === weekday) matches.push(new Date(d));
  }
  if (matches.length === 0) return null;
  if (nth === -1) return matches[matches.length - 1];
  return matches[nth - 1] ?? null;
}

/**
 * Generate future occurrence date strings (yyyy-MM-dd) for a recurrence rule
 * starting AFTER `startDate` (the parent task's date). Excludes startDate itself.
 */
export function generateOccurrences(startDate: string, rule: RecurrenceRule): string[] {
  const start = parseISO(startDate);
  if (Number.isNaN(start.getTime())) return [];
  const interval = Math.max(1, rule.interval);
  const max = rule.count ?? defaultCount(rule);
  const out: string[] = [];

  if (rule.freq === 'daily') {
    let d = start;
    for (let i = 0; i < SAFETY_LIMIT && out.length < max; i++) {
      d = addDays(d, interval);
      out.push(fmt(d));
    }
    return out;
  }

  if (rule.freq === 'weekly') {
    const days = rule.byWeekday && rule.byWeekday.length > 0
      ? [...rule.byWeekday].sort((a, b) => a - b)
      : [getDay(start)];
    // Walk week-by-week (using interval), emitting all matching weekdays per week
    let weekAnchor = start;
    let safety = 0;
    while (out.length < max && safety++ < SAFETY_LIMIT) {
      weekAnchor = addWeeks(weekAnchor, interval);
      // Iterate through the 7 days of this anchor's week (Sun-Sat) — but we need to
      // produce occurrences in chronological order regardless of starting weekday.
      const weekStart = addDays(weekAnchor, -getDay(weekAnchor)); // back to Sunday
      for (const wd of days) {
        const occ = addDays(weekStart, wd);
        if (occ > start) {
          out.push(fmt(occ));
          if (out.length >= max) break;
        }
      }
    }
    return out;
  }

  if (rule.freq === 'monthly') {
    let cursor = start;
    let safety = 0;
    while (out.length < max && safety++ < SAFETY_LIMIT) {
      cursor = addMonths(cursor, interval);
      let occ: Date | null = null;
      if (rule.byMonthWeekday) {
        occ = nthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), rule.byMonthWeekday.weekday, rule.byMonthWeekday.nth);
      } else if (rule.byMonthDay) {
        const lastDay = endOfMonth(cursor).getDate();
        const day = Math.min(rule.byMonthDay, lastDay);
        occ = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      } else {
        occ = new Date(cursor.getFullYear(), cursor.getMonth(), start.getDate());
      }
      if (occ && occ > start) out.push(fmt(occ));
    }
    return out;
  }

  return out;
}

/** Migrate legacy `recurrence: 'weekly'|'monthly'` into a RecurrenceRule. */
export function legacyToRule(legacy: 'weekly' | 'monthly'): RecurrenceRule {
  return { freq: legacy, interval: 1 };
}

/** Human-readable summary, ex: "Toda seg e qua, a cada 2 semanas". */
export function describeRule(rule: RecurrenceRule): string {
  const interval = Math.max(1, rule.interval);
  const dayLabels = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ordinalLabels: Record<number, string> = { 1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', 5: 'quinta', [-1]: 'última' };

  if (rule.freq === 'daily') {
    return interval === 1 ? 'Todo dia' : `A cada ${interval} dias`;
  }
  if (rule.freq === 'weekly') {
    const days = rule.byWeekday && rule.byWeekday.length > 0
      ? rule.byWeekday.map(d => dayLabels[d]).join(' e ')
      : 'mesma semana';
    return interval === 1
      ? `Toda ${days}`
      : `${days}, a cada ${interval} semanas`;
  }
  if (rule.freq === 'monthly') {
    if (rule.byMonthWeekday) {
      const ord = ordinalLabels[rule.byMonthWeekday.nth] ?? `${rule.byMonthWeekday.nth}ª`;
      const wd = dayLabels[rule.byMonthWeekday.weekday];
      return interval === 1 ? `${ord} ${wd} do mês` : `${ord} ${wd}, a cada ${interval} meses`;
    }
    if (rule.byMonthDay) {
      return interval === 1 ? `Dia ${rule.byMonthDay} do mês` : `Dia ${rule.byMonthDay}, a cada ${interval} meses`;
    }
    return interval === 1 ? 'Todo mês' : `A cada ${interval} meses`;
  }
  return '';
}
