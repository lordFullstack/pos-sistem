import { describe, expect, it } from 'vitest';
import { makeBackup, parseBackup, toCsv } from './backup';
import { demoData, emptyData } from '../data/initial';
import { BIZ_TYPES } from '../data/catalogs';

describe('copias de seguridad', () => {
  it('una copia se puede volver a leer completa', () => {
    const data = demoData('resto', 'Mi Restaurante', 'Laura', new Date(2026, 9, 24, 15).getTime());
    const file = parseBackup(JSON.stringify(makeBackup(data, 'Laura')));
    expect(file.data.settings.bizName).toBe('Mi Restaurante');
    expect(file.data.sales.length).toBe(data.sales.length);
    expect(file.data.tables.length).toBe(16);
  });

  it('rechaza archivos que no son copias del POS', () => {
    expect(() => parseBackup('no es json')).toThrow('no se pudo leer');
    expect(() => parseBackup(JSON.stringify({ app: 'otra' }))).toThrow('no es una copia de POS Moderno');
    const broken = makeBackup(emptyData('cafe', '', ''), '');
    (broken.data as unknown as Record<string, unknown>).sales = null;
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('incompleta');
  });

  it('una copia de la versión anterior se pone al día con el menú de su tipo de negocio', () => {
    const v2 = emptyData('helado', 'Heladería Vieja', 'Ana');
    const { categories: _c, products: _p, closures: _x, ...rest } = v2;
    const v1 = { app: 'pos-moderno', createdAt: 1, createdBy: 'Ana', data: { ...rest, version: 1 } };
    const f = parseBackup(JSON.stringify(v1));
    expect(f.data.version).toBe(3);
    expect(f.data.zones.map((z) => z.name)).toEqual(['Salón principal', 'Terraza']);
    expect(f.data.products.find((p) => p.id === 'cono')?.active).toBe(true);
    expect(f.data.categories.map((c) => c.name)).toContain('Paletas');
    expect(f.data.closures).toEqual([]);
    expect(f.images).toEqual([]);
  });

  it('el CSV escapa punto y coma y comillas', () => {
    expect(toCsv([['a;b', 'c"d', 3]])).toBe('﻿"a;b";"c""d";3');
  });
});

describe('datos de ejemplo', () => {
  it.each(BIZ_TYPES)('se generan para %s con ventas, gastos y sin precios negativos', (type) => {
    const d = demoData(type, '', '', new Date(2026, 9, 24, 15).getTime());
    expect(d.sales.length).toBeGreaterThan(500);
    expect(d.expenses.length).toBeGreaterThan(5);
    expect(d.sales.every((s) => s.total > 0 && s.lines.length > 0)).toBe(true);
    expect(d.users.filter((u) => u.role === 'admin' && u.active)).toHaveLength(1);
    expect(d.tables.length > 0).toBe(type === 'resto');
  });
});
