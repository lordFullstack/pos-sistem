/**
 * Formato de las copias de seguridad. Sin dependencias del navegador:
 * lo usa la app y también el script de migración a Supabase.
 */
import type { AppData } from '../types';
import { upgradeData } from '../data/initial';

export interface ImageExport {
  id: string;
  type: string;
  base64: string;
}

export interface BackupFile {
  app: 'pos-moderno';
  createdAt: number;
  createdBy: string;
  data: AppData;
  /** Fotos de productos (desde la versión 2). */
  images?: ImageExport[];
}

export function makeBackup(data: AppData, by: string, images: ImageExport[] = []): BackupFile {
  return { app: 'pos-moderno', createdAt: Date.now(), createdBy: by, data, images };
}

/** Valida un archivo de copia y lo pone al día. Lanza un error con un mensaje claro si no sirve. */
export function parseBackup(text: string): BackupFile {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia válida (no se pudo leer).');
  }
  const f = obj as Partial<BackupFile>;
  const version = (f.data as { version?: number } | undefined)?.version;
  if (f.app !== 'pos-moderno' || !f.data || (version !== 1 && version !== 2)) {
    throw new Error('Este archivo no es una copia de POS Moderno.');
  }
  const d = f.data;
  const arrays: (keyof AppData)[] = ['users', 'orders', 'sales', 'tables', 'inventory', 'inventoryMoves', 'expenses'];
  if (!d.settings || arrays.some((k) => !Array.isArray(d[k]))) {
    throw new Error('La copia está incompleta o dañada.');
  }
  return { ...(f as BackupFile), data: upgradeData(d), images: Array.isArray(f.images) ? f.images : [] };
}

export function backupFilename(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `pos-moderno-copia-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.backup`;
}

/** CSV con punto y coma (Excel en español lo abre bien) y BOM para las tildes. */
export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

export function sizeLabel(bytes: number): string {
  if (bytes >= 1_000_000) return String(Math.round(bytes / 100_000) / 10).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(bytes / 1000)) + ' KB';
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
