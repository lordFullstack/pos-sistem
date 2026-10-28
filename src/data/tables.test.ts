import { describe, expect, it } from 'vitest';
import { FLOOR_H, FLOOR_W, clampToFloor, ensureZones, freeSpot, seedTables, tableGeom, tableLabel, zoneName } from './tables';

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('plano de mesas', () => {
  it('muestra el nombre propio o, si no tiene, el id', () => {
    expect(tableLabel({ id: 'M4' })).toBe('M4');
    expect(tableLabel({ id: 'abc', label: ' Barra 2 ' })).toBe('Barra 2');
    expect(tableLabel({ id: 'abc', label: '  ' })).toBe('abc');
  });

  it('ubica una mesa nueva sin montarla sobre las que ya están', () => {
    const salon = seedTables().filter((t) => t.zone === 'salon');
    for (const seats of [2, 4, 6]) {
      const spot = { ...freeSpot(salon, seats), ...tableGeom(seats) };
      expect(spot.x + spot.w).toBeLessThanOrEqual(FLOOR_W);
      expect(spot.y + spot.h).toBeLessThanOrEqual(FLOOR_H);
      for (const t of salon) expect(overlaps(spot, { x: t.x, y: t.y, ...tableGeom(t.seats) })).toBe(false);
    }
  });

  it('al poner al día datos viejos crea las zonas, sin perder ninguna que usen las mesas', () => {
    const tables = [...seedTables(), { ...seedTables()[0], id: 'X1', zone: 'piso2' }];
    const zones = ensureZones(undefined, tables);
    expect(zones.map((z) => z.id)).toEqual(['salon', 'terraza', 'piso2']);
    expect(zoneName(zones, 'terraza')).toBe('Terraza');
    // Una zona renombrada se respeta.
    expect(ensureZones([{ id: 'salon', name: 'Primer piso', sort: 0 }], [])[0].name).toBe('Primer piso');
  });

  it('en una zona vacía la pone arriba a la izquierda', () => {
    expect(freeSpot([], 4)).toEqual({ x: 24, y: 24 });
  });

  it('al moverla la deja dentro del plano y alineada a 10 px', () => {
    expect(clampToFloor(-50, -50, 4)).toEqual({ x: 20, y: 20 });
    const g = tableGeom(6);
    const far = clampToFloor(5000, 5000, 6);
    expect(far.x + g.w).toBeLessThanOrEqual(FLOOR_W - 20);
    expect(far.y + g.h).toBeLessThanOrEqual(FLOOR_H - 20);
    expect(far.x % 10).toBe(0);
    expect(far.y % 10).toBe(0);
    expect(clampToFloor(123, 296, 2)).toEqual({ x: 120, y: 300 });
    expect(clampToFloor(123, 456, 2)).toEqual({ x: 120, y: 440 });
  });
});
