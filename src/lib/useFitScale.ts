import { useEffect, useRef, useState } from 'react';

/** Escala un lienzo de tamaño fijo para que quepa completo en su contenedor. */
export function useFitScale(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = Math.min(el.clientWidth / w, el.clientHeight / h);
      setScale(Math.max(0.3, Math.min(1.6, s)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return { ref, scale };
}
