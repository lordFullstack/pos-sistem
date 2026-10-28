import { useEffect, useMemo, useState } from 'react';
import type { DiningTable, PayMethod, TableStatus } from '../types';
import { useCatalog, useCurrentUser, useStore } from '../store';
import { useCart } from '../cartStore';
import { mergeLines, totals } from '../lib/cart';
import { TAX, minutesSince, money } from '../lib/format';
import { FLOOR_H, FLOOR_W, MAX_SEATS, ZONE_NAMES, clampToFloor, freeSpot, tableGeom, tableLabel } from '../data/tables';
import { can } from '../data/roles';
import { useFitScale } from '../lib/useFitScale';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';
import { Dialog } from '../components/Dialog';
import { PrintReceipt } from '../components/Receipt';

const LOOK: Record<TableStatus, { label: string; tag: string; swatch: string }> = {
  libre: { label: 'Libre', tag: '', swatch: 't-libre' },
  ocupada: { label: 'Ocupada', tag: 'tag-ok', swatch: 't-ocupada' },
  cuenta: { label: 'Por cobrar', tag: 'tag-warn', swatch: 't-cuenta' },
  reservada: { label: 'Reservada', tag: 'tag-info', swatch: 't-reservada' },
};

const PAY: [PayMethod, string][] = [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['transferencia', 'Transferencia']];

