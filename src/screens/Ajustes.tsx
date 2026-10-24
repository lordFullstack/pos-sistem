import { useEffect, useState } from 'react';
import type { BackupEntry, BizType, Role, TaxMode, User } from '../types';
import { useCatalog, useCurrentUser, useStore } from '../store';
import { BIZ_TYPES, CATALOGS } from '../data/catalogs';
import { PERMISSIONS, ROLES, can, roleLabel } from '../data/roles';
import { buildLine } from '../lib/cart';
import { TAX, dateTime } from '../lib/format';
import { parseBackup, sizeLabel, type BackupFile } from '../lib/backup';
import { backupNow, downloadLocalBackup, listLocalBackups, readLocalBackup, restoreFiles } from '../lib/backupStore';
import { ADMIN_ID, demoData } from '../data/initial';
import { Icon } from '../components/Icon';
import { BizIcon } from '../components/ProductIcon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';
import { Dialog } from '../components/Dialog';
import { Receipt } from '../components/Receipt';
import { PinPad } from '../components/PinPad';
import { hashPin, pinProblem } from '../lib/pin';

type Section = 'brand' | 'roles' | 'backup';

const SWATCHES: [string, string][] = [['#1F5F45', 'Verde'], ['#2B2B2B', 'Grafito'], ['#8A3B12', 'Terracota'], ['#1E4E8C', 'Azul'], ['#7A2848', 'Vino']];

export function Ajustes({ initialSection }: { initialSection?: string }) {
  const user = useCurrentUser();
  const [section, setSection] = useState<Section>(
    initialSection === 'roles' || initialSection === 'backup' ? initialSection : 'brand',
  );
  const [selUser, setSelUser] = useState('');
  if (!can(user?.role, 'ajustes')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Ajustes" /></header><NoAccess what="los ajustes" /><ModuleNav current="ajustes" /></main></div>;
  }
  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand title="Ajustes" icon={<Icon name="gear" size={22} />} sub="Solo administradores · los cambios se guardan solos" />
        </header>
        <nav className="chips" aria-label="Secciones de ajustes">
          {([['brand', 'Negocio y apariencia'], ['roles', 'Usuarios y roles'], ['backup', 'Copias de seguridad']] as [Section, string][]).map(([id, label]) => (
            <button key={id} type="button" className="chip" aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>
          ))}
        </nav>
        {section === 'brand' && <BrandSection />}
        {section === 'roles' && <RolesSection sel={selUser} onSelect={setSelUser} />}
        {section === 'backup' && <BackupSection />}
        <ModuleNav current="ajustes" />
      </main>
      <aside className="aside">
        {section === 'brand' && <PreviewPanel />}
        {section === 'roles' && <UserPanel key={selUser} sel={selUser} />}
        {section === 'backup' && <RestorePanel />}
      </aside>
    </div>
  );
}

/* ---------------- Negocio y apariencia ---------------- */

function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = url;
  });
}

