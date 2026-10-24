import { describe, expect, it } from 'vitest';
import { CATALOGS } from '../data/catalogs';
import { addLine, buildLine, defaultSelection, maxFor, mergeLines, missingGroups, setLineQty, toggleOption, totals, unitPrice } from './cart';

const cono = CATALOGS.helado.items.find((p) => p.id === 'cono')!;
const cappuccino = CATALOGS.cafe.items.find((p) => p.id === 'cappuccino')!;
const tostada = CATALOGS.cafe.items.find((p) => p.id === 'tostada')!;

describe('opciones de producto', () => {
  it('elige la primera opción en grupos de "elige 1"', () => {
    expect(defaultSelection(cono)).toEqual({ 0: [0], 1: [], 2: [] });
  });

  it('pide al menos un sabor antes de agregar el helado', () => {
    expect(missingGroups(cono, defaultSelection(cono))).toEqual(['Sabores']);
  });

  it('no deja elegir más sabores que bolas', () => {
    let sel = defaultSelection(cono); // 1 bola
    sel = toggleOption(cono, sel, 1, 0);
    sel = toggleOption(cono, sel, 1, 1); // ignorado: solo 1 bola
    expect(sel[1]).toEqual([0]);
    sel = toggleOption(cono, sel, 0, 2); // 3 bolas
    expect(maxFor(cono, sel, cono.opts![1])).toBe(3);
    sel = toggleOption(cono, sel, 1, 1);
    sel = toggleOption(cono, sel, 1, 2);
    expect(sel[1]).toEqual([0, 1, 2]);
  });

  it('recorta los sabores si bajan las bolas', () => {
    let sel = toggleOption(cono, defaultSelection(cono), 0, 2);
    sel = toggleOption(cono, sel, 1, 0);
    sel = toggleOption(cono, sel, 1, 1);
    sel = toggleOption(cono, sel, 1, 2);
    sel = toggleOption(cono, sel, 0, 0); // vuelve a 1 bola
    expect(sel[1]).toEqual([0]);
  });

  it('suma los adicionales al precio', () => {
    let sel = toggleOption(cono, defaultSelection(cono), 0, 1); // 2 bolas +3.500
    sel = toggleOption(cono, sel, 1, 2);
    sel = toggleOption(cono, sel, 2, 0); // chispas +1.000
    expect(unitPrice(cono, sel)).toBe(5500 + 3500 + 1000);
    expect(buildLine(cono, sel).note).toBe('2 bolas · Fresa · Chispas');
  });
});

describe('carrito', () => {
  it('junta líneas iguales y separa las que tienen otras opciones', () => {
    const entera = buildLine(cappuccino, { 0: [0], 1: [0] });
    const almendras = buildLine(cappuccino, { 0: [2], 1: [0] });
    let lines = addLine([], entera);
    lines = addLine(lines, buildLine(cappuccino, { 1: [0], 0: [0] }));
    lines = addLine(lines, almendras);
    expect(lines).toHaveLength(2);
    expect(lines[0].qty).toBe(2);
    expect(lines[1].unit).toBe(8500);
  });

  it('quita la línea cuando la cantidad llega a cero', () => {
    const l = buildLine(tostada, {});
    expect(setLineQty([l], l.key, 0)).toEqual([]);
  });

  it('calcula impoconsumo, IVA y sin impuesto', () => {
    const lines = [buildLine(cappuccino, { 0: [0], 1: [0] }), buildLine(tostada, {}), { ...buildLine(tostada, {}), key: 'x', unit: 7000 }];
    expect(totals(lines, 'impo')).toEqual({ subtotal: 26000, tax: 2080, total: 28080, units: 3 });
    expect(totals(lines, 'iva').tax).toBe(4940);
    expect(totals(lines, 'none').total).toBe(26000);
  });

  it('une el pedido de varias comandas de una mesa', () => {
    const a = buildLine(tostada, {});
    expect(mergeLines([[a], [{ ...a, qty: 2 }]])[0].qty).toBe(3);
  });
});
