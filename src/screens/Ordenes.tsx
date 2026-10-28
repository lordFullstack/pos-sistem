import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderStatus, TaxMode } from '../types';
import { orderLabel, useCurrentUser, useStore } from '../store';
import { totals } from '../lib/cart';
import { TAX, minutesSince, money } from '../lib/format';
import { startOfDay } from '../lib/stats';
import { can } from '../data/roles';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';
import { PrintReceipt } from '../components/Receipt';
import { tableLabel } from '../data/tables';

const COLS: { id: OrderStatus; label: string; step: string; dot: string; action: string }[] = [
  { id: 'pendiente', label: 'Nuevas', step: 'Recibida', dot: '#B45309', action: 'Enviar a preparación' },
  { id: 'prep', label: 'En preparación', step: 'Preparando', dot: '#1E4E8C', action: 'Marcar como lista' },
  { id: 'lista', label: 'Listas para entregar', step: 'Lista', dot: 'var(--accent)', action: 'Entregar orden' },
];

type Filter = 'todas' | 'mesa' | 'llevar';

export function Ordenes() {
  const user = useCurrentUser();
  const settings = useStore((s) => s.settings);
  const orders = useStore((s) => s.orders);
  const tables = useStore((s) => s.tables);
  const advanceOrder = useStore((s) => s.advanceOrder);
  const cancelOrder = useStore((s) => s.cancelOrder);
  const [filter, setFilter] = useState<Filter>('todas');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const open = useMemo(() => orders.filter((o) => o.status === 'pendiente' || o.status === 'prep' || o.status === 'lista'), [orders]);
  const deliveredToday = orders.filter((o) => o.status === 'entregada' && o.createdAt >= startOfDay(Date.now())).length;

  if (!can(user?.role, 'ordenes')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Órdenes" /></header><NoAccess what="las órdenes" /><ModuleNav current="ordenes" /></main></div>;
  }

  const q = query.trim().toLowerCase();
  const visible = open.filter((o) => {
    if (filter !== 'todas' && o.mode !== filter) return false;
    if (!q) return true;
    return orderLabel(o.number).includes(q) || String(o.number).includes(q) || tableName(o).toLowerCase().includes(q) || (o.customer ?? '').toLowerCase().includes(q);
  });
  const selected = open.find((o) => o.id === sel) ?? visible[0];
  function tableName(o: Order) {
    if (!o.tableId) return '';
    const t = tables.find((x) => x.id === o.tableId);
    return t ? tableLabel(t) : '(borrada)';
  }
  const where = (o: Order) => (o.tableId ? `Mesa ${tableName(o)}` : o.mode === 'mesa' ? 'Para comer aquí' : `Para llevar${o.customer ? ' · ' + o.customer : ''}`);

  const advance = (o: Order) => {
    const idx = open.findIndex((x) => x.id === o.id);
    advanceOrder(o.id);
    if (o.status === 'lista') setSel(open[idx + 1]?.id ?? open[idx - 1]?.id ?? '');
  };

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand title="Órdenes" icon={<Icon name="receipt" size={22} />} sub={`${open.length} abiertas · ${deliveredToday} entregadas hoy`} />
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" aria-label="Buscar orden" placeholder="Buscar por número, mesa o cliente" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <a className="btn btn-primary" href="#/caja"><Icon name="plus" size={18} stroke={2.4} /> Nueva orden</a>
        </header>

        <nav className="chips" aria-label="Filtrar por tipo">
          {([['todas', 'Todas'], ['mesa', 'En mesa'], ['llevar', 'Para llevar']] as [Filter, string][]).map(([id, label]) => (
            <button key={id} type="button" className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label} <span className="count">{id === 'todas' ? open.length : open.filter((o) => o.mode === id).length}</span>
            </button>
          ))}
        </nav>

        <section className="board" aria-label="Tablero de órdenes">
          {COLS.map((col) => {
            const list = visible.filter((o) => o.status === col.id).sort((a, b) => a.createdAt - b.createdAt);
            return (
              <div key={col.id} className="board-col">
                <div className="row" style={{ gap: 8, padding: '2px 4px' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: col.dot }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{col.label}</span>
                  <span className="spacer num" style={{ minWidth: 26, height: 26, padding: '0 8px', borderRadius: 999, background: '#fff', fontSize: '0.8125rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{list.length}</span>
                </div>
                <div className="scroll col" style={{ gap: 10, padding: 2 }}>
                  {list.length === 0 && <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--ink-3)', borderRadius: 14, boxShadow: 'inset 0 0 0 1.5px #d6d0c9' }}>Sin órdenes aquí</div>}
                  {list.map((o) => {
                    const mins = minutesSince(o.createdAt);
                    const late = mins >= 10;
                    const t = totals(o.lines, settings.tax);
                    return (
                      <button key={o.id} type="button" className="order-card" aria-pressed={selected?.id === o.id} onClick={() => { setSel(o.id); setConfirmCancel(false); }} aria-label={`Orden ${orderLabel(o.number)}, ${where(o)}`}>
                        <div className="row" style={{ width: '100%', gap: 8 }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800 }}>{orderLabel(o.number)}</span>
                          <span className={`tag spacer ${late ? 'tag-warn' : ''}`}><Icon name="clock" size={12} stroke={2.6} /> {mins} min</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{where(o)}</span>
                        <span className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.4 }}>{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</span>
                        <div className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
                          <span className={`tag ${o.paid ? 'tag-ok' : 'tag-warn'}`}>{o.paid ? 'Pagada' : 'Por cobrar'}</span>
                          <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{money(t.total)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <ModuleNav current="ordenes" />
      </main>

      <aside className="aside" aria-label="Detalle de la orden">
        {!selected ? (
          <div className="empty">
            <Icon name="receipt" size={40} stroke={1.6} />
            <strong>No hay órdenes abiertas</strong>
            <span>Las órdenes nuevas de la caja aparecen aquí.</span>
          </div>
        ) : (
          <Detail
            o={selected} where={where(selected)} tax={settings.tax}
            canCancel={can(user?.role, 'anular')} confirmCancel={confirmCancel}
            onAskCancel={() => setConfirmCancel(true)} onCancel={() => { cancelOrder(selected.id); setConfirmCancel(false); }} onKeep={() => setConfirmCancel(false)}
            onAdvance={() => advance(selected)} onPrint={() => setPrinting(true)}
          />
        )}
      </aside>
      {printing && selected && <PrintReceipt lines={selected.lines} title={`Comanda ${orderLabel(selected.number)} · ${where(selected)}`} at={selected.createdAt} onDone={() => setPrinting(false)} />}
    </div>
  );
}

function Detail(p: {
  o: Order; where: string; tax: TaxMode; canCancel: boolean; confirmCancel: boolean;
  onAskCancel: () => void; onCancel: () => void; onKeep: () => void; onAdvance: () => void; onPrint: () => void;
}) {
  const { o } = p;
  const idx = COLS.findIndex((c) => c.id === o.status);
  const col = COLS[idx];
  const t = totals(o.lines, p.tax);
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>Orden {orderLabel(o.number)}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-2)' }}>{p.where} · hace {minutesSince(o.createdAt)} min</span>
        </div>
        <span className="tag"><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: col.dot }} /> {col.label}</span>
      </div>

      <ol aria-label="Pasos de la orden" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {COLS.map((c, i) => (
          <li key={c.id} className="col" style={{ gap: 6 }}>
            <span aria-hidden="true" style={{ height: 6, borderRadius: 999, background: i <= idx ? 'var(--accent)' : 'var(--line)' }} />
            <span className="small" style={{ fontWeight: 700, color: i <= idx ? 'var(--ink)' : 'var(--ink-3)' }}>{c.step}{i <= idx ? '' : ' (pendiente)'}</span>
          </li>
        ))}
      </ol>

      <div className="scroll col" style={{ gap: 0 }}>
        {o.lines.map((l) => (
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

      <div className="totals num">
        <div className="row-t"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {p.tax !== 'none' && <div className="row-t"><span>{TAX[p.tax].label}</span><span>{money(t.tax)}</span></div>}
        <div className="grand"><span>Total</span><span className="row" style={{ gap: 10 }}><span className={`tag ${o.paid ? 'tag-ok' : 'tag-warn'}`}>{o.paid ? 'Pagada' : 'Por cobrar'}</span>{money(t.total)}</span></div>
      </div>

      {p.confirmCancel ? (
        <div className="notice notice-warn" role="alertdialog" aria-label="Confirmar cancelación" style={{ flexWrap: 'wrap' }}>
          <Icon name="warning" size={18} />
          <span className="grow" style={{ fontWeight: 600 }}>¿Cancelar la orden {orderLabel(o.number)}? {o.paid ? 'El cobro ya está registrado; haz la devolución aparte.' : ''}</span>
          <button type="button" className="btn btn-sm btn-white" onClick={p.onKeep}>No</button>
          <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }} onClick={p.onCancel}>Sí, cancelar</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" className="btn btn-md" onClick={p.onPrint}><Icon name="print" size={18} /> Imprimir comanda</button>
          {!o.paid && o.tableId ? (
            <a className="btn btn-md btn-outline" href="#/mesas">Cobrar en Mesas</a>
          ) : (
            <button type="button" className="btn btn-md btn-danger" disabled={!p.canCancel} title={p.canCancel ? undefined : 'Solo un administrador puede cancelar'} onClick={p.onAskCancel}>Cancelar orden</button>
          )}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-lg" onClick={p.onAdvance}>
        {col.action} <Icon name="arrowRight" stroke={2.4} />
      </button>
    </>
  );
}
