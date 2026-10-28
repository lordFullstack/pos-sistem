/**
 * Convierte una copia de seguridad de la app en filas para las tablas de Supabase
 * (ver supabase/migrations). Lo usa scripts/migrar-a-supabase.ts. Sin dependencias del navegador.
 */
import type { CartLine } from '../types';
import type { BackupFile } from './backup';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s: string) => UUID_RE.test(s);

/**
 * Ids viejos (por ejemplo 'u-admin', 'espresso', 'M4') se convierten en un UUID estable:
 * el mismo id da siempre el mismo UUID, así se puede correr la migración varias veces sin duplicar.
 */
export async function toUuid(id: string, kind: string, businessId: string): Promise<string> {
  if (isUuid(id)) return id.toLowerCase();
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pos-moderno:${businessId}:${kind}:${id}`)));
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // versión 8 (UUID personalizado)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const iso = (ms: number | undefined) => (ms ? new Date(ms).toISOString() : null);

/** Orden en que hay que insertar las tablas para respetar las llaves foráneas. */
export const TABLE_ORDER = [
  'businesses', 'staff', 'categories', 'products', 'zones', 'dining_tables', 'orders', 'order_items',
  'sales', 'sale_items', 'cash_closures', 'inventory_items', 'inventory_moves', 'expenses',
] as const;
export type TableName = (typeof TABLE_ORDER)[number];

export interface UploadFile {
  path: string;
  contentType: string;
  base64: string;
}

export interface SupabaseImport {
  businessId: string;
  rows: Record<TableName, Record<string, unknown>[]>;
  uploads: UploadFile[];
}

export async function mapBackupToSupabase(file: BackupFile, businessId: string): Promise<SupabaseImport> {
  if (!isUuid(businessId)) throw new Error('El id del negocio debe ser un UUID.');
  const d = file.data;
  const b = businessId.toLowerCase();
  const id = (raw: string, kind: string) => toUuid(raw, kind, b);
  const uploads: UploadFile[] = [];

  // Mapas de ids viejos → nuevos para las llaves foráneas.
  const staffIds = new Map<string, string>();
  for (const u of d.users) staffIds.set(u.id, await id(u.id, 'staff'));
  const catIds = new Map<string, string>();
  for (const c of d.categories) catIds.set(c.id, await id(c.id, 'category'));
  const productIds = new Map<string, string>();
  for (const p of d.products) productIds.set(p.id, await id(p.id, 'product'));
  const zoneIds = new Map<string, string>();
  for (const z of d.zones) zoneIds.set(z.id, await id(z.id, 'zone'));
  const tableIds = new Map<string, string>();
  for (const t of d.tables) tableIds.set(t.id, await id(t.id, 'table'));
  const orderIds = new Map<string, string>();
  for (const o of d.orders) orderIds.set(o.id, await id(o.id, 'order'));
  const itemIds = new Map<string, string>();
  for (const i of d.inventory) itemIds.set(i.id, await id(i.id, 'inventory'));

  // Logo (data URL) → archivo en Storage.
  let logoPath: string | null = null;
  const logo = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(d.settings.logo || '');
  if (logo) {
    logoPath = `${b}/logo.${logo[1].includes('png') ? 'png' : 'jpg'}`;
    uploads.push({ path: logoPath, contentType: logo[1], base64: logo[2] });
  }

  const images = new Map((file.images ?? []).map((im) => [im.id, im]));
  const products = d.products.map((p) => {
    const pid = productIds.get(p.id)!;
    const img = p.imageId ? images.get(p.imageId) : undefined;
    const imagePath = img ? `${b}/${pid}.jpg` : null;
    if (img && imagePath) uploads.push({ path: imagePath, contentType: img.type || 'image/jpeg', base64: img.base64 });
    return {
      id: pid, business_id: b, category_id: catIds.get(p.cat) ?? null, name: p.name, description: p.desc, price: Math.round(p.price),
      icon: p.icon, tint: p.tint, image_path: imagePath, options: p.opts ?? [], active: p.active, sort: p.sort,
    };
  });

  const lineRows = async (lines: CartLine[], parentKey: string, parentCol: 'order_id' | 'sale_id', parentId: string, kind: string) =>
    Promise.all(lines.map(async (l, i) => ({
      id: await id(`${parentKey}:${i}`, kind), business_id: b, [parentCol]: parentId,
      product_id: productIds.get(l.productId) ?? null, line_key: l.key, name: l.name, note: l.note, unit_price: Math.round(l.unit), qty: l.qty,
    })));

  const orderItems: Record<string, unknown>[] = [];
  const orders = [];
  for (const o of d.orders) {
    const oid = orderIds.get(o.id)!;
    orders.push({
      id: oid, business_id: b, number: o.number, created_at: iso(o.createdAt), mode: o.mode, table_id: o.tableId ? tableIds.get(o.tableId) ?? null : null,
      customer: o.customer ?? null, status: o.status, paid: o.paid, note: o.note ?? null,
    });
    orderItems.push(...(await lineRows(o.lines, o.id, 'order_id', oid, 'order_item')));
  }

  const saleItems: Record<string, unknown>[] = [];
  const sales = [];
  for (const s of d.sales) {
    const sid = await id(s.id, 'sale');
    sales.push({
      id: sid, business_id: b, at: iso(s.at), subtotal: Math.round(s.subtotal), tax: Math.round(s.tax), total: Math.round(s.total), method: s.method,
      staff_id: staffIds.get(s.userId) ?? null, order_ids: s.orderIds.map((x) => orderIds.get(x)).filter(Boolean),
    });
    saleItems.push(...(await lineRows(s.lines, s.id, 'sale_id', sid, 'sale_item')));
  }

  const rows: SupabaseImport['rows'] = {
    businesses: [{
      id: b, name: d.settings.bizName, nit: d.settings.nit, biz_type: d.settings.bizType, accent: d.settings.accent, tax_mode: d.settings.tax,
      text_size: d.settings.textSize, receipt_footer: d.settings.footer, logo_path: logoPath, remind_backup: d.settings.remindBackup,
      next_order_number: d.nextOrderNumber,
    }],
    staff: d.users.map((u) => ({
      id: staffIds.get(u.id), business_id: b, name: u.name, email: u.email, role: u.role, active: u.active,
      pin_hash: u.pinHash ?? null, pin_salt: u.pinHash ? u.id : null,
    })),
    categories: d.categories.map((c) => ({ id: catIds.get(c.id), business_id: b, name: c.name, sort: c.sort })),
    products,
    zones: d.zones.map((z) => ({ id: zoneIds.get(z.id), business_id: b, name: z.name, sort: z.sort })),
    dining_tables: d.tables.map((t) => ({
      id: tableIds.get(t.id), business_id: b, label: t.label?.trim() || t.id, zone_id: zoneIds.get(t.zone) ?? null, seats: t.seats, pos_x: t.x, pos_y: t.y, status: t.status,
      guests: t.guests, waiter: t.waiter, opened_at: iso(t.openedAt), reservation_time: t.reserva?.time ?? null, reservation_note: t.reserva?.note ?? null,
    })),
    orders,
    order_items: orderItems,
    sales,
    sale_items: saleItems,
    cash_closures: await Promise.all(d.closures.map(async (c) => ({
      id: await id(c.id, 'closure'), business_id: b, at: iso(c.at), staff_id: staffIds.get(c.userId) ?? null,
      expected_cash: Math.round(c.expectedCash), counted_cash: Math.round(c.countedCash), sales_count: c.salesCount, sales_total: Math.round(c.salesTotal),
    }))),
    inventory_items: d.inventory.map((i) => ({
      id: itemIds.get(i.id), business_id: b, name: i.name, category: i.cat, unit: i.unit, stock: i.stock, min_stock: i.min, used_in: i.usedIn,
    })),
    inventory_moves: await Promise.all(d.inventoryMoves.filter((m) => itemIds.has(m.itemId)).map(async (m) => ({
      id: await id(m.id, 'inventory_move'), business_id: b, item_id: itemIds.get(m.itemId), at: iso(m.at), label: m.label, delta: m.delta,
    }))),
    expenses: await Promise.all(d.expenses.map(async (e) => ({
      id: await id(e.id, 'expense'), business_id: b, at: iso(e.at), concept: e.concept, category: e.cat, amount: Math.round(e.value), method: e.method,
    }))),
  };

  return { businessId: b, rows, uploads };
}
