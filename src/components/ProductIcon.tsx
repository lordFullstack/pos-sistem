import type { BizType, ProductIconName } from '../types';

const ART: Record<ProductIconName, string[]> = {
  cup: ['M10 18h24v10a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z', 'M34 21h3a5 5 0 0 1 0 10h-3.5', 'M18 7c-1.5 2 1.5 4 0 6M25 7c-1.5 2 1.5 4 0 6'],
  glass: ['M13 12h22l-3 28H16z', 'M14.3 21h19.4', 'M27 12l5-7'],
  plate: ['M5 31a19 8 0 1 0 38 0a19 8 0 1 0-38 0', 'M12 20a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v4a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z', 'M17 21c2-2 4 2 6 0s4 2 6 0 4 2 4 0'],
  bowl: ['M7 23h34a17 17 0 0 1-34 0z', 'M18 41h12', 'M15 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M23 14a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  croissant: ['M5 31c4-11 12-17 19-17s15 6 19 17c-4 2-8 2-10 0-2 3-5 4-9 4s-7-1-9-4c-2 2-6 2-10 0z', 'M18 18l3 13M30 18l-3 13'],
  cake: ['M8 36h32V24L8 18z', 'M8 26l32 4', 'M14 15c0-3 4-3 4-6'],
  roll: ['M7 27a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M22 25a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M12 24c1.5-2 4-3 6-3M27 22c1.5-2 4-3 6-3'],
  cone: ['M15 21l9 21 9-21', 'M15 21a9 9 0 1 1 18 0z', 'M19 28h10M21 33h6'],
  popsicle: ['M15 14a9 9 0 0 1 18 0v19H15z', 'M24 33v10', 'M20 13v11'],
  tub: ['M12 18h24l-2 22H14z', 'M10 12h28v6H10z'],
  burger: ['M8 22a16 11 0 0 1 32 0z', 'M6 27h36', 'M8 32h32a3 3 0 0 1-3 5H11a3 3 0 0 1-3-5z', 'M18 15v.5M24 13v.5M30 15v.5'],
  bread: ['M8 20a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v18H8z', 'M16 20l4 6M24 20l4 6M32 20l-2 3'],
  fries: ['M12 22h24l-3 20H15z', 'M15 22l-2-14M20 22l-1-16M25 22V6M30 22l2-15M34 22l3-12'],
  pizza: ['M6 12c12-6 24-6 36 0L24 42z', 'M9 17c10-4 20-4 30 0', 'M20 22a2 2 0 1 0 4 0a2 2 0 1 0-4 0M27 27a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
};

export function ProductIcon({ name, size = 44, stroke = 2 }: { name: ProductIconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ART[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const BIZ_ICON: Record<BizType, ProductIconName> = { cafe: 'cup', resto: 'plate', helado: 'cone', pan: 'croissant', rapida: 'burger' };

export function BizIcon({ type, size = 22 }: { type: BizType; size?: number }) {
  return <ProductIcon name={BIZ_ICON[type]} size={size} stroke={3.2} />;
}
