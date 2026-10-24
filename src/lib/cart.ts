import type { CartLine, OptionGroup, ProductTemplate as Product, Selection, TaxMode } from '../types';
import { TAX } from './format';

/** Selección inicial: la primera opción en grupos de "elige 1", nada en los demás. */
export function defaultSelection(p: Product): Selection {
  const sel: Selection = {};
  (p.opts ?? []).forEach((g, gi) => {
    sel[gi] = g.type === 'one' ? [0] : [];
  });
  return sel;
}

/** Máximo de elecciones de un grupo, resolviendo 'scoops' con el tamaño elegido. */
export function maxFor(p: Product, sel: Selection, g: OptionGroup): number {
  if (g.max !== 'scoops') return g.max;
  const sizeGroup = p.opts?.[0];
  const idx = (sel[0] ?? [0])[0] ?? 0;
  return sizeGroup?.choices[idx]?.scoops ?? 1;
}

/** Cambia una opción respetando "elige 1", el máximo y recortando sabores si bajan las bolas. */
export function toggleOption(p: Product, sel: Selection, gi: number, ci: number): Selection {
  const groups = p.opts ?? [];
  const g = groups[gi];
  if (!g) return sel;
  const next: Selection = { ...sel };
  if (g.type === 'one') {
    next[gi] = [ci];
  } else {
    const cur = [...(next[gi] ?? [])];
    const at = cur.indexOf(ci);
    if (at >= 0) cur.splice(at, 1);
    else if (cur.length < maxFor(p, next, g)) cur.push(ci);
    next[gi] = cur;
  }
  groups.forEach((og, ogi) => {
    if (og.max === 'scoops') next[ogi] = (next[ogi] ?? []).slice(0, maxFor(p, next, og));
  });
  return next;
}

export function missingGroups(p: Product, sel: Selection): string[] {
  return (p.opts ?? []).filter((g, gi) => g.min > 0 && (sel[gi] ?? []).length < g.min).map((g) => g.name);
}

export function unitPrice(p: Product, sel: Selection): number {
  let unit = p.price;
  (p.opts ?? []).forEach((g, gi) => (sel[gi] ?? []).forEach((ci) => (unit += g.choices[ci]?.add ?? 0)));
  return unit;
}

export function selectionNote(p: Product, sel: Selection): string {
  const parts: string[] = [];
  (p.opts ?? []).forEach((g, gi) => {
    const chosen = sel[gi] ?? [];
    if (chosen.length) parts.push(chosen.map((ci) => g.choices[ci]?.label).join(', '));
  });
  return parts.join(' · ');
}

export function buildLine(p: Product, sel: Selection, qty = 1): CartLine {
  const clean: Selection = {};
  Object.keys(sel).forEach((k) => {
    clean[Number(k)] = [...(sel[Number(k)] ?? [])].sort((a, b) => a - b);
  });
  return {
    key: p.id + '|' + JSON.stringify(clean),
    productId: p.id,
    name: p.name,
    note: selectionNote(p, clean),
    unit: unitPrice(p, clean),
    qty,
  };
}

/** Agrega una línea; si ya existe una idéntica (mismo producto y opciones) suma la cantidad. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const i = lines.findIndex((l) => l.key === line.key);
  if (i < 0) return [...lines, line];
  const copy = [...lines];
  copy[i] = { ...copy[i], qty: copy[i].qty + line.qty };
  return copy;
}

export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  return lines.map((l) => (l.key === key ? { ...l, qty } : l)).filter((l) => l.qty > 0);
}

/** Une líneas de varias órdenes (por ejemplo, todo lo de una mesa) en una sola lista. */
export function mergeLines(groups: CartLine[][]): CartLine[] {
  return groups.flat().reduce<CartLine[]>((acc, l) => addLine(acc, { ...l }), []);
}

export interface Totals {
  subtotal: number;
  tax: number;
  total: number;
  units: number;
}

export function totals(lines: CartLine[], tax: TaxMode): Totals {
  const subtotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const t = Math.round(subtotal * TAX[tax].rate);
  return { subtotal, tax: t, total: subtotal + t, units: lines.reduce((a, l) => a + l.qty, 0) };
}
