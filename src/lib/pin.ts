/** PIN de 4 dígitos por usuario. Se guarda solo el resumen SHA-256, nunca el PIN. */

export const PIN_LENGTH = 4;
const MAX_TRIES = 5;
const LOCK_MS = 30_000;

const WEAK = new Set(['1234', '4321', '0123', '1212', '6969']);

/** Devuelve un mensaje si el PIN no sirve, o null si está bien. */
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'El PIN debe tener 4 números.';
  if (/^(\d)\1{3}$/.test(pin) || WEAK.has(pin)) return 'Ese PIN es muy fácil de adivinar. Usa otro.';
  return null;
}

export async function hashPin(userId: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`pos-moderno:${userId}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPin(userId: string, pinHash: string | undefined, pin: string): Promise<boolean> {
  if (!pinHash) return true;
  return (await hashPin(userId, pin)) === pinHash;
}

/** Intentos fallidos por usuario (en memoria: se reinician al recargar la app). */
const tries = new Map<string, { count: number; lockedUntil: number }>();

export function lockRemaining(userId: string, now = Date.now()): number {
  const t = tries.get(userId);
  return t && t.lockedUntil > now ? Math.ceil((t.lockedUntil - now) / 1000) : 0;
}

/** Registra un intento. Devuelve los segundos de bloqueo si se pasó del límite. */
export function registerAttempt(userId: string, ok: boolean, now = Date.now()): number {
  if (ok) {
    tries.delete(userId);
    return 0;
  }
  const t = tries.get(userId) ?? { count: 0, lockedUntil: 0 };
  t.count += 1;
  if (t.count >= MAX_TRIES) {
    t.count = 0;
    t.lockedUntil = now + LOCK_MS;
  }
  tries.set(userId, t);
  return lockRemaining(userId, now);
}

export function triesLeft(userId: string): number {
  return MAX_TRIES - (tries.get(userId)?.count ?? 0);
}
