export type BizType = 'cafe' | 'resto' | 'helado' | 'pan' | 'rapida';

export type ProductIconName =
  | 'cup' | 'glass' | 'plate' | 'bowl' | 'croissant' | 'cake' | 'roll'
  | 'cone' | 'popsicle' | 'tub' | 'burger' | 'bread' | 'fries' | 'pizza';

export interface OptionChoice {
  label: string;
  add: number;
  /** Solo para grupos de tamaño de helado: cuántos sabores permite. */
  scoops?: number;
}

export interface OptionGroup {
  name: string;
  type: 'one' | 'many';
  min: number;
  /** 'scoops' = el máximo lo define la opción elegida en el primer grupo. */
  max: number | 'scoops';
  choices: OptionChoice[];
}

/** Producto de una plantilla (menú inicial de cada tipo de negocio). */
export interface ProductTemplate {
  id: string;
  name: string;
  desc: string;
  price: number;
  cat: string;
  icon: ProductIconName;
  tint: string;
  opts?: OptionGroup[];
}

/** Producto del menú del negocio, editable desde la pantalla Menú. */
export interface Product extends ProductTemplate {
  active: boolean;
  sort: number;
  /** Foto guardada en este equipo (IndexedDB) o, más adelante, en Supabase Storage. */
  imageId?: string;
}

export interface Category {
  id: string;
  name: string;
  sort: number;
}

/** Perfil y menú inicial de un tipo de negocio. */
export interface Catalog {
  type: BizType;
  label: string;
  defaultName: string;
  hint: string;
  cats: [string, string][];
  items: ProductTemplate[];
  defaultMode: OrderMode;
  hasTables: boolean;
  dineInLabel: string;
}

/** Perfil del negocio con su menú actual (lo que usa la caja). */
export interface ActiveCatalog extends Omit<Catalog, 'items'> {
  items: Product[];
}

export interface CashClosure {
  id: string;
  at: number;
  userId: string;
  expectedCash: number;
  countedCash: number;
  salesCount: number;
  salesTotal: number;
}

export type Selection = Record<number, number[]>;

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  note: string;
  unit: number;
  qty: number;
}

export type OrderMode = 'mesa' | 'llevar';
export type OrderStatus = 'pendiente' | 'prep' | 'lista' | 'entregada' | 'cancelada';
export type PayMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Order {
  id: string;
  number: number;
  createdAt: number;
  mode: OrderMode;
  tableId?: string;
  customer?: string;
  lines: CartLine[];
  status: OrderStatus;
  paid: boolean;
  note?: string;
}

export interface Sale {
  id: string;
  at: number;
  orderIds: string[];
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  method: PayMethod;
  userId: string;
}

export type TableStatus = 'libre' | 'ocupada' | 'cuenta' | 'reservada';

export interface DiningTable {
  id: string;
  zone: 'salon' | 'terraza';
  seats: number;
  x: number;
  y: number;
  status: TableStatus;
  guests: number;
  waiter: string;
  openedAt?: number;
  reserva?: { time: string; note: string };
}

export interface InventoryItem {
  id: string;
  name: string;
  cat: string;
  unit: 'kg' | 'L' | 'und';
  stock: number;
  min: number;
  usedIn: string;
}

export interface InventoryMove {
  id: string;
  itemId: string;
  at: number;
  label: string;
  delta: number;
}

export type ExpenseCat = 'insumos' | 'nomina' | 'arriendo' | 'servicios' | 'otros';

export interface Expense {
  id: string;
  at: number;
  concept: string;
  cat: ExpenseCat;
  value: number;
  method: PayMethod;
}

export type Role = 'admin' | 'cajero' | 'barista';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  /** Resumen SHA-256 del PIN de 4 dígitos. Sin PIN = cualquiera puede entrar como este usuario. */
  pinHash?: string;
}

export type TaxMode = 'impo' | 'iva' | 'none';

export interface Settings {
  onboarded: boolean;
  bizType: BizType;
  bizName: string;
  nit: string;
  accent: string;
  tax: TaxMode;
  textSize: 'normal' | 'grande';
  footer: string;
  logo: string;
  remindBackup: boolean;
  currentUserId: string;
}

export interface BackupEntry {
  id: string;
  at: number;
  by: string;
  size: number;
}

/** Todo lo que se guarda y entra en una copia de seguridad. */
export interface AppData {
  version: 2;
  settings: Settings;
  users: User[];
  categories: Category[];
  products: Product[];
  closures: CashClosure[];
  orders: Order[];
  sales: Sale[];
  tables: DiningTable[];
  inventory: InventoryItem[];
  inventoryMoves: InventoryMove[];
  expenses: Expense[];
  nextOrderNumber: number;
}
