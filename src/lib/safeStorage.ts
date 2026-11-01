import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';

/**
 * Guardado en localStorage que no se cae cuando el navegador se queda sin espacio.
 * Si una escritura falla, lo anota para que la app lo diga en pantalla y para que
 * los cobros puedan deshacerse en vez de quedar solo en memoria.
 */

/** Tamaño aproximado (en caracteres) desde el que avisamos que el espacio se está acabando. */
export const WARN_SIZE = 4_000_000;

interface SaveStatus {
  /** false si el último guardado falló: hay cambios que no están en la tablet. */
  ok: boolean;
  /** Tamaño del último dato guardado o intentado, en caracteres. */
  size: number;
}

export const useSaveStatus = create<SaveStatus>(() => ({ ok: true, size: 0 }));

// Sin localStorage (pruebas en Node) se guarda en memoria.
const memory = new Map<string, string>();
const hasLocal = () => typeof localStorage !== 'undefined';

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    const value = hasLocal() ? localStorage.getItem(name) : memory.get(name) ?? null;
    if (value) useSaveStatus.setState({ size: value.length });
    return value;
  },
  setItem: (name, value) => {
    try {
      if (hasLocal()) localStorage.setItem(name, value);
      else memory.set(name, value);
      useSaveStatus.setState({ ok: true, size: value.length });
    } catch (e) {
      console.error('No se pudo guardar en el navegador', e);
      useSaveStatus.setState({ ok: false, size: value.length });
    }
  },
  removeItem: (name) => (hasLocal() ? localStorage.removeItem(name) : void memory.delete(name)),
};

export function lastSaveOk(): boolean {
  return useSaveStatus.getState().ok;
}

export class SaveError extends Error {
  constructor() {
    super('No se pudo guardar: la memoria de esta tablet está llena. No se registró nada. Haz una copia de seguridad en Ajustes y avisa al administrador.');
    this.name = 'SaveError';
  }
}
