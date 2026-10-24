import { useEffect, useState } from 'react';

export type Route = 'caja' | 'mesas' | 'ordenes' | 'inventario' | 'reportes' | 'contabilidad' | 'menu' | 'ajustes' | 'modulos';

const ROUTES: Route[] = ['caja', 'mesas', 'ordenes', 'inventario', 'reportes', 'contabilidad', 'menu', 'ajustes', 'modulos'];

function parse(): { route: Route; param: string } {
  const [name, param = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { route: ROUTES.includes(name as Route) ? (name as Route) : 'caja', param: decodeURIComponent(param) };
}

/** Navegación simple por #/ruta, para que funcione sin servidor y con el botón atrás. */
export function useRoute() {
  const [state, setState] = useState(parse);
  useEffect(() => {
    const on = () => setState(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return state;
}

export function go(route: Route, param?: string) {
  window.location.hash = `#/${route}${param ? '/' + encodeURIComponent(param) : ''}`;
}
