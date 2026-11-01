import type { CartLine, Order, Refund, Sale } from '../types';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Devolución de una orden cobrada. Usa el impuesto con el que se cobró la venta.
 * Si es la última orden de la venta sin devolver, devuelve exactamente lo que queda
 * (así una venta cancelada completa queda en $0 sin diferencias por redondeo).
 */
export function refundFor(sale: Sale, order: Order, userId: string, now = Date.now()): Refund {
  const done = sale.refunds ?? [];
  const pending = sale.orderIds.filter((id) => id !== order.id && !done.some((r) => r.orderId === id));
  let subtotal: number;
  let tax: number;
  if (pending.length === 0) {
    subtotal = sale.subtotal - sum(done.map((r) => r.subtotal));
    tax = sale.tax - sum(done.map((r) => r.tax));
  } else {
    subtotal = sum(order.lines.map((l) => l.unit * l.qty));
    tax = sale.subtotal ? Math.round((subtotal * sale.tax) / sale.subtotal) : 0;
  }
  return { orderId: order.id, at: now, lines: order.lines, subtotal, tax, total: subtotal + tax, userId };
}

/** Lo que queda de una venta después de sus devoluciones. */
export function netSale(s: Sale): Sale {
  if (!s.refunds?.length) return s;
  const left = new Map<string, number>();
  s.refunds.forEach((r) => r.lines.forEach((l) => left.set(l.key, (left.get(l.key) ?? 0) + l.qty)));
  const lines: CartLine[] = [];
  s.lines.forEach((l) => {
    const out = Math.min(l.qty, left.get(l.key) ?? 0);
    left.set(l.key, (left.get(l.key) ?? 0) - out);
    if (l.qty - out > 0) lines.push({ ...l, qty: l.qty - out });
  });
  return {
    ...s,
    lines,
    subtotal: s.subtotal - sum(s.refunds.map((r) => r.subtotal)),
    tax: s.tax - sum(s.refunds.map((r) => r.tax)),
    total: s.total - sum(s.refunds.map((r) => r.total)),
  };
}

/** Ventas para reportes y contabilidad: con devoluciones descontadas y sin las anuladas por completo. */
export function netSales(sales: Sale[]): Sale[] {
  return sales.map(netSale).filter((s) => !s.refunds?.length || s.lines.length > 0);
}
