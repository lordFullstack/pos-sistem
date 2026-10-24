import type { PayMethod, Sale } from '../types';

export type Period = 'hoy' | 'semana' | 'mes';

const DAY = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function monthRange(year: number, month: number): { start: number; end: number } {
  return { start: new Date(year, month, 1).getTime(), end: new Date(year, month + 1, 1).getTime() };
}

export interface Range {
  start: number;
  end: number;
  prevStart: number;
  prevEnd: number;
}

/** Rango del periodo y del periodo anterior equivalente (para comparar). */
export function rangeFor(period: Period, now = Date.now()): Range {
  const today = startOfDay(now);
  if (period === 'hoy') {
    // Ayer hasta la misma hora de hoy, para no comparar un día a medias contra uno completo.
    return { start: today, end: today + DAY, prevStart: today - DAY, prevEnd: today - DAY + (now - today) };
  }
  if (period === 'semana') {
    const start = today - 6 * DAY;
    return { start, end: today + DAY, prevStart: start - 7 * DAY, prevEnd: start };
  }
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  // Mes anterior hasta el mismo día del mes, para comparar justo.
  const elapsed = today + DAY - start;
  return { start, end: today + DAY, prevStart, prevEnd: Math.min(prevStart + elapsed, start) };
}

export function salesIn(sales: Sale[], start: number, end: number): Sale[] {
  return sales.filter((s) => s.at >= start && s.at < end);
}

export interface Summary {
  total: number;
  count: number;
  ticket: number;
  tax: number;
}

export function summarize(sales: Sale[]): Summary {
  const total = sales.reduce((a, s) => a + s.total, 0);
  const tax = sales.reduce((a, s) => a + s.tax, 0);
  return { total, count: sales.length, ticket: sales.length ? total / sales.length : 0, tax };
}

/** Variación porcentual redondeada; null si no hay base para comparar. */
export function change(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export interface Bucket {
  label: string;
  value: number;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function buckets(period: Period, sales: Sale[], now = Date.now()): Bucket[] {
  const r = rangeFor(period, now);
  const inRange = salesIn(sales, r.start, r.end);
  if (period === 'hoy') {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 a 21:00
    return hours.map((h) => ({
      label: `${h}:00`,
      value: inRange.filter((s) => new Date(s.at).getHours() === h).reduce((a, s) => a + s.total, 0),
    }));
  }
  if (period === 'semana') {
    return Array.from({ length: 7 }, (_, i) => {
      const start = r.start + i * DAY;
      return {
        label: DAYS[new Date(start).getDay()],
        value: salesIn(inRange, start, start + DAY).reduce((a, s) => a + s.total, 0),
      };
    });
  }
  const weeks: Bucket[] = [];
  for (let w = 0; w < 5; w++) {
    const start = r.start + w * 7 * DAY;
    if (start >= r.end) break;
    weeks.push({
      label: `Semana ${w + 1}`,
      value: salesIn(inRange, start, Math.min(start + 7 * DAY, r.end)).reduce((a, s) => a + s.total, 0),
    });
  }
  return weeks;
}

export interface ProductStat {
  name: string;
  qty: number;
  value: number;
}

export function topProducts(sales: Sale[], limit = 5): ProductStat[] {
  const map = new Map<string, ProductStat>();
  sales.forEach((s) =>
    s.lines.forEach((l) => {
      const cur = map.get(l.name) ?? { name: l.name, qty: 0, value: 0 };
      cur.qty += l.qty;
      cur.value += l.unit * l.qty;
      map.set(l.name, cur);
    }),
  );
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export function paySplit(sales: Sale[]): Record<PayMethod, number> {
  const out: Record<PayMethod, number> = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  sales.forEach((s) => (out[s.method] += s.total));
  return out;
}

/** Ingresos agrupados por día (para el libro de movimientos). */
export function dailyIncome(sales: Sale[]): { day: number; total: number; count: number }[] {
  const map = new Map<number, { day: number; total: number; count: number }>();
  sales.forEach((s) => {
    const day = startOfDay(s.at);
    const cur = map.get(day) ?? { day, total: 0, count: 0 };
    cur.total += s.total;
    cur.count += 1;
    map.set(day, cur);
  });
  return [...map.values()].sort((a, b) => b.day - a.day);
}

/** Máximo "redondo" para el eje del gráfico. */
export function niceMax(max: number): number {
  if (max <= 0) return 100_000;
  const unit = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  return Math.ceil(max / unit) * unit;
}
