import { useState } from 'react';
import type { BizType } from '../types';
import { useStore } from '../store';
import { BIZ_TYPES, CATALOGS } from '../data/catalogs';
import { ADMIN_ID, demoData, emptyData } from '../data/initial';
import { hashPin, pinProblem } from '../lib/pin';
import { BizIcon } from '../components/ProductIcon';
import { Icon } from '../components/Icon';

/** Primera vez: tipo de negocio, nombre y administrador. */
export function Bienvenida() {
  const load = useStore((s) => s.load);
  const [type, setType] = useState<BizType>('cafe');
  const [name, setName] = useState('');
  const [admin, setAdmin] = useState('');
  const [demo, setDemo] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [tried, setTried] = useState(false);

  const pinError = pinProblem(pin) ?? (pin !== pin2 ? 'Los dos PIN no coinciden.' : null);

  const start = async () => {
    setTried(true);
    if (pinError) return;
    const bizName = name.trim() || CATALOGS[type].defaultName;
    const pinHash = await hashPin(ADMIN_ID, pin);
    load(demo ? demoData(type, bizName, admin.trim(), Date.now(), pinHash) : emptyData(type, bizName, admin.trim(), pinHash));
    window.location.hash = '#/caja';
  };
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="card col" style={{ width: 'min(46rem, 100%)', padding: '2rem', gap: '1.5rem', borderRadius: 24 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Bienvenido a POS Moderno</h1>
          <p className="muted" style={{ margin: 0, fontSize: '1rem' }}>Tres datos y empiezas a vender. Todo se puede cambiar después en Ajustes.</p>
        </div>

        <div className="field">
          <span className="label">¿Qué tipo de negocio tienes?</span>
          <div role="radiogroup" aria-label="Tipo de negocio" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7.5rem, 1fr))', gap: 8 }}>
            {BIZ_TYPES.map((t) => {
              const active = type === t;
              return (
                <button key={t} type="button" role="radio" aria-checked={active} onClick={() => setType(t)}
                  style={{ height: 84, border: 0, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 700, background: active ? 'var(--accent)' : '#fff', color: active ? '#fff' : 'var(--ink)', boxShadow: active ? 'none' : 'var(--shadow-ring)' }}>
                  <BizIcon type={t} size={26} />
                  {CATALOGS[t].label}
                </button>
              );
            })}
          </div>
          <span className="small" style={{ color: 'var(--ink-2)' }}>{CATALOGS[type].hint}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: 16 }}>
          <label className="field">
            <span className="label">Nombre del negocio</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={CATALOGS[type].defaultName} />
          </label>
          <label className="field">
            <span className="label">Tu nombre (administrador)</span>
            <input className="input" value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="Ej. Laura Gómez" />
          </label>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: 16 }}>
            <label className="field">
              <span className="label">Tu PIN de 4 números</span>
              <input className="input num" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin}
                onChange={(e) => setPin(digits(e.target.value))} placeholder="••••" style={{ letterSpacing: '0.4em' }} />
            </label>
            <label className="field">
              <span className="label">Repite el PIN</span>
              <input className="input num" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin2}
                onChange={(e) => setPin2(digits(e.target.value))} placeholder="••••" style={{ letterSpacing: '0.4em' }} />
            </label>
          </div>
          <span role={tried && pinError ? 'alert' : undefined} className="small" style={{ color: tried && pinError ? 'var(--bad-ink)' : 'var(--ink-3)', fontWeight: tried && pinError ? 700 : 400 }}>
            {tried && pinError ? pinError : 'Lo pedimos al cambiar de usuario en la caja, para que nadie entre como administrador sin permiso.'}
          </span>
        </div>

        <button type="button" role="switch" aria-checked={demo} onClick={() => setDemo(!demo)}
          className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: 0, borderRadius: 14, background: 'var(--bg)', textAlign: 'left' }}>
          <span className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Cargar datos de ejemplo para probar</span>
            <span className="small" style={{ color: 'var(--ink-3)' }}>Solo para conocer la app: ventas, gastos y usuarios inventados. Déjalo apagado para empezar con tu negocio real.</span>
          </span>
          <span className="switch" aria-hidden="true" />
        </button>

        <button type="button" className="btn btn-primary btn-lg" onClick={start}>
          Empezar <Icon name="arrowRight" stroke={2.4} />
        </button>
        <span className="small" style={{ color: 'var(--ink-3)', textAlign: 'center' }}>Los datos se guardan en este equipo. Haz copias de seguridad desde Ajustes.</span>
      </div>
    </div>
  );
}
