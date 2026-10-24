import { useState } from 'react';
import { useCatalog, useCurrentUser } from '../store';
import { can, roleLabel, type Permission } from '../data/roles';
import { Icon } from '../components/Icon';
import { SwitchUserDialog, initials } from '../components/SwitchUserDialog';
import { Brand } from '../components/Brand';
import type { Route } from '../router';

interface Card {
  route: Route;
  title: string;
  desc: string;
  icon: string;
  perm?: Permission;
  onlyTables?: boolean;
}

const CARDS: Card[] = [
  { route: 'caja', title: 'Caja', desc: 'Cobrar y tomar pedidos', icon: 'register' },
  { route: 'mesas', title: 'Mesas', desc: 'Plano del salón, cuentas y reservas', icon: 'table', perm: 'cobrar', onlyTables: true },
  { route: 'menu', title: 'Menú', desc: 'Productos, precios, fotos y opciones', icon: 'image', perm: 'menu' },
  { route: 'ordenes', title: 'Órdenes', desc: 'Pedidos nuevos, en preparación y listos', icon: 'receipt', perm: 'ordenes' },
  { route: 'inventario', title: 'Inventario', desc: 'Insumos, existencias y faltantes', icon: 'box' },
  { route: 'reportes', title: 'Reportes', desc: 'Ventas por hora, día y medio de pago', icon: 'chart', perm: 'reportes' },
  { route: 'contabilidad', title: 'Contabilidad', desc: 'Ingresos, gastos y utilidad', icon: 'ledger', perm: 'contabilidad' },
  { route: 'ajustes', title: 'Ajustes', desc: 'Apariencia, roles y copias de seguridad', icon: 'gear', perm: 'ajustes' },
];

export function Modulos() {
  const catalog = useCatalog();
  const user = useCurrentUser();
  const [switching, setSwitching] = useState(false);
  const cards = CARDS.filter((c) => !c.onlyTables || catalog.hasTables);

  return (
    <div className="app">
      <main className="main" style={{ padding: '1.5rem 2rem 2rem', gap: '1.5rem' }}>
        <header className="header">
          <a className="btn btn-white" href="#/caja"><Icon name="arrowLeft" size={18} stroke={2.2} /> Volver a caja</a>
          <div className="spacer"><Brand sub={catalog.label} /></div>
        </header>

        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div className="col grow" style={{ gap: 4 }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Módulos</h1>
            <p className="muted" style={{ margin: 0, fontSize: '1rem' }}>Elige a dónde quieres ir.</p>
          </div>
          <button type="button" className="card row" onClick={() => setSwitching(true)} style={{ padding: '10px 14px', gap: 12, border: 0, textAlign: 'left' }}>
            <span className="avatar" aria-hidden="true">{user ? initials(user.name) : '?'}</span>
            <span className="col" style={{ gap: 2 }}>
              <span className="small" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Usuario en la caja · {user ? roleLabel(user.role) : 'sin rol'}</span>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>{user?.name ?? 'Elegir usuario'}</span>
            </span>
            <span className="btn btn-sm" style={{ marginLeft: 8 }}><Icon name="users" size={16} /> Cambiar</span>
          </button>
        </div>

        {user?.role === 'admin' && !user.pinHash && (
          <div className="notice notice-warn" role="status">
            <Icon name="lock" size={18} />
            <span className="grow">No tienes PIN: cualquiera puede entrar como administrador desde esta pantalla.</span>
            <a className="btn btn-sm btn-white" href="#/ajustes/roles">Poner mi PIN</a>
          </div>
        )}
        {switching && <SwitchUserDialog onClose={() => setSwitching(false)} />}

        <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gridAutoRows: 'minmax(11rem, 1fr)', gap: 16 }}>
          {cards.map((c) => {
            const locked = c.perm ? !can(user?.role, c.perm) : false;
            const here = c.route === 'caja';
            return (
              <a key={c.route} href={`#/${c.route}`} className="card"
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24, borderRadius: 20, textDecoration: 'none', color: here ? '#fff' : 'var(--ink)', background: here ? 'var(--accent)' : '#fff', boxShadow: here ? 'none' : undefined, opacity: locked ? 0.6 : 1 }}>
                <Icon name={c.icon} size={40} stroke={1.6} />
                <span className="col" style={{ gap: 4 }}>
                  <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>{c.title}</span>
                  <span style={{ fontSize: '0.875rem', color: here ? 'rgba(255,255,255,.9)' : 'var(--ink-3)' }}>{c.desc}</span>
                </span>
                {locked ? (
                  <span className="tag" style={{ position: 'absolute', top: 20, right: 20 }}><Icon name="info" size={12} stroke={2.6} /> Sin acceso</span>
                ) : (
                  <span aria-hidden="true" style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 999, background: here ? 'rgba(255,255,255,.2)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="arrowRight" size={16} stroke={2.4} />
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
