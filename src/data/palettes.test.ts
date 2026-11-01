import { describe, expect, it } from 'vitest';
import { PALETTES, gradientEnd, isPaletteAccent } from './palettes';
import { BIZ_TYPES } from './catalogs';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrastWithWhite = (hex: string) => 1.05 / (lum(hex) + 0.05);

describe('paletas por tipo de negocio', () => {
  it('cada tipo de negocio tiene su propio color', () => {
    const accents = BIZ_TYPES.map((t) => PALETTES[t].accent);
    expect(new Set(accents).size).toBe(BIZ_TYPES.length);
  });

  it('el texto blanco se lee sobre todo el degradado', () => {
    for (const t of BIZ_TYPES) {
      // Inicio del degradado: texto normal (4.5:1). Final: texto grande y en negrilla (3:1 con margen).
      expect(contrastWithWhite(PALETTES[t].accent), t).toBeGreaterThanOrEqual(4.5);
      expect(contrastWithWhite(PALETTES[t].accent2), t).toBeGreaterThanOrEqual(4);
    }
  });

  it('un color elegido a mano también tiene degradado', () => {
    expect(gradientEnd(PALETTES.pan.accent)).toBe(PALETTES.pan.accent2);
    expect(gradientEnd('#123456')).toContain('#123456');
    expect(isPaletteAccent('#1f5f45')).toBe(true);
    expect(isPaletteAccent('#123456')).toBe(false);
  });
});
