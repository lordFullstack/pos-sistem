/** Copias guardadas en este equipo (IndexedDB) y creación / restauración con fotos. */
import type { AppData, BackupEntry } from '../types';
import { backupFilename, downloadText, makeBackup, parseBackup, type BackupFile } from './backup';
import { exportImages, importImages } from './images';
import { idbDelete, idbGet, idbPut } from './idb';

const INDEX = 'index';
const MAX_LOCAL = 5;

export async function listLocalBackups(): Promise<BackupEntry[]> {
  return (await idbGet<BackupEntry[]>('backups', INDEX)) ?? [];
}

export async function readLocalBackup(id: string): Promise<BackupFile | null> {
  const text = await idbGet<string>('backups', id);
  return text ? parseBackup(text) : null;
}

/** Arma la copia con todas las fotos que usa el menú. */
export async function buildBackup(data: AppData, by: string): Promise<BackupFile> {
  const ids = data.products.map((p) => p.imageId).filter((x): x is string => !!x);
  return makeBackup(data, by, await exportImages(ids));
}

/** Crea una copia, la guarda en este equipo (las últimas 5) y descarga el archivo. */
export async function backupNow(data: AppData, by: string): Promise<BackupEntry[]> {
  const file = await buildBackup(data, by);
  const text = JSON.stringify(file);
  downloadText(backupFilename(file.createdAt), text);
  const entry: BackupEntry = { id: String(file.createdAt), at: file.createdAt, by, size: text.length };
  const list = [entry, ...(await listLocalBackups())];
  for (const old of list.slice(MAX_LOCAL)) await idbDelete('backups', old.id);
  const keep = list.slice(0, MAX_LOCAL);
  try {
    await idbPut('backups', entry.id, text);
    await idbPut('backups', INDEX, keep);
  } catch {
    throw new Error('El archivo se descargó, pero no hubo espacio para guardar la copia en este equipo.');
  }
  return keep;
}

export async function downloadLocalBackup(id: string): Promise<void> {
  const text = await idbGet<string>('backups', id);
  if (text) downloadText(backupFilename(Number(id)), text);
}

/** Devuelve los datos listos para cargar, después de guardar las fotos de la copia. */
export async function restoreFiles(file: BackupFile): Promise<AppData> {
  await importImages(file.images ?? []);
  return file.data;
}
