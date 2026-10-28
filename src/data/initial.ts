import type { AppData, BizType, CartLine, DiningTable, Expense, Order, PayMethod, ProductTemplate as Product, Sale, Selection, User } from '../types';
import { CATALOGS, seedMenu } from './catalogs';
import { seedInventory } from './inventory';
import { DEFAULT_ZONES, ensureZones, seedTables } from './tables';
import { buildLine, defaultSelection, maxFor, totals } from '../lib/cart';
import { startOfDay } from '../lib/stats';

/** Id fijo del primer administrador (el resumen del PIN depende del id). */
export const ADMIN_ID = 'u-admin';

export function emptyData(type: BizType, bizName: string, adminName: string, adminPinHash?: string): AppData {
  const admin: User = { id: ADMIN_ID, name: adminName || 'Administrador', email: '', role: 'admin', active: true, pinHash: adminPinHash };
  return {
    version: 3,
    zones: DEFAULT_ZONES.map((z) => ({ ...z })),
    ...seedMenu(type),
    closures: [],
    settings: {
      onboarded: true,
      bizType: type,
      bizName: bizName || CATALOGS[type].defaultName,
      nit: '',
      accent: '#1F5F45',
      tax: 'impo',
      textSize: 'normal',
      footer: '¡Gracias por tu visita!',
      logo: '',
      remindBackup: true,
      currentUserId: admin.id,
    },
    users: [admin],
    orders: [],
    sales: [],
    tables: CATALOGS[type].hasTables ? seedTables() : [],
    inventory: seedInventory(type),
    inventoryMoves: [],
    expenses: [],
    nextOrderNumber: 1,
  };
}

/**
 * Pone al día datos guardados con una versión anterior de la app.
 * v1 → v2: el menú pasa a ser editable (se copia la plantilla del tipo de negocio) y se agregan los cierres de caja.
 * v2 → v3: las zonas de mesas se guardan como datos (Salón principal y Terraza al principio).
 */
export function upgradeData(raw: unknown): AppData {
  // Datos de cualquier versión: se tipan sueltos hasta terminar de ponerlos al día.
  type Loose = Omit<Partial<AppData>, 'version'> & { version?: number };
  let d: Loose = { ...(raw as Loose) };
  if (!d.version || d.version < 2) {
    d = { ...d, ...seedMenu(d.settings?.bizType ?? 'cafe'), closures: [], version: 2 };
  }
  if (d.version === 2) d = { ...d, zones: ensureZones(undefined, d.tables ?? []), version: 3 };
  return d as AppData;
}

