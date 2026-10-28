import { describe, expect, it } from 'vitest';
import { demoData } from '../data/initial';
import { makeBackup, parseBackup } from './backup';
import { isUuid, mapBackupToSupabase, TABLE_ORDER, toUuid } from './supabaseMap';
import { hashPin } from './pin';

const BIZ = '2f1c7a9e-4b5d-4e3f-9a8b-1c2d3e4f5a6b';
const NOW = new Date(2026, 9, 24, 15).getTime();

async function sample() {
  const data = demoData('resto', 'Mi Restaurante', 'Laura', NOW, await hashPin('u-admin', '5813'));
  data.products[0] = { ...data.products[0], imageId: 'img-1' };
  data.closures = [{ id: 'c1', at: NOW, userId: 'u-admin', expectedCash: 100000, countedCash: 98000, salesCount: 10, salesTotal: 300000 }];
  const file = makeBackup(data, 'Laura', [{ id: 'img-1', type: 'image/jpeg', base64: 'AAAA' }]);
  return parseBackup(JSON.stringify(file));
}

describe('migración a Supabase', () => {
  it('convierte ids viejos en UUID estables y respeta los que ya lo son', async () => {
    const a = await toUuid('u-admin', 'staff', BIZ);
    expect(isUuid(a)).toBe(true);
    expect(await toUuid('u-admin', 'staff', BIZ)).toBe(a);
    expect(await toUuid('u-admin', 'product', BIZ)).not.toBe(a);
    expect(await toUuid(BIZ.toUpperCase(), 'x', BIZ)).toBe(BIZ);
  });

  it('arma todas las tablas con llaves que apuntan a filas existentes', async () => {
    const { rows } = await mapBackupToSupabase(await sample(), BIZ);
    expect(Object.keys(rows)).toEqual([...TABLE_ORDER]);
    const ids = (t: keyof typeof rows) => new Set(rows[t].map((r) => r.id));

    for (const t of TABLE_ORDER) {
      for (const r of rows[t]) {
        expect(isUuid(String(r.id))).toBe(true);
        if (t !== 'businesses') expect(r.business_id).toBe(BIZ);
      }
    }
    const cats = ids('categories');
    rows.products.forEach((p) => expect(cats.has(p.category_id)).toBe(true));
    const orders = ids('orders');
    rows.order_items.forEach((i) => expect(orders.has(i.order_id)).toBe(true));
    const sales = ids('sales');
    rows.sale_items.forEach((i) => expect(sales.has(i.sale_id)).toBe(true));
    const zones = ids('zones');
    expect(rows.zones.map((z) => z.name)).toEqual(['Salón principal', 'Terraza']);
    rows.dining_tables.forEach((t) => expect(zones.has(t.zone_id)).toBe(true));
    const tables = ids('dining_tables');
    rows.orders.filter((o) => o.table_id).forEach((o) => expect(tables.has(o.table_id)).toBe(true));
    const staff = ids('staff');
    rows.sales.forEach((s) => expect(s.staff_id === null || staff.has(s.staff_id)).toBe(true));

    const itemCount = (await sample()).data.sales.reduce((a, s) => a + s.lines.length, 0);
    expect(rows.sale_items).toHaveLength(itemCount);
    expect(rows.dining_tables.map((t) => t.label)).toContain('M4');
    expect(rows.cash_closures[0]).toMatchObject({ expected_cash: 100000, counted_cash: 98000 });
  });

  it('conserva el PIN con su sal y sube la foto del producto', async () => {
    const { rows, uploads } = await mapBackupToSupabase(await sample(), BIZ);
    const admin = rows.staff.find((s) => s.role === 'admin')!;
    expect(admin.pin_salt).toBe('u-admin');
    expect(admin.pin_hash).toBe(await hashPin('u-admin', '5813'));
    const withPhoto = rows.products.find((p) => p.image_path)!;
    expect(withPhoto.image_path).toBe(`${BIZ}/${withPhoto.id}.jpg`);
    expect(uploads).toEqual([{ path: withPhoto.image_path, contentType: 'image/jpeg', base64: 'AAAA' }]);
  });

  it('rechaza un id de negocio que no es UUID', async () => {
    await expect(mapBackupToSupabase(await sample(), 'mi-negocio')).rejects.toThrow('UUID');
  });
});
