import { describe, expect, it } from 'vitest';
import type { CartLine, Order, Sale } from '../types';
import { netSale, netSales, refundFor } from './refunds';

const line = (key: string, unit: number, qty: number): CartLine => ({ key, productId: key, name: key, note: '', unit, qty });
const order = (id: string, lines: CartLine[]): Order => ({ id, number: 1, createdAt: 0, mode: 'mesa', lines, status: 'pendiente', paid: true });
const sale = (orderIds: string[], lines: CartLine[], rate = 0.08): Sale => {
  const subtotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const tax = Math.round(subtotal * rate);
  return { id: 's1', at: 0, orderIds, lines, subtotal, tax, total: subtotal + tax, method: 'efectivo', userId: 'u' };
};

describe('devoluciones', () => {
  it('una venta cancelada completa queda en cero y sale de los reportes', () => {
    const o = order('o1', [line('cafe', 4500, 2)]);
    const s = sale(['o1'], o.lines);
    const r = refundFor(s, o, 'u');
    expect(r.total).toBe(s.total);
    const withRefund = { ...s, refunds: [r] };
    expect(netSale(withRefund).total).toBe(0);
    expect(netSales([withRefund])).toHaveLength(0);
  });

  it('en una mesa con dos comandas devuelve solo la cancelada, con el impuesto del cobro', () => {
    const a = order('a', [line('sopa', 24000, 1)]);
    const b = order('b', [line('cerveza', 7000, 2)]);
    const s = sale(['a', 'b'], [...a.lines, ...b.lines]);
    const r1 = refundFor(s, b, 'u');
    expect(r1.subtotal).toBe(14000);
    expect(r1.tax).toBe(1120);
    const after1 = { ...s, refunds: [r1] };
    const net = netSale(after1);
    expect(net.total).toBe(24000 + 1920);
    expect(net.lines.map((l) => l.key)).toEqual(['sopa']);
    // La última devuelve exactamente lo que queda.
    const r2 = refundFor(after1, a, 'u');
    expect(r1.total + r2.total).toBe(s.total);
  });

  it('descuenta cantidades cuando la misma línea venía de varias comandas', () => {
    const a = order('a', [line('cerveza', 7000, 1)]);
    const b = order('b', [line('cerveza', 7000, 2)]);
    const s = sale(['a', 'b'], [line('cerveza', 7000, 3)]);
    const net = netSale({ ...s, refunds: [refundFor(s, b, 'u')] });
    expect(net.lines).toEqual([line('cerveza', 7000, 1)]);
    expect(a.lines[0].qty).toBe(1);
  });

  it('las ventas sin devoluciones quedan iguales', () => {
    const s = sale(['o1'], [line('cafe', 4500, 1)]);
    expect(netSale(s)).toBe(s);
    expect(netSales([s])).toEqual([s]);
  });
});
