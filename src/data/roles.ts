import type { Role } from '../types';

export type Permission =
  | 'ordenes'
  | 'cobrar'
  | 'descuentos'
  | 'cierre'
  | 'inventario'
  | 'anular'
  | 'reportes'
  | 'contabilidad'
  | 'menu'
  | 'ajustes';

export const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: 'admin', label: 'Administrador', desc: 'Acceso total, incluidos ajustes y usuarios' },
  { id: 'cajero', label: 'Cajero', desc: 'Cobra, atiende mesas y cierra caja' },
  { id: 'barista', label: 'Barista / Cocina', desc: 'Prepara órdenes y registra insumos' },
];

export const PERMISSIONS: { id: Permission; label: string; roles: Role[] }[] = [
  { id: 'ordenes', label: 'Ver y avanzar órdenes', roles: ['admin', 'cajero', 'barista'] },
  { id: 'cobrar', label: 'Cobrar en caja y atender mesas', roles: ['admin', 'cajero'] },
  { id: 'descuentos', label: 'Aplicar descuentos', roles: ['admin', 'cajero'] },
  { id: 'cierre', label: 'Hacer cierre de caja', roles: ['admin', 'cajero'] },
  { id: 'inventario', label: 'Registrar entradas de inventario', roles: ['admin', 'barista'] },
  { id: 'anular', label: 'Cancelar órdenes', roles: ['admin'] },
  { id: 'reportes', label: 'Ver reportes', roles: ['admin'] },
  { id: 'contabilidad', label: 'Ver y registrar contabilidad', roles: ['admin'] },
  { id: 'menu', label: 'Editar menú, precios y fotos', roles: ['admin'] },
  { id: 'ajustes', label: 'Gestionar usuarios, ajustes y copias', roles: ['admin'] },
];

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  const p = PERMISSIONS.find((x) => x.id === perm);
  return !!p && p.roles.includes(role);
}

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}
