import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  ActiveCatalog, AppData, BizType, CartLine, CashClosure, Category, DiningTable, Expense, InventoryItem, Order, OrderMode,
  PayMethod, Product, Settings, User,
} from './types';
import { emptyData, upgradeData } from './data/initial';
import { CATALOGS, seedMenu } from './data/catalogs';
import { seedInventory } from './data/inventory';
import { freeSpot, seedTables } from './data/tables';
import { mergeLines, totals } from './lib/cart';
import { uid } from './lib/format';

const NEXT_STATUS: Partial<Record<Order['status'], Order['status']>> = {
  pendiente: 'prep',
  prep: 'lista',
  lista: 'entregada',
};

interface Actions {
  /** Reemplaza todos los datos (al empezar o al restaurar una copia). */
  load: (data: AppData) => void;
  resetAll: () => void;
  snapshot: () => AppData;

  updateSettings: (patch: Partial<Settings>) => void;
  /** Cambia el tipo de negocio. Con resetMenu=true reemplaza el menú y el inventario por los de la plantilla. */
  setBizType: (type: BizType, resetMenu: boolean) => void;

  addCategory: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  /** Devuelve un mensaje si la categoría todavía tiene productos. */
  deleteCategory: (id: string) => string | null;
  addProduct: (p: Omit<Product, 'id' | 'sort'>) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addClosure: (c: Omit<CashClosure, 'id' | 'at'>) => void;

  switchUser: (id: string) => void;
  /** Devuelve el id del usuario nuevo. */
  addUser: (u: Omit<User, 'id'>) => string;
  /** Devuelve un mensaje de error si el cambio dejaría el negocio sin administrador. */
  updateUser: (id: string, patch: Partial<User>) => string | null;

  checkout: (p: { lines: CartLine[]; method: PayMethod; mode: OrderMode; customer?: string }) => Order;
  sendToKitchen: (p: { lines: CartLine[]; tableId: string }) => Order;
  advanceOrder: (id: string) => void;
  cancelOrder: (id: string) => void;

  openTable: (id: string, guests: number) => void;
  setGuests: (id: string, guests: number) => void;
  requestBill: (id: string) => void;
  chargeTable: (id: string, method: PayMethod) => number;
  seatReservation: (id: string) => void;
  cancelReservation: (id: string) => void;
  reserveTable: (id: string, time: string, note: string) => void;
  moveTable: (fromId: string, toId: string) => void;

  /** Plano de mesas (solo administradores). Devuelve el id de la mesa nueva. */
  addTable: (t: { label: string; seats: number; zone: DiningTable['zone'] }) => string;
  updateTable: (id: string, patch: Partial<Pick<DiningTable, 'label' | 'seats' | 'zone' | 'x' | 'y'>>) => void;
  /** Devuelve un mensaje si la mesa está en uso y no se puede borrar. */
  deleteTable: (id: string) => string | null;

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  registerEntry: (id: string, amount: number) => void;
  adjustCount: (id: string, stock: number) => void;

  addExpense: (e: Omit<Expense, 'id' | 'at'>) => void;
  deleteExpense: (id: string) => void;
}

export type Store = AppData & Actions;

const blank = (): AppData => ({ ...emptyData('cafe', '', ''), settings: { ...emptyData('cafe', '', '').settings, onboarded: false } });

