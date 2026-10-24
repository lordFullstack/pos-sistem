import { useCatalog, useCurrentUser } from '../store';
import { can, type Permission } from '../data/roles';
import { Icon } from './Icon';
import type { Route } from '../router';

interface Item {
  route: Route;
  label: string;
  icon: string;
  perm?: Permission;
}

/** Barra inferior con los módulos más usados. Cambia según el tipo de negocio. */
export function ModuleNav({ current }: { current: Route }) {
  const catalog = useCatalog();
  const user = useCurrentUser();
  const items: Item[] = [
    { route: 'caja', label: 'Caja', icon: 'register' },
    catalog.hasTables
      ? { route: 'mesas', label: 'Mesas', icon: 'table', perm: 'cobrar' }
      : { route: 'ordenes', label: 'Órdenes', icon: 'receipt', perm: 'ordenes' },
    catalog.hasTables
      ? { route: 'ordenes', label: 'Órdenes', icon: 'receipt', perm: 'ordenes' }
      : { route: 'inventario', label: 'Inventario', icon: 'box' },
    { route: 'reportes', label: 'Reportes', icon: 'chart', perm: 'reportes' },
  ];
  return (
    <nav className="modnav" aria-label="Módulos">
      {items.map((it) => {
        const locked = it.perm ? !can(user?.role, it.perm) : false;
        if (it.route === current) {
          return (
            <span key={it.route} aria-current="page">
              <Icon name={it.icon} /> {it.label}
            </span>
          );
        }
        return (
          <a key={it.route} href={`#/${it.route}`} className={locked ? 'locked' : undefined} title={locked ? 'Tu rol no tiene acceso' : undefined}>
            <Icon name={it.icon} /> {it.label}
          </a>
        );
      })}
      {current === 'modulos' ? (
        <span aria-current="page" className="all">
          <Icon name="grid" /> Todos los módulos
        </span>
      ) : (
        <a href="#/modulos" className="all">
          <Icon name="grid" /> Todos los módulos
        </a>
      )}
    </nav>
  );
}
