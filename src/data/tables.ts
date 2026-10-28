import type { DiningTable, Zone } from '../types';

/** Plano base de 840 × 556 px. Las posiciones son la esquina superior izquierda de cada mesa. */
export const FLOOR_W = 840;
export const FLOOR_H = 556;

const t = (id: string, zone: string, seats: number, x: number, y: number): DiningTable => ({
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

/** Zonas con las que empieza un restaurante; después se renombran, agregan o borran en Mesas. */
export const DEFAULT_ZONES: Zone[] = [
  { id: 'salon', name: 'Salón principal', sort: 0 },
  { id: 'terraza', name: 'Terraza', sort: 1 },
];

export function sortedZones(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => a.sort - b.sort);
}

export function zoneName(zones: Zone[], id: string): string {
  return zones.find((z) => z.id === id)?.name ?? 'Sin zona';
}

/** Zonas por defecto más cualquier zona que usen las mesas y no esté en la lista. */
export function ensureZones(zones: Zone[] | undefined, tables: DiningTable[]): Zone[] {
  const out = [...(zones ?? [])];
  for (const z of DEFAULT_ZONES) if (!out.some((x) => x.id === z.id)) out.push({ ...z, sort: out.length });
  for (const t of tables) if (!out.some((x) => x.id === t.zone)) out.push({ id: t.zone, name: t.zone, sort: out.length });
  return out;
}

/** Elementos fijos dibujados en el plano de las zonas iniciales. */
export const DECOR: Record<string, { x: number; y: number; w: number; h: number; label: string }[]> = {
  salon: [{ x: 40, y: 430, w: 460, h: 56, label: 'Barra' }, { x: 640, y: 450, w: 150, h: 36, label: 'Entrada' }],
  terraza: [{ x: 40, y: 430, w: 740, h: 40, label: 'Jardinera' }],
};

export function tableLabel(t: Pick<DiningTable, 'id' | 'label'>): string {
  return t.label?.trim() || t.id;
}

export const MAX_SEATS = 12;

/** Borde libre alrededor de cada mesa (las sillas sobresalen 18 px). */
const MARGIN = 24;

/** Primera posición del plano donde cabe una mesa nueva sin tocar a las demás. */
export function freeSpot(others: DiningTable[], seats: number): { x: number; y: number } {
  const g = tableGeom(seats);
  const boxes = others.map((t) => ({ ...tableGeom(t.seats), x: t.x, y: t.y }));
  for (let y = MARGIN; y + g.h + MARGIN <= FLOOR_H; y += 10) {
    for (let x = MARGIN; x + g.w + MARGIN <= FLOOR_W; x += 10) {
      const hit = boxes.some((b) => x < b.x + b.w + MARGIN && x + g.w + MARGIN > b.x && y < b.y + b.h + MARGIN && y + g.h + MARGIN > b.y);
      if (!hit) return { x, y };
    }
  }
  return { x: MARGIN, y: MARGIN };
}

/** Mantiene la mesa (con sus sillas) dentro del plano y la ajusta a una cuadrícula de 10 px. */
export function clampToFloor(x: number, y: number, seats: number): { x: number; y: number } {
  const g = tableGeom(seats);
  const snap = (v: number) => Math.round(v / 10) * 10;
  // El tope también cae en la cuadrícula, para que una mesa pegada al borde siga alineada.
  const maxX = Math.floor((FLOOR_W - g.w - 20) / 10) * 10;
  const maxY = Math.floor((FLOOR_H - g.h - 20) / 10) * 10;
  return {
    x: Math.min(Math.max(snap(x), 20), maxX),
    y: Math.min(Math.max(snap(y), 20), maxY),
  };
}
