import type { BizType } from '../types';

/**
 * Color de cada tipo de negocio. `accent` es el color principal (botones, pestañas)
 * y `accent2` el final del degradado. Los dos llevan texto blanco encima, así que
 * ambos pasan contraste AA para texto grande (lo revisa palettes.test.ts).
 */
export interface Palette {
  name: string;
  accent: string;
  accent2: string;
}

export const PALETTES: Record<BizType, Palette> = {
  cafe: { name: 'Café', accent: '#5B3A29', accent2: '#9A5E36' },
  resto: { name: 'Verde', accent: '#1F5F45', accent2: '#358457' },
  helado: { name: 'Frambuesa', accent: '#A3305B', accent2: '#C94E75' },
  pan: { name: 'Miel', accent: '#874A0E', accent2: '#AD6F1A' },
  rapida: { name: 'Tomate', accent: '#AE281D', accent2: '#CF4A1C' },
};

/** Colores fijos que se pueden elegir además del de cada tipo de negocio. */
export const EXTRA_SWATCHES: [string, string][] = [['#2B2B2B', 'Grafito'], ['#1E4E8C', 'Azul']];

/** ¿Es este color el de fábrica de algún tipo de negocio? Si no, lo eligieron a mano. */
export function isPaletteAccent(hex: string): boolean {
  const h = hex.toLowerCase();
  return Object.values(PALETTES).some((p) => p.accent.toLowerCase() === h);
}

/**
 * Final del degradado para un color principal. Si es el de una paleta usa su par
 * diseñado; si es un color elegido a mano, lo deriva (un poco más claro y cálido).
 */
export function gradientEnd(accent: string): string {
  const p = Object.values(PALETTES).find((x) => x.accent.toLowerCase() === accent.toLowerCase());
  return p ? p.accent2 : `color-mix(in oklab, ${accent} 78%, #f2b56b)`;
}
