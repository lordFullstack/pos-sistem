import { describe, expect, it } from 'vitest';
import { checkPin, hashPin, lockRemaining, pinProblem, registerAttempt, triesLeft } from './pin';

describe('PIN', () => {
  it('pide exactamente 4 números y rechaza los fáciles', () => {
    expect(pinProblem('482')).toMatch('4 números');
    expect(pinProblem('48a1')).toMatch('4 números');
    expect(pinProblem('0000')).toMatch('fácil');
    expect(pinProblem('1234')).toMatch('fácil');
    expect(pinProblem('4827')).toBeNull();
  });

  it('no guarda el PIN y el resumen cambia por usuario', async () => {
    const a = await hashPin('u-1', '4827');
    expect(a).toHaveLength(64);
    expect(a).not.toContain('4827');
    expect(await hashPin('u-1', '4827')).toBe(a);
    expect(await hashPin('u-2', '4827')).not.toBe(a);
  });

  it('valida el PIN correcto y deja pasar a quien no tiene PIN', async () => {
    const h = await hashPin('u-1', '4827');
    expect(await checkPin('u-1', h, '4827')).toBe(true);
    expect(await checkPin('u-1', h, '4828')).toBe(false);
    expect(await checkPin('u-1', undefined, '')).toBe(true);
  });

  it('bloquea 30 segundos después de 5 intentos fallidos', () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) expect(registerAttempt('u-lock', false, now)).toBe(0);
    expect(triesLeft('u-lock')).toBe(1);
    expect(registerAttempt('u-lock', false, now)).toBe(30);
    expect(lockRemaining('u-lock', now + 10_000)).toBe(20);
    expect(lockRemaining('u-lock', now + 31_000)).toBe(0);
    registerAttempt('u-lock', true, now + 31_000);
    expect(triesLeft('u-lock')).toBe(5);
  });
});