const dataOf = (s: Store): AppData => ({
  version: 2,
  settings: s.settings,
  users: s.users,
  categories: s.categories,
  products: s.products,
  closures: s.closures,
  orders: s.orders,
  sales: s.sales,
  tables: s.tables,
  inventory: s.inventory,
  inventoryMoves: s.inventoryMoves,
  expenses: s.expenses,
  nextOrderNumber: s.nextOrderNumber,
});

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const patchTable = (id: string, patch: Partial<DiningTable>) =>
        set((s) => ({ tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      const currentUser = () => get().users.find((u) => u.id === get().settings.currentUserId);

      return {
        ...blank(),

        load: (data) => set({ ...upgradeData(data) }),
        resetAll: () => set({ ...blank() }),
        snapshot: () => dataOf(get()),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setBizType: (type, resetMenu) =>
          set((s) => {
            const names = Object.values(CATALOGS).map((c) => c.defaultName);
            const bizName = names.includes(s.settings.bizName) ? CATALOGS[type].defaultName : s.settings.bizName;
            return {
              settings: { ...s.settings, bizType: type, bizName },
              tables: CATALOGS[type].hasTables && s.tables.length === 0 ? seedTables() : s.tables,
              ...(resetMenu ? seedMenu(type) : {}),
              inventory: resetMenu ? seedInventory(type) : s.inventory,
              inventoryMoves: resetMenu ? [] : s.inventoryMoves,
            };
          }),

        addCategory: (name) => {
          const id = uid();
          set((s) => ({ categories: [...s.categories, { id, name, sort: s.categories.length }] }));
          return id;
        },
        renameCategory: (id, name) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),
        deleteCategory: (id) => {
          const n = get().products.filter((p) => p.cat === id).length;
          if (n) return `Tiene ${n} producto${n === 1 ? '' : 's'}. Muévelos a otra categoría antes de borrarla.`;
          set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
          return null;
        },
        addProduct: (p) => {
          const id = uid();
          set((s) => ({ products: [...s.products, { ...p, id, sort: s.products.length }] }));
          return id;
        },
        updateProduct: (id, patch) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

        addClosure: (c) => set((s) => ({ closures: [...s.closures, { ...c, id: uid(), at: Date.now() }] })),

        switchUser: (id) => set((s) => ({ settings: { ...s.settings, currentUserId: id } })),
        addUser: (u) => {
          const id = uid();
          set((s) => ({ users: [...s.users, { ...u, id }] }));
          return id;
        },
        updateUser: (id, patch) => {
          const next = get().users.map((u) => (u.id === id ? { ...u, ...patch } : u));
          if (!next.some((u) => u.role === 'admin' && u.active)) {
            return 'Debe quedar al menos un administrador con acceso.';
          }
          set({ users: next });
          return null;
        },

        checkout: ({ lines, method, mode, customer }) => {
          const s = get();
          const t = totals(lines, s.settings.tax);
          const order: Order = {
            id: uid(), number: s.nextOrderNumber, createdAt: Date.now(), mode, customer,
            lines, status: 'pendiente', paid: true,
          };
          set({
            orders: [...s.orders, order],
            nextOrderNumber: s.nextOrderNumber + 1,
            sales: [...s.sales, {
              id: uid(), at: Date.now(), orderIds: [order.id], lines,
              subtotal: t.subtotal, tax: t.tax, total: t.total, method, userId: s.settings.currentUserId,
            }],
          });
          return order;
        },
        sendToKitchen: ({ lines, tableId }) => {
          const s = get();
          const order: Order = {
            id: uid(), number: s.nextOrderNumber, createdAt: Date.now(), mode: 'mesa', tableId,
            lines, status: 'pendiente', paid: false,
          };
          const table = s.tables.find((t) => t.id === tableId);
          set({ orders: [...s.orders, order], nextOrderNumber: s.nextOrderNumber + 1 });
          if (table && (table.status === 'libre' || table.status === 'reservada')) {
            patchTable(tableId, {
              status: 'ocupada', openedAt: Date.now(), guests: Math.max(1, table.guests),
              waiter: currentUser()?.name.split(' ')[0] ?? '', reserva: undefined,
            });
          }
          return order;
        },
        advanceOrder: (id) =>
          set((s) => ({
            orders: s.orders.map((o) => (o.id === id && NEXT_STATUS[o.status] ? { ...o, status: NEXT_STATUS[o.status]! } : o)),
          })),
        cancelOrder: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'cancelada' } : o)) })),

        openTable: (id, guests) =>
          patchTable(id, { status: 'ocupada', guests: Math.max(1, guests), openedAt: Date.now(), waiter: currentUser()?.name.split(' ')[0] ?? '' }),
        setGuests: (id, guests) => patchTable(id, { guests: Math.max(0, guests) }),
        requestBill: (id) => patchTable(id, { status: 'cuenta' }),
        chargeTable: (id, method) => {
          const s = get();
          const open = s.orders.filter((o) => o.tableId === id && !o.paid && o.status !== 'cancelada');
          const lines = mergeLines(open.map((o) => o.lines));
          const t = totals(lines, s.settings.tax);
          const ids = open.map((o) => o.id);
          set({
            orders: s.orders.map((o) => (ids.includes(o.id) ? { ...o, paid: true } : o)),
            sales: lines.length
              ? [...s.sales, {
                  id: uid(), at: Date.now(), orderIds: ids, lines,
                  subtotal: t.subtotal, tax: t.tax, total: t.total, method, userId: s.settings.currentUserId,
                }]
              : s.sales,
          });
          patchTable(id, { status: 'libre', guests: 0, waiter: '', openedAt: undefined });
          return t.total;
        },
        seatReservation: (id) => {
          const t = get().tables.find((x) => x.id === id);
          patchTable(id, {
            status: 'ocupada', guests: t?.seats ?? 2, openedAt: Date.now(), reserva: undefined,
            waiter: currentUser()?.name.split(' ')[0] ?? '',
          });
        },
        cancelReservation: (id) => patchTable(id, { status: 'libre', reserva: undefined }),
        reserveTable: (id, time, note) => patchTable(id, { status: 'reservada', reserva: { time, note } }),
        moveTable: (fromId, toId) => {
          const s = get();
          const from = s.tables.find((t) => t.id === fromId);
          if (!from) return;
          set({
            orders: s.orders.map((o) => (o.tableId === fromId && !o.paid ? { ...o, tableId: toId } : o)),
            tables: s.tables.map((t) => {
              if (t.id === toId) return { ...t, status: from.status, guests: from.guests, waiter: from.waiter, openedAt: from.openedAt };
              if (t.id === fromId) return { ...t, status: 'libre', guests: 0, waiter: '', openedAt: undefined };
              return t;
            }),
          });
        },

        addTable: ({ label, seats, zone }) => {
          const id = uid();
          const pos = freeSpot(get().tables.filter((t) => t.zone === zone), seats);
          set((s) => ({ tables: [...s.tables, { id, label, zone, seats, ...pos, status: 'libre', guests: 0, waiter: '' }] }));
          return id;
        },
        updateTable: (id, patch) => patchTable(id, patch),
        deleteTable: (id) => {
          const s = get();
          const t = s.tables.find((x) => x.id === id);
          if (!t) return null;
          const open = s.orders.some((o) => o.tableId === id && !o.paid && o.status !== 'cancelada');
          if (t.status !== 'libre' || open) return 'Solo se pueden borrar mesas libres, sin cuentas abiertas ni reservas.';
          set({ tables: s.tables.filter((x) => x.id !== id) });
          return null;
        },

        addInventoryItem: (item) => set((s) => ({ inventory: [...s.inventory, { ...item, id: uid() }] })),
        registerEntry: (id, amount) =>
          set((s) => ({
            inventory: s.inventory.map((i) => (i.id === id ? { ...i, stock: Math.round((i.stock + amount) * 10) / 10 } : i)),
            inventoryMoves: [{ id: uid(), itemId: id, at: Date.now(), label: 'Entrada registrada', delta: amount }, ...s.inventoryMoves],
          })),
        adjustCount: (id, stock) =>
          set((s) => {
            const item = s.inventory.find((i) => i.id === id);
            if (!item) return {};
            const delta = Math.round((stock - item.stock) * 10) / 10;
            return {
              inventory: s.inventory.map((i) => (i.id === id ? { ...i, stock } : i)),
              inventoryMoves: [{ id: uid(), itemId: id, at: Date.now(), label: 'Ajuste por conteo', delta }, ...s.inventoryMoves],
            };
          }),

        addExpense: (e) => set((s) => ({ expenses: [...s.expenses, { ...e, id: uid(), at: Date.now() }] })),
        deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      };
    },
    {
      name: 'pos-moderno-data',
      version: 2,
      partialize: (s) => dataOf(s),
      // Datos guardados con una versión anterior de la app se ponen al día solos.
      migrate: (persisted) => upgradeData(persisted) as unknown as Store,
    },
  ),
);

/** Usuario que está usando la caja ahora. */
export function useCurrentUser(): User | undefined {
  return useStore((s) => s.users.find((u) => u.id === s.settings.currentUserId));
}

/** Perfil del tipo de negocio con el menú actual: solo productos activos, en orden. */
export function useCatalog(): ActiveCatalog {
  const type = useStore((s) => s.settings.bizType);
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  return useMemo(() => {
    const base = CATALOGS[type];
    const cats = [...categories].sort((a, b) => a.sort - b.sort);
    const ids = new Set(cats.map((c) => c.id));
    return {
      ...base,
      cats: cats.map((c): [string, string] => [c.id, c.name]),
      items: products.filter((p) => p.active && ids.has(p.cat)).sort((a, b) => a.sort - b.sort),
    };
  }, [type, categories, products]);
}

export function sortedCategories(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => a.sort - b.sort);
}

export function orderLabel(n: number): string {
  return '#' + String(n).padStart(4, '0');
}