export function Mesas() {
  const catalog = useCatalog();
  const user = useCurrentUser();
  const settings = useStore((s) => s.settings);
  const tables = useStore((s) => s.tables);
  const orders = useStore((s) => s.orders);
  const st = useStore();

  const [zone, setZone] = useState<DiningTable['zone']>('salon');
  const [sel, setSel] = useState(() => tables.find((t) => t.status !== 'libre')?.id ?? tables[0]?.id ?? '');
  const [pay, setPay] = useState<PayMethod>('tarjeta');
  const [dialog, setDialog] = useState<'reserve' | 'move' | null>(null);
  const [notice, setNotice] = useState('');
  const [printing, setPrinting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; sx: number; sy: number; x0: number; y0: number; moved: boolean } | null>(null);
  const [, tick] = useState(0);
  const { ref, scale } = useFitScale(FLOOR_W, FLOOR_H);

  // Refresca los minutos cada 30 s.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const openOrdersBy = useMemo(() => {
    const m: Record<string, typeof orders> = {};
    orders.filter((o) => o.tableId && !o.paid && o.status !== 'cancelada').forEach((o) => (m[o.tableId!] = [...(m[o.tableId!] ?? []), o]));
    return m;
  }, [orders]);

  if (!catalog.hasTables) {
    return (
      <div className="app"><main className="main">
        <header className="header"><Brand sub="Mesas" /></header>
        <div className="empty card" style={{ flex: '1 1 auto' }}>
          <Icon name="table" size={36} stroke={1.6} />
          <strong>Las mesas son para restaurantes</strong>
          <span>Cambia el tipo de negocio a Restaurante en Ajustes para activar el plano de mesas.</span>
          <a className="btn btn-white" href="#/ajustes">Ir a Ajustes</a>
        </div>
        <ModuleNav current="mesas" />
      </main></div>
    );
  }
  if (!can(user?.role, 'cobrar')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Mesas" /></header><NoAccess what="las mesas" /><ModuleNav current="mesas" /></main></div>;
  }

  const canEdit = can(user?.role, 'ajustes');
  const inZone = tables.filter((t) => t.zone === zone);
  const busy = tables.filter((t) => t.status === 'ocupada' || t.status === 'cuenta');
  const people = busy.reduce((a, t) => a + t.guests, 0);
  const table = tables.find((t) => t.id === sel) ?? inZone[0];
  const tOrders = table ? openOrdersBy[table.id] ?? [] : [];
  const lines = mergeLines(tOrders.map((o) => o.lines));
  const tt = totals(lines, settings.tax);
  const decor = zone === 'salon'
    ? [{ x: 40, y: 430, w: 460, h: 56, label: 'Barra' }, { x: 640, y: 450, w: 150, h: 36, label: 'Entrada' }]
    : [{ x: 40, y: 430, w: 740, h: 40, label: 'Jardinera' }];

  const infoFor = (t: DiningTable) => {
    if (t.status === 'ocupada') return t.openedAt ? `${minutesSince(t.openedAt)} min` : '';
    if (t.status === 'cuenta') return money(totals(mergeLines((openOrdersBy[t.id] ?? []).map((o) => o.lines)), settings.tax).total);
    if (t.status === 'reservada') return t.reserva?.time ?? '';
    return '';
  };

  const primary = () => {
    if (!table) return;
    setNotice('');
    if (table.status === 'libre') st.openTable(table.id, Math.max(1, table.guests || 2));
    else if (table.status === 'ocupada') st.requestBill(table.id);
    else if (table.status === 'reservada') st.seatReservation(table.id);
    else if (table.status === 'cuenta') {
      const total = st.chargeTable(table.id, pay);
      setNotice(`Mesa ${tableLabel(table)} cobrada: ${money(total)}. Quedó libre.`);
    }
  };
  const primaryLabel = !table ? '' : {
    libre: 'Abrir mesa',
    ocupada: 'Pedir la cuenta',
    cuenta: `Cobrar ${money(tt.total)}`,
    reservada: 'Sentar a los clientes',
  }[table.status];

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand sub={`${busy.length} de ${tables.length} mesas ocupadas · ${people} personas`} title="Mesas" icon={<Icon name="table" size={22} />} />
          {canEdit && (
            <button type="button" className={`btn ${editing ? 'btn-primary' : 'btn-white'} spacer`} aria-pressed={editing} onClick={() => { setEditing(!editing); setNotice(''); setDrag(null); }}>
              <Icon name={editing ? 'check' : 'pencil'} size={18} stroke={2.2} /> {editing ? 'Listo' : 'Editar plano'}
            </button>
          )}
          {!editing && (
            <a className={`btn btn-primary${canEdit ? '' : ' spacer'}`} href="#/caja" onClick={() => useCart.getState().setMode('llevar')}>
              <Icon name="plus" size={18} stroke={2.4} /> Orden para llevar
            </a>
          )}
        </header>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <nav className="chips" aria-label="Zonas">
            {(['salon', 'terraza'] as const).map((z) => {
              const list = tables.filter((t) => t.zone === z);
              return (
                <button key={z} type="button" className="chip" aria-pressed={zone === z} onClick={() => { setZone(z); setSel(list[0]?.id ?? ''); }}>
                  {ZONE_NAMES[z]} <span className="count">{list.filter((t) => t.status === 'ocupada' || t.status === 'cuenta').length}/{list.length}</span>
                </button>
              );
            })}
          </nav>
          <div className="row spacer" aria-label="Leyenda" style={{ gap: '0.875rem', flexWrap: 'wrap' }}>
            {(Object.keys(LOOK) as TableStatus[]).map((k) => (
              <span key={k} className="row" style={{ gap: 6, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>
                <span className={`legend-swatch ${LOOK[k].swatch}`} aria-hidden="true" />
                {LOOK[k].label} <strong style={{ color: 'var(--ink)' }}>{inZone.filter((t) => t.status === k).length}</strong>
              </span>
            ))}
          </div>
        </div>

        {editing && (
          <div className="notice notice-note" role="status" style={{ flexWrap: 'wrap' }}>
            <Icon name="move" size={18} />
            <span className="grow">Arrastra las mesas para acomodarlas (o usa las flechas del teclado). Toca una para cambiar su nombre, puestos o zona.</span>
            <button type="button" className="btn btn-sm btn-white" onClick={() => setSel(st.addTable({ label: nextLabel(tables, zone), seats: 4, zone }))}>
              <Icon name="plus" size={16} stroke={2.4} /> Agregar mesa
            </button>
          </div>
        )}

        <section className={`floor-wrap${editing ? ' editing' : ''}`} ref={ref} aria-label={`Plano de ${ZONE_NAMES[zone]}`}>
          <div className="floor" style={{ width: FLOOR_W, height: FLOOR_H, transform: `scale(${scale})` }}>
            {decor.map((d) => (
              <div key={d.label} className="decor" aria-hidden="true" style={{ left: d.x, top: d.y, width: d.w, height: d.h }}>{d.label}</div>
            ))}
            {inZone.map((t) => {
              const g = tableGeom(t.seats);
              const info = infoFor(t);
              const pos = drag?.id === t.id ? drag : t;
              const dragging = drag?.id === t.id && drag.moved;
              return (
                <div key={t.id} className={`table-spot${dragging ? ' dragging' : ''}`} style={{ left: pos.x, top: pos.y, width: g.w, height: g.h }}>
                  {g.chairs.map((c, i) => (
                    <span key={i} className="chair" aria-hidden="true" style={{ left: c.x, top: c.y, width: c.w, height: c.h }} />
                  ))}
                  <button
                    type="button" className={`table-btn ${LOOK[t.status].swatch}`} aria-pressed={table?.id === t.id}
                    style={{ borderRadius: g.round ? 999 : 16, touchAction: editing ? 'none' : undefined }} onClick={() => { setSel(t.id); setNotice(''); }}
                    aria-label={`Mesa ${tableLabel(t)}, ${t.seats} puestos, ${LOOK[t.status].label}${info ? ', ' + info : ''}${editing ? '. Usa las flechas para moverla' : ''}`}
                    onPointerDown={(e) => {
                      if (!editing) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setSel(t.id);
                      setDrag({ id: t.id, x: t.x, y: t.y, sx: e.clientX, sy: e.clientY, x0: t.x, y0: t.y, moved: false });
                    }}
                    onPointerMove={(e) => {
                      if (!drag || drag.id !== t.id) return;
                      const dx = (e.clientX - drag.sx) / scale;
                      const dy = (e.clientY - drag.sy) / scale;
                      setDrag({ ...drag, ...clampToFloor(drag.x0 + dx, drag.y0 + dy, t.seats), moved: drag.moved || Math.abs(dx) + Math.abs(dy) > 4 });
                    }}
                    onPointerUp={() => {
                      if (drag?.id === t.id && drag.moved) st.updateTable(t.id, { x: drag.x, y: drag.y });
                      setDrag(null);
                    }}
                    onPointerCancel={() => setDrag(null)}
                    onKeyDown={(e) => {
                      if (!editing) return;
                      const d: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
                      const m = d[e.key];
                      if (!m) return;
                      e.preventDefault();
                      st.updateTable(t.id, clampToFloor(t.x + m[0], t.y + m[1], t.seats));
                    }}
                  >
                    <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{tableLabel(t)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{LOOK[t.status].label}</span>
                    {info && <span className="num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{info}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <ModuleNav current="mesas" />
      </main>

      {editing && (
        <aside className="aside" aria-label="Editar mesa">
          {table ? <TableEditor key={table.id} table={table} onDeleted={() => setSel(inZone.find((x) => x.id !== table.id)?.id ?? '')} onZone={setZone} /> : (
            <div className="empty"><Icon name="table" size={40} stroke={1.6} /><strong>No hay mesas en esta zona</strong><span>Toca “Agregar mesa”.</span></div>
          )}
        </aside>
      )}

      {table && !editing && (
        <aside className="aside" aria-label="Detalle de la mesa">
          <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mesa {tableLabel(table)}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-2)' }}>{table.seats} puestos · {ZONE_NAMES[table.zone]}</span>
            </div>
            <span className={`tag ${LOOK[table.status].tag}`}>{LOOK[table.status].label}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <div className="col" style={{ padding: 12, borderRadius: 12, background: 'var(--bg)' }}>
              <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Comensales</span>
              <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
                <button type="button" className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8, boxShadow: 'none' }} aria-label="Menos comensales" onClick={() => st.setGuests(table.id, table.guests - 1)}><Icon name="minus" size={12} stroke={3} /></button>
                <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{table.guests}</span>
                <button type="button" className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8, boxShadow: 'none' }} aria-label="Más comensales" onClick={() => st.setGuests(table.id, Math.min(table.seats + 4, table.guests + 1))}><Icon name="plus" size={12} stroke={3} /></button>
              </div>
            </div>
            <div className="col" style={{ padding: 12, borderRadius: 12, background: 'var(--bg)' }}>
              <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{table.status === 'reservada' ? 'Llegan a las' : 'Tiempo'}</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: '28px' }}>
                {table.status === 'reservada' ? table.reserva?.time : table.openedAt ? `${minutesSince(table.openedAt)} min` : '—'}
              </span>
            </div>
            <div className="col" style={{ padding: 12, borderRadius: 12, background: 'var(--bg)' }}>
              <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Mesero</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: '28px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{table.waiter || '—'}</span>
            </div>
          </div>

          {notice && <div className="notice notice-ok" role="status"><Icon name="check" size={16} stroke={3} /> {notice}</div>}

          <div className="scroll col" style={{ gap: 0 }}>
            {table.status === 'reservada' && (
              <div className="col" style={{ padding: 16, borderRadius: 14, background: 'var(--info-bg)', color: '#16365f' }}>
                <span className="label">Reserva</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{table.reserva?.time}</span>
                <span style={{ fontSize: '0.8125rem' }}>{table.reserva?.note}</span>
              </div>
            )}
            {lines.length === 0 && table.status !== 'reservada' && (
              <div className="empty">
                <Icon name="table" size={40} stroke={1.6} />
                <strong>{table.status === 'libre' ? 'Mesa libre' : 'Sin productos todavía'}</strong>
                <span>{table.status === 'libre' ? 'Indica los comensales y abre la mesa, o resérvala.' : 'Toca “Agregar productos” para tomar el pedido.'}</span>
              </div>
            )}
            {lines.map((l) => (
              <div key={l.key} className="line">
                <span className="num" style={{ minWidth: 34, height: 30, borderRadius: 8, background: 'var(--bg)', fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.qty}×</span>
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="name">{l.name}</span>
                  {l.note && <span className="sub">{l.note}</span>}
                </div>
                <span className="num" style={{ fontWeight: 700 }}>{money(l.unit * l.qty)}</span>
              </div>
            ))}
          </div>

          {lines.length > 0 && (
            <div className="totals num">
              <div className="row-t"><span>Subtotal</span><span>{money(tt.subtotal)}</span></div>
              {settings.tax !== 'none' && <div className="row-t"><span>{TAX[settings.tax].label}</span><span>{money(tt.tax)}</span></div>}
              <div className="grand"><span>Total</span><span>{money(tt.total)}</span></div>
            </div>
          )}

          {table.status === 'cuenta' && (
            <div className="pay-grid" role="group" aria-label="Medio de pago">
              {PAY.map(([id, label]) => <button key={id} type="button" aria-pressed={pay === id} onClick={() => setPay(id)}>{label}</button>)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(table.status === 'ocupada' || table.status === 'cuenta') && (
              <a className="btn btn-md" href={`#/caja/${table.id}`}><Icon name="plus" size={16} stroke={2.4} /> Agregar productos</a>
            )}
            {table.status === 'ocupada' && <button type="button" className="btn btn-md btn-outline" onClick={() => setDialog('move')}><Icon name="move" size={16} /> Mover de mesa</button>}
            {table.status === 'cuenta' && <button type="button" className="btn btn-md btn-outline" disabled={!lines.length} onClick={() => setPrinting(true)}><Icon name="print" size={16} /> Imprimir cuenta</button>}
            {table.status === 'libre' && <button type="button" className="btn btn-md btn-outline" style={{ gridColumn: '1 / -1' }} onClick={() => setDialog('reserve')}>Reservar mesa</button>}
            {table.status === 'reservada' && <button type="button" className="btn btn-md btn-outline" style={{ gridColumn: '1 / -1' }} onClick={() => st.cancelReservation(table.id)}>Cancelar reserva</button>}
          </div>

          <button type="button" className="btn btn-primary btn-lg" onClick={primary}>
            {primaryLabel} <Icon name="arrowRight" stroke={2.4} />
          </button>
        </aside>
      )}

      {dialog === 'reserve' && table && <ReserveDialog onClose={() => setDialog(null)} onSave={(time, note) => { st.reserveTable(table.id, time, note); setDialog(null); }} tableId={tableLabel(table)} />}
      {dialog === 'move' && table && (
        <Dialog title={`Mover mesa ${tableLabel(table)}`} subtitle="Elige una mesa libre. El pedido y los comensales pasan a la nueva mesa." onClose={() => setDialog(null)}>
          <div className="chips">
            {tables.filter((t) => t.status === 'libre').map((t) => (
              <button key={t.id} type="button" className="opt" onClick={() => { st.moveTable(table.id, t.id); setSel(t.id); setZone(t.zone); setDialog(null); }}>
                {tableLabel(t)} · {t.seats} puestos · {ZONE_NAMES[t.zone]}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {printing && table && <PrintReceipt lines={lines} title={`Cuenta mesa ${tableLabel(table)}`} at={Date.now()} onDone={() => setPrinting(false)} />}
    </div>
  );
}

function ReserveDialog({ tableId, onClose, onSave }: { tableId: string; onClose: () => void; onSave: (time: string, note: string) => void }) {
  const [time, setTime] = useState('19:30');
  const [note, setNote] = useState('');
  const label = (() => {
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h)) return time;
    return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
  })();
  return (
    <Dialog
      title={`Reservar mesa ${tableId}`} onClose={onClose} width="28rem"
      footer={<button type="button" className="btn btn-primary btn-lg" disabled={!note.trim()} onClick={() => onSave(label, note.trim())}>Guardar reserva</button>}
    >
      <label className="field"><span className="label">Hora</span><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <label className="field"><span className="label">A nombre de</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Familia Pérez · 6 personas" /></label>
    </Dialog>
  );
}

/** Siguiente nombre libre para una mesa nueva: M11 en el salón, T7 en la terraza… */
function nextLabel(tables: DiningTable[], zone: DiningTable['zone']): string {
  const prefix = zone === 'salon' ? 'M' : 'T';
  const used = new Set(tables.map((t) => tableLabel(t).toUpperCase()));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Nombre, puestos, zona y borrado de una mesa (modo Editar plano). */
function TableEditor({ table: t, onDeleted, onZone }: { table: DiningTable; onDeleted: () => void; onZone: (z: DiningTable['zone']) => void }) {
  const tables = useStore((s) => s.tables);
  const update = useStore((s) => s.updateTable);
  const remove = useStore((s) => s.deleteTable);
  const [name, setName] = useState(tableLabel(t));
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const taken = (v: string) => tables.some((x) => x.id !== t.id && tableLabel(x).toLowerCase() === v.toLowerCase());
  const clean = name.trim();
  const nameError = !clean ? 'Ponle un nombre a la mesa.' : taken(clean) ? `Ya hay una mesa llamada ${clean}.` : '';
  const inUse = t.status !== 'libre';
  const setSeats = (n: number) => {
    const seats = Math.min(MAX_SEATS, Math.max(1, n));
    update(t.id, { seats, ...clampToFloor(t.x, t.y, seats) });
  };

  return (
    <>
      <div className="col" style={{ gap: 2 }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Editar mesa</span>
        <span className="muted">Los cambios se guardan solos.</span>
      </div>

      <label className="field">
        <span className="label">Nombre</span>
        <input className="input" value={name} maxLength={12} aria-invalid={!!nameError}
          onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (v.trim() && !taken(v.trim())) update(t.id, { label: v.trim() });
          }} />
        {nameError && <span role="alert" className="small" style={{ color: 'var(--bad-ink)', fontWeight: 700 }}>{nameError}</span>}
      </label>

      <div className="field">
        <span className="label">Puestos</span>
        <div className="row" style={{ justifyContent: 'space-between', height: 52, padding: '0 4px', borderRadius: 12, background: 'var(--bg)' }}>
          <button type="button" className="icon-btn" aria-label="Menos puestos" disabled={t.seats <= 1} onClick={() => setSeats(t.seats - 1)}><Icon name="minus" size={16} stroke={2.4} /></button>
          <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{t.seats} {t.seats === 1 ? 'puesto' : 'puestos'}</span>
          <button type="button" className="icon-btn" aria-label="Más puestos" disabled={t.seats >= MAX_SEATS} onClick={() => setSeats(t.seats + 1)}><Icon name="plus" size={16} stroke={2.4} /></button>
        </div>
        <span className="small" style={{ color: 'var(--ink-3)' }}>Hasta 2 puestos se dibuja redonda, hasta 4 cuadrada y desde 5 rectangular.</span>
      </div>

      <div className="field">
        <span className="label">Zona</span>
        <div className="seg" role="group" aria-label="Zona">
          {(['salon', 'terraza'] as const).map((z) => (
            <button key={z} type="button" aria-pressed={t.zone === z} onClick={() => {
              if (z === t.zone) return;
              update(t.id, { zone: z, ...freeSpot(tables.filter((x) => x.zone === z && x.id !== t.id), t.seats) });
              onZone(z);
            }}>{ZONE_NAMES[z]}</button>
          ))}
        </div>
      </div>

      {inUse && (
        <div className="notice notice-note"><Icon name="info" size={16} /> Esta mesa está {LOOK[t.status].label.toLowerCase()}: puedes moverla y renombrarla, pero no borrarla.</div>
      )}

      <div style={{ marginTop: 'auto' }}>
        {error && <div className="notice notice-warn" role="alert" style={{ marginBottom: 8 }}><Icon name="warning" size={16} /> {error}</div>}
        {confirm ? (
          <div className="notice notice-warn" role="alertdialog" aria-label="Confirmar borrado" style={{ fontWeight: 600 }}>
            <span className="grow">¿Borrar la mesa {tableLabel(t)}?</span>
            <button type="button" className="btn btn-sm btn-white" onClick={() => setConfirm(false)}>No</button>
            <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }}
              onClick={() => { const err = remove(t.id); setConfirm(false); if (err) setError(err); else onDeleted(); }}>Borrar</button>
          </div>
        ) : (
          <button type="button" className="btn btn-md btn-danger" style={{ width: '100%' }} disabled={inUse} onClick={() => { setConfirm(true); setError(''); }}>
            <Icon name="trash" size={16} /> Borrar mesa
          </button>
        )}
      </div>
    </>
  );
}