function BrandSection() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const setBizType = useStore((s) => s.setBizType);
  const [pending, setPending] = useState<BizType | null>(null);
  const [logoError, setLogoError] = useState('');

  return (
    <section className="card" aria-label="Negocio y apariencia" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '22px 24px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 24px', alignContent: 'start' }}>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <span className="label">Tipo de negocio</span>
        <div role="radiogroup" aria-label="Tipo de negocio" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
          {BIZ_TYPES.map((t) => {
            const active = settings.bizType === t;
            return (
              <button key={t} type="button" role="radio" aria-checked={active} onClick={() => !active && setPending(t)}
                style={{ height: 64, border: 0, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 700, background: active ? 'var(--accent)' : '#fff', color: active ? '#fff' : 'var(--ink)', boxShadow: active ? 'none' : 'var(--shadow-ring)' }}>
                <BizIcon type={t} size={22} />
                {CATALOGS[t].label}
              </button>
            );
          })}
        </div>
        <span className="small" style={{ color: 'var(--ink-2)' }}>{CATALOGS[settings.bizType].hint}</span>
      </div>

      <div className="row" style={{ gridColumn: '1 / -1', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div className="field">
          <span className="label">Logotipo</span>
          <div className="row" style={{ gap: 8 }}>
            <label style={{ position: 'relative', width: 76, height: 76, borderRadius: 14, background: 'var(--bg)', boxShadow: 'inset 0 0 0 2px #d6d0c9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', cursor: 'pointer', color: 'var(--ink-2)' }}>
              {settings.logo ? <img src={settings.logo} alt="Logotipo actual" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : (<><Icon name="image" size={22} /><span style={{ fontSize: 11, fontWeight: 700 }}>Subir</span></>)}
              <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" aria-label="Subir logotipo" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    update({ logo: await resizeLogo(f) });
                    setLogoError('');
                  } catch (err) {
                    setLogoError((err as Error).message);
                  }
                }} />
            </label>
            {settings.logo && <button type="button" className="btn btn-sm btn-danger" onClick={() => update({ logo: '' })}>Quitar</button>}
          </div>
        </div>
        <label className="field" style={{ flex: '1.3 1 12rem' }}>
          <span className="label">Nombre del negocio</span>
          <input className="input" value={settings.bizName} onChange={(e) => update({ bizName: e.target.value })} />
        </label>
        <label className="field" style={{ flex: '1 1 10rem' }}>
          <span className="label">NIT</span>
          <input className="input" value={settings.nit} onChange={(e) => update({ nit: e.target.value })} placeholder="Ej. 900.123.456-7" />
        </label>
      </div>
      <span className="small" style={{ gridColumn: '1 / -1', marginTop: -8, color: logoError ? 'var(--bad-ink)' : 'var(--ink-3)' }}>
        {logoError || 'Logotipo en PNG o SVG con fondo transparente. Sale en la caja y en el recibo.'}
      </span>

      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <span className="label">Color principal</span>
        <div className="chips" role="group" aria-label="Color principal">
          {SWATCHES.map(([hex, label]) => {
            const active = settings.accent.toLowerCase() === hex.toLowerCase();
            return (
              <button key={hex} type="button" className="chip" aria-pressed={active} onClick={() => update({ accent: hex })}
                style={{ height: 48, padding: '0 16px 0 8px', background: '#fff', color: 'var(--ink)', boxShadow: active ? `0 0 0 2px ${hex}` : 'var(--shadow-ring)' }}>
                <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 999, background: hex, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active && <Icon name="check" size={16} stroke={3} />}</span>
                {label}
              </button>
            );
          })}
          <label className="chip" style={{ height: 48, padding: '0 16px 0 8px', cursor: 'pointer' }}>
            <input type="color" value={settings.accent} onChange={(e) => update({ accent: e.target.value })} aria-label="Otro color" style={{ width: 32, height: 32, border: 0, padding: 0, borderRadius: 999, background: 'transparent' }} />
            Otro
          </label>
        </div>
      </div>

      <div className="field">
        <span className="label">Impuesto al consumidor</span>
        <div className="seg" role="group" aria-label="Impuesto">
          {(Object.keys(TAX) as TaxMode[]).map((k) => <button key={k} type="button" aria-pressed={settings.tax === k} onClick={() => update({ tax: k })}>{TAX[k].label}</button>)}
        </div>
      </div>
      <div className="field">
        <span className="label">Tamaño del texto</span>
        <div className="seg" role="group" aria-label="Tamaño del texto">
          <button type="button" aria-pressed={settings.textSize === 'normal'} onClick={() => update({ textSize: 'normal' })}>Normal</button>
          <button type="button" aria-pressed={settings.textSize === 'grande'} onClick={() => update({ textSize: 'grande' })}>Grande</button>
        </div>
      </div>
      <label className="field" style={{ gridColumn: '1 / -1' }}>
        <span className="label">Mensaje al pie del recibo</span>
        <input className="input" value={settings.footer} onChange={(e) => update({ footer: e.target.value })} />
      </label>

      {pending && (
        <Dialog title={`Cambiar a ${CATALOGS[pending].label}`} subtitle="Cambian las opciones de la caja (mesas, para llevar). Las ventas, órdenes y gastos se conservan." onClose={() => setPending(null)} width="32rem"
          footer={
            <div className="col" style={{ width: '100%', gap: 8 }}>
              <button type="button" className="btn btn-primary btn-md" onClick={() => { setBizType(pending, true); setPending(null); }}>Cambiar y usar el menú e insumos de {CATALOGS[pending].label.toLowerCase()}</button>
              <button type="button" className="btn btn-md" onClick={() => { setBizType(pending, false); setPending(null); }}>Cambiar y conservar mi menú e inventario</button>
            </div>
          }>
          <span className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{CATALOGS[pending].hint}</span>
        </Dialog>
      )}
    </section>
  );
}