/** Generador pseudoaleatorio con semilla: los datos de ejemplo salen igual cada vez. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSelection(p: Product, r: () => number): Selection {
  const sel = defaultSelection(p);
  (p.opts ?? []).forEach((g, gi) => {
    if (g.type === 'one') {
      sel[gi] = [Math.floor(r() * g.choices.length)];
    } else {
      const max = maxFor(p, sel, g);
      const want = Math.max(g.min, Math.min(max, Math.floor(r() * (max + 1))));
      const picks: number[] = [];
      while (picks.length < want) {
        const ci = Math.floor(r() * g.choices.length);
        if (!picks.includes(ci)) picks.push(ci);
      }
      sel[gi] = picks;
    }
  });
  return sel;
}

const HOUR_WEIGHTS: [number, number][] = [
  [7, 4], [8, 9], [9, 10], [10, 7], [11, 6], [12, 9], [13, 9], [14, 6], [15, 5], [16, 6], [17, 6], [18, 5], [19, 4], [20, 2],
];

function pickHour(r: () => number): number {
  const sum = HOUR_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let x = r() * sum;
  for (const [h, w] of HOUR_WEIGHTS) {
    if ((x -= w) <= 0) return h;
  }
  return 12;
}

function pickMethod(r: () => number): PayMethod {
  const x = r();
  if (x < 0.48) return 'tarjeta';
  if (x < 0.82) return 'efectivo';
  return 'transferencia';
}

export function demoData(type: BizType, bizName: string, adminName: string, now = Date.now(), adminPinHash?: string): AppData {
  const data = emptyData(type, bizName, adminName, adminPinHash);
  const cat = CATALOGS[type];
  const r = rng(20261024);
  const users: User[] = [
    { id: ADMIN_ID, name: adminName || 'Laura Gómez', email: 'laura@minegocio.co', role: 'admin', active: true, pinHash: adminPinHash },
    { id: 'u-andres', name: 'Andrés Ruiz', email: 'andres@minegocio.co', role: 'cajero', active: true },
    { id: 'u-sofia', name: 'Sofía Martínez', email: 'sofia@minegocio.co', role: 'barista', active: true },
    { id: 'u-camilo', name: 'Camilo Díaz', email: 'camilo@minegocio.co', role: 'cajero', active: false },
  ];
  data.users = users;

  const today = startOfDay(now);
  const nowHour = new Date(now).getHours();
  const sales: Sale[] = [];
  const lines = (): CartLine[] => {
    const n = 1 + Math.floor(r() * 3);
    let out: CartLine[] = [];
    for (let i = 0; i < n; i++) {
      const p = cat.items[Math.floor(r() * cat.items.length)];
      const line = buildLine(p, randomSelection(p, r), r() < 0.2 ? 2 : 1);
      const at = out.findIndex((l) => l.key === line.key);
      if (at >= 0) out[at] = { ...out[at], qty: out[at].qty + line.qty };
      else out = [...out, line];
    }
    return out;
  };

  for (let d = 40; d >= 0; d--) {
    const dayStart = today - d * 86_400_000;
    const dow = new Date(dayStart).getDay();
    const base = dow === 5 || dow === 6 ? 46 : dow === 0 ? 38 : 30;
    const count = base + Math.floor(r() * 12);
    for (let i = 0; i < count; i++) {
      const h = pickHour(r);
      if (d === 0 && h >= nowHour) continue;
      const at = dayStart + h * 3_600_000 + Math.floor(r() * 3_600_000);
      const ls = lines();
      const t = totals(ls, 'impo');
      sales.push({
        id: `s${sales.length}`, at, orderIds: [], lines: ls,
        subtotal: t.subtotal, tax: t.tax, total: t.total, method: pickMethod(r),
        userId: r() < 0.6 ? 'u-andres' : 'u-admin',
      });
    }
  }
  sales.sort((a, b) => a.at - b.at);
  data.sales = sales;

  // Gastos de este mes y el anterior, proporcionales a las ventas.
  const monthSales = sales.filter((s) => s.at >= today - 30 * 86_400_000).reduce((a, s) => a + s.total, 0);
  const expenses: Expense[] = [];
  const d0 = new Date(now);
  for (let m = 1; m >= 0; m--) {
    const y = d0.getFullYear();
    const mo = d0.getMonth() - m;
    const day = (n: number) => new Date(y, mo, n, 10).getTime();
    const add = (n: number, concept: string, c: Expense['cat'], v: number, method: PayMethod) => {
      const at = day(n);
      if (at <= now) expenses.push({ id: `e${expenses.length}`, at, concept, cat: c, value: Math.round(v / 1000) * 1000, method });
    };
    add(1, 'Arriendo del local', 'arriendo', monthSales * 0.1, 'transferencia');
    add(15, 'Quincena de nómina', 'nomina', monthSales * 0.11, 'transferencia');
    add(30, 'Quincena de nómina', 'nomina', monthSales * 0.11, 'transferencia');
    add(10, 'Pago de energía', 'servicios', monthSales * 0.015, 'transferencia');
    add(12, 'Agua e internet', 'servicios', monthSales * 0.012, 'transferencia');
    [3, 9, 16, 22, 28].forEach((n, i) => add(n, i % 2 ? 'Compra de insumos frescos' : 'Compra a proveedor principal', 'insumos', monthSales * (0.05 + r() * 0.03), i % 2 ? 'efectivo' : 'transferencia'));
    add(18, 'Mantenimiento de equipos', 'otros', monthSales * 0.01, 'efectivo');
  }
  data.expenses = expenses.sort((a, b) => a.at - b.at);

  // Órdenes abiertas de hoy para el tablero de cocina.
  const orders: Order[] = [];
  let number = 140;
  const mk = (mins: number, mode: Order['mode'], status: Order['status'], paid: boolean, extra: Partial<Order> = {}): Order => ({
    id: `o${number}`, number: number++, createdAt: now - mins * 60_000, mode, status, paid, lines: lines(), ...extra,
  });
  orders.push(mk(18, 'llevar', 'lista', true, { customer: 'Mónica' }));
  orders.push(mk(12, 'mesa', 'prep', true));
  orders.push(mk(9, 'llevar', 'prep', true, { customer: 'Carlos' }));
  orders.push(mk(3, 'llevar', 'pendiente', true, { customer: 'Andrea' }));

  if (cat.hasTables) {
    const tables: DiningTable[] = data.tables.map((t) => ({ ...t }));
    const open = (id: string, status: DiningTable['status'], mins: number, guests: number, waiter: string, orderStatus: Order['status']) => {
      const t = tables.find((x) => x.id === id)!;
      t.status = status;
      t.guests = guests;
      t.waiter = waiter;
      t.openedAt = now - mins * 60_000;
      orders.push(mk(Math.max(1, mins - 5), 'mesa', orderStatus, false, { tableId: id }));
    };
    open('M2', 'ocupada', 25, 2, 'Sofía', 'entregada');
    open('M3', 'cuenta', 55, 4, 'Camilo', 'entregada');
    open('M4', 'ocupada', 12, 3, 'Sofía', 'prep');
    open('M7', 'ocupada', 40, 4, 'Camilo', 'lista');
    open('M9', 'ocupada', 5, 1, 'Sofía', 'pendiente');
    open('T1', 'ocupada', 30, 4, 'Camilo', 'entregada');
    open('T6', 'cuenta', 48, 5, 'Sofía', 'entregada');
    const reserve = (id: string, time: string, note: string) => {
      const t = tables.find((x) => x.id === id)!;
      t.status = 'reservada';
      t.reserva = { time, note };
    };
    reserve('M5', '7:30 p. m.', 'Familia Pérez · 6 personas · cumpleaños');
    reserve('T4', '8:00 p. m.', 'Andrés M. · 4 personas');
    data.tables = tables;
  }
  data.orders = orders;
  data.nextOrderNumber = number;
  return data;
}
