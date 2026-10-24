import type { DiningTable } from '../types';

/** Plano base de 840 × 556 px. Las posiciones son la esquina superior izquierda de cada mesa. */
export const FLOOR_W = 840;
export const FLOOR_H = 556;

const t = (id: string, zone: DiningTable['zone'], seats: number, x: number, y: number): DiningTable => ({
  id, zone, seats, x, y, status: 'libre', guests: 0, waiter: '',
});

export function seedTables(): DiningTable[] {
  return [
    t('M1', 'salon', 2, 40, 40),
    t('M2', 'salon', 2, 180, 40),
    t('M3', 'salon', 4, 330, 30),
    t('M4', 'salon', 4, 490, 30),
    t('M5', 'salon', 6, 640, 40),
    t('M6', 'salon', 4, 40, 220),
    t('M7', 'salon', 4, 210, 220),
    t('M8', 'salon', 6, 390, 230),
    t('M9', 'salon', 2, 610, 240),
    t('M10', 'salon', 2, 730, 240),
    t('T1', 'terraza', 4, 60, 60),
    t('T2', 'terraza', 2, 250, 72),
    t('T3', 'terraza', 2, 390, 72),
    t('T4', 'terraza', 4, 540, 60),
    t('T5', 'terraza', 4, 60, 260),
    t('T6', 'terraza', 6, 250, 270),
  ];
}

export interface TableGeom {
  w: number;
  h: number;
  round: boolean;
  chairs: { x: number; y: number; w: number; h: number }[];
}

export function tableGeom(seats: number): TableGeom {
  if (seats <= 2) {
    return { w: 88, h: 88, round: true, chairs: [{ x: -18, y: 30, w: 10, h: 28 }, { x: 96, y: 30, w: 10, h: 28 }] };
  }
  if (seats <= 4) {
    return {
      w: 112, h: 112, round: false,
      chairs: [
        { x: 20, y: -18, w: 28, h: 10 }, { x: 64, y: -18, w: 28, h: 10 },
        { x: 20, y: 120, w: 28, h: 10 }, { x: 64, y: 120, w: 28, h: 10 },
      ],
    };
  }
  return {
    w: 176, h: 104, round: false,
    chairs: [
      { x: 20, y: -18, w: 28, h: 10 }, { x: 74, y: -18, w: 28, h: 10 }, { x: 128, y: -18, w: 28, h: 10 },
      { x: 20, y: 112, w: 28, h: 10 }, { x: 74, y: 112, w: 28, h: 10 }, { x: 128, y: 112, w: 28, h: 10 },
    ],
  };
}

export const ZONE_NAMES: Record<DiningTable['zone'], string> = { salon: 'Salón principal', terraza: 'Terraza' };
