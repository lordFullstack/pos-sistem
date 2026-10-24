import { describe, expect, it } from 'vitest';
import type { Sale } from '../types';
import { buckets, change, niceMax, paySplit, rangeFor, summarize, topProducts } from './stats';
import { moneyShort, money } from './format';

const NOW = new Date(2026, 9, 24, 15, 30).getTime(); // 24 oct 2026, 3:30 p. m.
const at = (d: number, h: number) => new Date(2026, 9, d, h, 10).getTime();
const sale = (ts: number, total: number, method: Sale['method'] = 'efectivo', name = 'Latte'): Sale => ({
  id: String(ts) + total, at: ts, orderIds: [], subtotal: total, tax: 0, total, method, userId: 'u',
  lines: [{ key: name, productId: name, name, note: '', unit: total, qty: 1 }],
});

describe('reportes', () => {
  const sales = [sale(at(24, 8), 10000), sale(at(24, 8), 5000, 'tarjeta'), sale(at(24, 13), 20000, 'tarjeta', 'Churrasco'), sale(at(23, 9), 7000), sale(at(1, 9), 3000)];

  it('agrupa las ventas de hoy por hora', () => {
    const b = buckets('hoy', sales, NOW);
    expect(b.find((x) => x.label === '8:00')!.value).toBe(15000);
    expect(b.find((x) => x.label === '13:00')!.value).toBe(20000);
    expect(b.reduce((a, x) => a + x.value, 0)).toBe(35000);
  });

  it('agrupa los últimos 7 días y el mes por semanas', () => {
    expect(buckets('semana', sales, NOW).reduce((a, x) => a + x.value, 0)).toBe(42000);
    const mes = buckets('mes', sales, NOW);
    expect(mes[0].label).toBe('Semana 1');
    expect(mes.reduce((a, x) => a + x.value, 0)).toBe(45000);
  });

  it('compara hoy contra ayer hasta la misma hora', () => {
    const r = rangeFor('hoy', NOW);
    expect(r.end - r.start).toBe(86_400_000);
    expect(r.prevStart).toBe(r.start - 86_400_000);
    expect(new Date(r.prevEnd).getHours()).toBe(15);
    expect(new Date(r.prevEnd).getMinutes()).toBe(30);
    expect(change(35000, 7000)).toBe(400);
    expect(change(5, 0)).toBeNull();
  });

  it('resume, ordena productos y separa medios de pago', () => {
    expect(summarize(sales.slice(0, 3))).toMatchObject({ total: 35000, count: 3 });
    expect(topProducts(sales)[0]).toEqual({ name: 'Latte', qty: 4, value: 25000 });
    expect(paySplit(sales)).toEqual({ efectivo: 20000, tarjeta: 25000, transferencia: 0 });
  });

  it('redondea el eje del gráfico', () => {
    expect(niceMax(214000)).toBe(250000);
    expect(niceMax(0)).toBe(100000);
  });
});

describe('formato de pesos', () => {
  it('usa punto de miles', () => {
    expect(money(1568000)).toBe('$1.568.000');
    expect(money(-4500)).toBe('−$4.500');
    expect(moneyShort(1568000)).toBe('$1,6 M');
    expect(moneyShort(250000)).toBe('$250 mil');
  });
});
