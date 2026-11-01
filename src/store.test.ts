import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CartLine } from './types';
import { useStore } from './store';
import { emptyData } from './data/initial';
import { SaveError, useSaveStatus } from './lib/safeStorage';
import { netSales } from './lib/refunds';

const line = (key: string, unit: number, qty = 1): CartLine => ({ key, productId: key, name: key, note: '', unit, qty });
const st = () => useStore.getState();

/** localStorage que siempre está lleno, como una tablet sin espacio. */
const fullStorage = {
  getItem: () => null,
  setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
  removeItem: () => {},
};

beforeEach(() => {
  st().load(emptyData('resto', 'Prueba', 'Admin'));
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('memoria llena', () => {
  it('un cobro que no se puede guardar no queda registrado y avisa', () => {
    const before = { sales: st().sales.length, orders: st().orders.length, next: st().nextOrderNumber };
    (globalThis as { localStorage?: unknown }).localStorage = fullStorage;
    expect(() => st().checkout({ lines: [line('cafe', 4500)], method: 'efectivo', mode: 'llevar' })).toThrow(SaveError);
    expect({ sales: st().sales.length, orders: st().orders.length, next: st().nextOrderNumber }).toEqual(before);
    expect(useSaveStatus.getState().ok).toBe(false);
  });

  it('una comanda o el cobro de una mesa tampoco quedan a medias', () => {
    st().sendToKitchen({ lines: [line('sopa', 24000)], tableId: 'M1' });
    st().requestBill('M1');
    (globalThis as { localStorage?: unknown }).localStorage = fullStorage;
    expect(() => st().chargeTable('M1', 'tarjeta')).toThrow(SaveError);
    expect(st().tables.find((t) => t.id === 'M1')?.status).toBe('cuenta');
    expect(st().orders.every((o) => !o.paid)).toBe(true);
  });
});

describe('cancelar órdenes', () => {
  it('cancelar una orden pagada registra la devolución y la saca de las ventas netas', () => {
    const o = st().checkout({ lines: [line('cafe', 4500, 2)], method: 'efectivo', mode: 'llevar' });
    const refund = st().cancelOrder(o.id);
    expect(refund?.total).toBe(9720);
    expect(st().orders.find((x) => x.id === o.id)?.status).toBe('cancelada');
    expect(netSales(st().sales)).toHaveLength(0);
    // Cancelar otra vez no devuelve dos veces.
    expect(st().cancelOrder(o.id)).toBeNull();
    expect(st().sales[0].refunds).toHaveLength(1);
  });

  it('anular una comanda de mesa sin pagar la quita de la cuenta', () => {
    const a = st().sendToKitchen({ lines: [line('sopa', 24000)], tableId: 'M1' });
    st().sendToKitchen({ lines: [line('cerveza', 7000)], tableId: 'M1' });
    expect(st().cancelOrder(a.id)).toBeNull();
    st().requestBill('M1');
    expect(st().chargeTable('M1', 'efectivo')).toBe(7560);
    expect(st().sales[st().sales.length - 1].orderIds).toHaveLength(1);
  });
});
