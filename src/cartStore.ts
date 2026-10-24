import { create } from 'zustand';
import type { CartLine, OrderMode } from './types';
import { addLine, setLineQty } from './lib/cart';

/** La orden que se está armando en la caja. No se guarda en las copias: es temporal. */
interface CartState {
  lines: CartLine[];
  mode: OrderMode | null;
  tableId: string;
  customer: string;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  setMode: (m: OrderMode) => void;
  setTable: (id: string) => void;
  setCustomer: (c: string) => void;
}

export const useCart = create<CartState>()((set) => ({
  lines: [],
  mode: null,
  tableId: '',
  customer: '',
  add: (line) => set((s) => ({ lines: addLine(s.lines, line) })),
  setQty: (key, qty) => set((s) => ({ lines: setLineQty(s.lines, key, qty) })),
  clear: () => set({ lines: [], customer: '' }),
  setMode: (mode) => set({ mode }),
  setTable: (tableId) => set({ tableId, mode: 'mesa' }),
  setCustomer: (customer) => set({ customer }),
}));
