import type { TaxMode } from '../types';

const thousands = (n: number) => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** $26.000 — formato de pesos colombianos sin decimales. */
export function money(n: number): string {
  return (n < 0 ? '−$' : '$') + thousands(n);
}

/** $1,6 M / $250 mil — para ejes y listas compactas. */
export function moneyShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + String(Math.round(n / 100_000) / 10).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1000) return '$' + Math.round(n / 1000) + ' mil';
  return money(n);
}

export function intLabel(n: number): string {
  return thousands(n);
}

/** 6,5 — cantidades de inventario con coma decimal. */
export function qty(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

export const TAX: Record<TaxMode, { label: string; rate: number }> = {
  impo: { label: 'Impoconsumo 8%', rate: 0.08 },
  iva: { label: 'IVA 19%', rate: 0.19 },
  none: { label: 'Sin impuesto', rate: 0 },
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function time(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'p. m.' : 'a. m.';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function dayLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${time(ts)}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_LONG[month]} ${year}`;
}

export function minutesSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / 60000));
}

/** Id nuevo en formato UUID, el mismo que usará Supabase. */
export function uid(): string {
  return crypto.randomUUID();
}
