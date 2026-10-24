import { useEffect, useState } from 'react';
import { idbDelete, idbGet, idbPut } from './idb';
import { uid } from './format';
import type { ImageExport } from './backup';

/** Lado mayor de las fotos guardadas. 800 px se ve nítido en las tarjetas y pesa poco. */
const MAX_SIDE = 800;

export interface StoredImage {
  blob: Blob;
  type: string;
  updatedAt: number;
}

/** Achica la foto y la guarda en JPEG. Devuelve el id para guardar en el producto. */
export async function saveProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > 25_000_000) throw new Error('La foto pesa más de 25 MB. Usa una más liviana.');
  const blob = await resize(file);
  const id = uid();
  await idbPut('images', id, { blob, type: blob.type, updatedAt: Date.now() } satisfies StoredImage);
  return id;
}

async function resize(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer la foto. Prueba con JPG o PNG.'));
      i.src = url;
    });
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))), 'image/jpeg', 0.82),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function deleteProductImage(id: string): Promise<void> {
  urls.get(id) && URL.revokeObjectURL(urls.get(id)!);
  urls.delete(id);
  await idbDelete('images', id);
}

const urls = new Map<string, string>();
const listeners = new Set<() => void>();

/** URL para mostrar una foto guardada. Devuelve '' mientras carga o si no existe. */
export function useImageUrl(id: string | undefined): string {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  useEffect(() => {
    if (!id || urls.has(id)) return;
    let alive = true;
    idbGet<StoredImage>('images', id).then((img) => {
      if (!alive || !img) return;
      urls.set(id, URL.createObjectURL(img.blob));
      listeners.forEach((fn) => fn());
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return id ? urls.get(id) ?? '' : '';
}

/* ---- Para las copias de seguridad ---- */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function exportImages(ids: string[]): Promise<ImageExport[]> {
  const out: ImageExport[] = [];
  for (const id of new Set(ids)) {
    const img = await idbGet<StoredImage>('images', id);
    if (img) out.push({ id, type: img.type, base64: await blobToBase64(img.blob) });
  }
  return out;
}

export async function importImages(list: ImageExport[]): Promise<void> {
  for (const it of list) {
    const bytes = Uint8Array.from(atob(it.base64), (ch) => ch.charCodeAt(0));
    await idbPut('images', it.id, { blob: new Blob([bytes], { type: it.type }), type: it.type, updatedAt: Date.now() } satisfies StoredImage);
    if (urls.has(it.id)) {
      URL.revokeObjectURL(urls.get(it.id)!);
      urls.delete(it.id);
    }
  }
  listeners.forEach((fn) => fn());
}