function PreviewPanel() {
  const catalog = useCatalog();
  const accent = useStore((s) => s.settings.accent);
  const lines = catalog.items.slice(0, 3).map((p) => buildLine(p, Object.fromEntries((p.opts ?? []).map((g, gi) => [gi, g.type === 'one' ? [0] : g.min ? [0] : []]))));
  return (
    <div className="col" style={{ flex: '1 1 auto', gap: 14 }}>
      <div className="col" style={{ gap: 2 }}>
        <h2 className="section-title">Vista previa</h2>
        <span className="muted">Así se verá el recibo y el botón de cobro.</span>
      </div>
      <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
        <Receipt lines={lines} title="Orden de ejemplo" />
      </div>
      <div className="col" style={{ marginTop: 'auto', gap: 8 }}>
        <span className="label" style={{ color: 'var(--ink-2)' }}>Botón principal</span>
        <span className="btn btn-primary btn-lg" style={{ background: accent }}>Cobrar</span>
      </div>
    </div>
  );
}

/* ---------------- Usuarios y roles ---------------- */

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function RolesSection({ sel, onSelect: setSel }: { sel: string; onSelect: (id: string) => void }) {
  const users = useStore((s) => s.users);
  const current = useCurrentUser();
  const addUser = useStore((s) => s.addUser);
  const [adding, setAdding] = useState(false);
  return (
    <div className="col" style={{ flex: '1 1 auto', minHeight: 0, gap: 12 }}>
      <section aria-label="Roles" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {ROLES.map((r) => {
          const n = users.filter((u) => u.role === r.id).length;
          return (
            <div key={r.id} className="card col" style={{ padding: '14px 18px', gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{r.label}</span>
                <span className="small" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{n === 1 ? '1 usuario' : `${n} usuarios`}</span>
              </div>
              <span className="muted">{r.desc}</span>
            </div>
          );
        })}
      </section>
      <section className="card col" aria-label="Usuarios" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', gap: 0 }}>
        <div className="card-head">
          <h2>Usuarios</h2>
          <button type="button" className="btn btn-sm spacer" onClick={() => setAdding(true)}><Icon name="plus" size={16} stroke={2.4} /> Agregar usuario</button>
        </div>
        <div className="scroll">
          {users.map((u) => (
            <button key={u.id} type="button" className="list-row" aria-pressed={(sel || current?.id) === u.id} onClick={() => setSel(u.id)}>
              <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 999, background: '#eae6e1', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{initials(u.name)}</span>
              <span className="col grow" style={{ gap: 2 }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{u.name}{u.id === current?.id ? ' (tú)' : ''}</span>
                <span className="small" style={{ color: 'var(--ink-3)' }}>{u.email || 'Sin correo'}</span>
              </span>
              <span className="tag">{roleLabel(u.role)}</span>
              {u.pinHash ? (
                <span className="tag" title="Tiene PIN"><Icon name="lock" size={12} stroke={2.4} /> PIN</span>
              ) : (
                <span className="tag tag-warn">Sin PIN</span>
              )}
              <span className={`tag ${u.active ? 'tag-ok' : ''}`} style={{ minWidth: 86, justifyContent: 'center' }}>{u.active ? 'Activo' : 'Sin acceso'}</span>
            </button>
          ))}
        </div>
      </section>
      {adding && <AddUserDialog onClose={() => setAdding(false)} onSave={(u) => { setSel(addUser(u)); setAdding(false); }} />}
    </div>
  );
}

function UserPanel({ sel }: { sel: string }) {
  const users = useStore((s) => s.users);
  const current = useCurrentUser();
  const updateUser = useStore((s) => s.updateUser);
  const [error, setError] = useState('');
  const [pinDialog, setPinDialog] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const u = users.find((x) => x.id === sel) ?? current ?? users[0];
  if (!u) return null;
  const patch = (p: Partial<User>) => setError(updateUser(u.id, p) ?? '');
  const first = u.name.split(' ')[0];
  return (
    <div className="col" style={{ flex: '1 1 auto', minHeight: 0, gap: 14 }}>
      <div className="row">
        <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 999, background: '#eae6e1', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(u.name)}</span>
        <div className="col grow" style={{ gap: 2 }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{u.name}</span>
          <span className="muted">{u.email || 'Sin correo'}</span>
        </div>
      </div>
      <div className="field">
        <span className="label">Rol asignado</span>
        <div role="radiogroup" aria-label="Rol asignado" className="col" style={{ gap: 6 }}>
          {ROLES.map((r) => {
            const active = u.role === r.id;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={active} onClick={() => patch({ role: r.id })}
                className="row" style={{ padding: '10px 14px', border: 0, borderRadius: 12, textAlign: 'left', background: '#fff', boxShadow: active ? 'var(--ring-active)' : 'var(--shadow-ring)' }}>
                <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 999, flex: '0 0 auto', border: active ? '6px solid var(--accent)' : '2px solid #a8a29e' }} />
                <span className="col" style={{ gap: 1 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{r.label}</span>
                  <span className="small" style={{ color: 'var(--ink-3)' }}>{r.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {error && <div className="notice notice-warn" role="alert"><Icon name="warning" size={16} /> {error}</div>}
      <div className="scroll col" style={{ gap: 2 }}>
        <span className="label" style={{ paddingBottom: 6 }}>Lo que puede hacer</span>
        {PERMISSIONS.map((p) => {
          const ok = can(u.role, p.id);
          return (
            <div key={p.id} className="row" style={{ gap: 10, padding: '5px 0', fontSize: '0.8125rem', fontWeight: 600, color: ok ? 'var(--ink)' : '#8a817a' }}>
              <Icon name={ok ? 'check' : 'x'} size={16} stroke={ok ? 2.8 : 2.4} style={{ color: ok ? 'var(--ok-ink)' : '#a8a29e' }} />
              <span>{p.label}</span>
              <span className="sr-only">{ok ? '(permitido)' : '(no permitido)'}</span>
            </div>
          );
        })}
      </div>
      <div className="col" style={{ gap: 10, padding: 14, borderRadius: 14, background: u.pinHash ? 'var(--bg)' : 'var(--warn-bg)' }}>
        <div className="row" style={{ gap: 10 }}>
          <Icon name="lock" size={20} style={{ color: u.pinHash ? 'var(--ink-2)' : 'var(--warn-ink)' }} />
          <span className="col grow" style={{ gap: 2 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{u.pinHash ? 'Tiene PIN de acceso' : 'Sin PIN de acceso'}</span>
            <span className="small" style={{ color: u.pinHash ? 'var(--ink-3)' : '#5c2a0a' }}>
              {u.pinHash ? `Se pide al cambiar a ${first} en la caja.` : `Cualquiera puede entrar como ${first}.`}
            </span>
          </span>
        </div>
        {confirmRemove ? (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="grow small" style={{ fontWeight: 700 }}>¿Quitar el PIN de {first}?</span>
            <button type="button" className="btn btn-sm btn-white" onClick={() => setConfirmRemove(false)}>No</button>
            <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }} onClick={() => { patch({ pinHash: undefined }); setConfirmRemove(false); setPinMsg('PIN quitado.'); }}>Sí, quitar</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-sm btn-white grow" onClick={() => { setPinDialog(true); setPinMsg(''); }}>{u.pinHash ? 'Cambiar PIN' : 'Poner PIN'}</button>
            {u.pinHash && <button type="button" className="btn btn-sm btn-danger" onClick={() => { setConfirmRemove(true); setPinMsg(''); }}>Quitar</button>}
          </div>
        )}
        {pinMsg && <span role="status" className="small" style={{ fontWeight: 700, color: 'var(--ok-ink)' }}>{pinMsg}</span>}
      </div>
      <button type="button" role="switch" aria-checked={u.active} onClick={() => patch({ active: !u.active })}
        className="row" style={{ justifyContent: 'space-between', height: 52, padding: '0 14px', border: 0, borderRadius: 12, background: 'var(--bg)', fontSize: '0.875rem', fontWeight: 700 }}>
        <span>Acceso activo</span>
        <span className="switch" aria-hidden="true" />
      </button>
      {pinDialog && (
        <SetPinDialog user={u} onClose={() => setPinDialog(false)}
          onSave={(pinHash) => { patch({ pinHash }); setPinDialog(false); setPinMsg(`PIN guardado para ${first}.`); }} />
      )}
    </div>
  );
}

/** Pide el PIN nuevo dos veces y guarda solo su resumen. */
function SetPinDialog({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (pinHash: string) => void }) {
  const [step, setStep] = useState<'new' | 'repeat'>('new');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const onComplete = async (value: string) => {
    if (step === 'new') {
      const problem = pinProblem(value);
      if (problem) {
        setError(problem);
        setPin('');
        return;
      }
      setFirst(value);
      setPin('');
      setError('');
      setStep('repeat');
      return;
    }
    if (value !== first) {
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setPin('');
      setFirst('');
      setStep('new');
      return;
    }
    onSave(await hashPin(user.id, value));
  };
  return (
    <Dialog title={`PIN de ${user.name.split(' ')[0]}`} subtitle={step === 'new' ? 'Escribe un PIN nuevo de 4 números' : 'Repite el PIN para confirmar'} onClose={onClose} width="26rem">
      <PinPad label={step === 'new' ? 'PIN nuevo' : 'Repetir PIN'} value={pin} onChange={(v) => { setPin(v); if (v) setError(''); }} onComplete={onComplete} error={error} />
      <span className="small" style={{ color: 'var(--ink-3)', textAlign: 'center' }}>Evita 1234, 0000 o números repetidos. El PIN no se puede ver después, solo cambiar.</span>
    </Dialog>
  );
}

function AddUserDialog({ onClose, onSave }: { onClose: () => void; onSave: (u: Omit<User, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('cajero');
  return (
    <Dialog title="Agregar usuario" onClose={onClose} width="30rem"
      footer={<button type="button" className="btn btn-primary btn-lg" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), email: email.trim(), role, active: true })}>Guardar usuario</button>}>
      <label className="field"><span className="label">Nombre</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
      <label className="field"><span className="label">Correo <span className="muted">(opcional)</span></span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <div className="field"><span className="label">Rol</span>
        <div className="seg">{ROLES.map((r) => <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => setRole(r.id)}>{r.label}</button>)}</div>
      </div>
    </Dialog>
  );
}

/* ---------------- Copias de seguridad ---------------- */

function BackupSection() {
  const snapshot = useStore((s) => s.snapshot);
  const load = useStore((s) => s.load);
  const user = useCurrentUser();
  const [list, setList] = useState<BackupEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    listLocalBackups().then(setList).catch(() => setList([]));
  }, []);

  const create = async () => {
    setBusy(true);
    setNotice(null);
    try {
      setList(await backupNow(snapshot(), user?.name ?? ''));
      setNotice({ ok: true, text: 'Copia creada y descargada, con las fotos del menú. Guárdala fuera de la tablet (correo, Drive o una USB).' });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
      listLocalBackups().then(setList).catch(() => undefined);
    }
    setBusy(false);
  };

  const restore = async (id: string) => {
    setConfirm('');
    try {
      const f = await readLocalBackup(id);
      if (!f) return setNotice({ ok: false, text: 'No se encontró esa copia en este equipo.' });
      load(await restoreFiles(f));
      setNotice({ ok: true, text: `Datos restaurados desde la copia del ${dateTime(f.createdAt)}.` });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="col" style={{ flex: '1 1 auto', minHeight: 0, gap: 12 }}>
      <section className="card row" aria-label="Copia manual" style={{ padding: '20px 22px', gap: 20, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><Icon name="database" size={28} stroke={1.8} /></span>
        <div className="col grow" style={{ gap: 4 }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>Copia de seguridad manual</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Guarda ventas, órdenes, mesas, inventario, gastos, usuarios y ajustes en un solo archivo.</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Última copia: {list[0] ? dateTime(list[0].at) : 'Nunca'}</span>
        </div>
        <button type="button" className="btn btn-primary" style={{ height: 56, padding: '0 22px', fontSize: '1rem', borderRadius: 14 }} disabled={busy} onClick={create}>
          <Icon name="download" /> {busy ? 'Creando copia…' : 'Crear copia ahora'}
        </button>
      </section>

      {notice && <div className={`notice ${notice.ok ? 'notice-ok' : 'notice-warn'}`} role="status"><Icon name={notice.ok ? 'check' : 'warning'} size={16} stroke={2.6} /> {notice.text}</div>}

      <section className="card col" aria-label="Copias guardadas" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', gap: 0 }}>
        <div className="card-head">
          <h2>Copias guardadas en este equipo</h2>
          <span className="muted spacer">{list.length === 1 ? '1 copia' : `${list.length} copias`} · se guardan las últimas 5</span>
        </div>
        <div className="scroll">
          {list.length === 0 && <div className="empty"><strong>Todavía no hay copias</strong><span>Crea la primera con el botón de arriba.</span></div>}
          {list.map((b) => (
            <div key={b.id} className="col" style={{ boxShadow: '0 1px 0 var(--line-2)' }}>
              <div className="row" style={{ padding: '12px 18px', gap: 14 }}>
                <span className="col grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{dateTime(b.at)}</span>
                  <span className="small" style={{ color: 'var(--ink-3)' }}>Manual · {b.by || 'Sin usuario'} · {sizeLabel(b.size)}</span>
                </span>
                <button type="button" className="btn btn-sm" onClick={() => void downloadLocalBackup(b.id)} aria-label={`Descargar copia del ${dateTime(b.at)}`}>
                  <Icon name="download" size={16} /> Descargar
                </button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setConfirm(b.id)}>Restaurar</button>
              </div>
              {confirm === b.id && (
                <div className="notice notice-warn" role="alertdialog" aria-label="Confirmar restauración" style={{ margin: '0 18px 12px', fontWeight: 600 }}>
                  <Icon name="warning" size={18} />
                  <span className="grow">Los datos actuales se reemplazan por esta copia. Esto no se puede deshacer.</span>
                  <button type="button" className="btn btn-sm btn-white" onClick={() => setConfirm('')}>Cancelar</button>
                  <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }} onClick={() => restore(b.id)}>Sí, restaurar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RestorePanel() {
  const load = useStore((s) => s.load);
  const resetAll = useStore((s) => s.resetAll);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const user = useCurrentUser();
  const [file, setFile] = useState<BackupFile | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [danger, setDanger] = useState<'demo' | 'reset' | null>(null);

  return (
    <div className="col" style={{ flex: '1 1 auto', gap: 16 }}>
      <div className="col" style={{ gap: 2 }}>
        <h2 className="section-title">Restaurar desde un archivo</h2>
        <span className="muted" style={{ lineHeight: 1.45 }}>Usa un archivo de copia descargado antes, por ejemplo al cambiar de tablet.</span>
      </div>
      <label style={{ position: 'relative', padding: '28px 20px', borderRadius: 16, boxShadow: 'inset 0 0 0 2px #d6d0c9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', cursor: 'pointer' }}>
        <Icon name="upload" size={32} stroke={1.8} />
        <span style={{ fontSize: '0.9375rem', fontWeight: 800 }}>Elegir archivo de copia</span>
        <span className="small" style={{ color: 'var(--ink-3)' }}>Archivo .backup creado por este POS</span>
        <input type="file" accept=".backup,.json,application/json" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            setDone('');
            if (!f) return;
            try {
              setFile(parseBackup(await f.text()));
              setError('');
            } catch (err) {
              setError((err as Error).message);
            }
          }} />
      </label>
      {error && <div className="notice notice-warn" role="alert"><Icon name="warning" size={16} /> {error}</div>}
      {done && <div className="notice notice-ok" role="status"><Icon name="check" size={16} stroke={3} /> {done}</div>}
      {file && (
        <div className="notice notice-warn" role="alertdialog" aria-label="Confirmar restauración" style={{ flexDirection: 'column', alignItems: 'stretch', fontWeight: 600 }}>
          <span>Copia del {dateTime(file.createdAt)} ({file.data.settings.bizName}). Reemplaza todos los datos actuales.</span>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-sm btn-white" onClick={() => setFile(null)}>Cancelar</button>
            <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }} onClick={async () => {
              try {
                load(await restoreFiles(file));
                setDone('Datos restaurados desde el archivo.');
              } catch (err) {
                setError((err as Error).message);
              }
              setFile(null);
            }}>Sí, restaurar</button>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: 'var(--line-2)' }} />

      <button type="button" role="switch" aria-checked={settings.remindBackup} onClick={() => update({ remindBackup: !settings.remindBackup })}
        className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: 0, borderRadius: 12, background: 'var(--bg)', textAlign: 'left' }}>
        <span className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Recordarme al cerrar caja</span>
          <span className="small" style={{ color: 'var(--ink-3)' }}>Pide hacer una copia en cada cierre de turno.</span>
        </span>
        <span className="switch" aria-hidden="true" />
      </button>

      <div className="col" style={{ gap: 8, marginTop: 'auto' }}>
        <span className="label">Zona de cuidado</span>
        {danger ? (
          <div className="notice notice-warn" role="alertdialog" style={{ flexDirection: 'column', alignItems: 'stretch', fontWeight: 600 }}>
            <span>{danger === 'demo' ? 'Se reemplazan todos los datos por datos de ejemplo.' : 'Se borran todos los datos de este equipo y vuelves al inicio.'} Haz una copia antes si la necesitas.</span>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm btn-white" onClick={() => setDanger(null)}>Cancelar</button>
              <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }}
                onClick={() => {
                  if (danger === 'demo') {
                    // Conserva el PIN del administrador principal para no dejar la caja abierta.
                    const admin = useStore.getState().users.find((x) => x.id === ADMIN_ID);
                    load(demoData(settings.bizType, settings.bizName, admin?.name ?? user?.name ?? '', Date.now(), admin?.pinHash));
                  }
                  else resetAll();
                  setDanger(null);
                }}>{danger === 'demo' ? 'Cargar ejemplo' : 'Borrar todo'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" className="btn btn-md" onClick={() => setDanger('demo')}>Cargar datos de ejemplo</button>
            <button type="button" className="btn btn-md btn-danger" onClick={() => setDanger('reset')}>Borrar todo</button>
          </div>
        )}
      </div>
    </div>
  );
}
