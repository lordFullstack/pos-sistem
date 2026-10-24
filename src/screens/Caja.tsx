import { useEffect, useMemo, useState } from 'react';
import type { Order, PayMethod, Product } from '../types';
import { orderLabel, useCatalog, useCurrentUser, useStore } from '../store';
import { useCart } from '../cartStore';
import { buildLine, totals } from '../lib/cart';
import { TAX, money } from '../lib/format';
import { can } from '../data/roles';
import { Icon } from '../components/Icon';
import { ProductIcon } from '../components/ProductIcon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { OptionsDialog } from '../components/OptionsDialog';
import { PrintReceipt } from '../components/Receipt';
import { useImageUrl } from '../lib/images';
import { SwitchUserDialog } from '../components/SwitchUserDialog';

const PAY: [PayMethod, string][] = [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['transferencia', 'Transferencia']];

function ProductCard({ p, qty, onClick }: { p: Product; qty: number; onClick: () => void }) {
  const photo = useImageUrl(p.imageId);
  const hasOpts = !!p.opts?.length;
  return (
    <button type="button" className={`product${photo ? ' has-photo' : ''}`} data-in={qty > 0} style={{ background: p.tint }} onClick={onClick}
      aria-label={hasOpts ? `Elegir opciones de ${p.name}` : `Agregar ${p.name}`}>
      {photo ? <img className="photo" src={photo} alt="" /> : <span className="art"><ProductIcon name={p.icon} /></span>}
      <span className="info">
        <span className="name">{p.name}</span>
        <span className="desc">{p.desc}</span>
        <span className="bottom">
          <span className="price num">{money(p.price)}</span>
          <span className="add" aria-hidden="true">
            {hasOpts ? (<><Icon name="sliders" size={15} stroke={2.4} /> Opciones</>) : <Icon name="plus" size={16} stroke={2.4} />}
          </span>
        </span>
      </span>
      {qty > 0 && <span className="badge">{qty}</span>}
    </button>
  );
}

export function Caja({ tableParam }: { tableParam: string }) {
  const catalog = useCatalog();
  const user = useCurrentUser();
  const settings = useStore((s) => s.settings);
  const tables = useStore((s) => s.tables);
  const nextNumber = useStore((s) => s.nextOrderNumber);
  const checkout = useStore((s) => s.checkout);
  const sendToKitchen = useStore((s) => s.sendToKitchen);
  const cart = useCart();

  const [cat, setCat] = useState('todo');
  const [query, setQuery] = useState('');
  const [optionsFor, setOptionsFor] = useState<Product | null>(null);
  const [pay, setPay] = useState<PayMethod>('tarjeta');
  const [paid, setPaid] = useState<{ order: Order; total: number; method: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [sent, setSent] = useState('');
  const [switching, setSwitching] = useState(false);

  const mode = cart.mode ?? catalog.defaultMode;
  const useTables = catalog.hasTables && mode === 'mesa';
  const canCharge = can(user?.role, 'cobrar');

  // Llegar desde Mesas con #/caja/M4 deja la mesa elegida.
  useEffect(() => {
    if (tableParam && catalog.hasTables) cart.setTable(tableParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableParam, catalog.hasTables]);

  // Si cambian el tipo de negocio, los productos del carrito ya no existen.
  useEffect(() => {
    const ids = new Set(catalog.items.map((p) => p.id));
    if (cart.lines.some((l) => !ids.has(l.productId))) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.type]);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.items.filter((p) => (cat === 'todo' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
  }, [catalog, cat, query]);

  const qtyBy = useMemo(() => {
    const m: Record<string, number> = {};
    cart.lines.forEach((l) => (m[l.productId] = (m[l.productId] ?? 0) + l.qty));
    return m;
  }, [cart.lines]);

  const t = totals(cart.lines, settings.tax);
  const empty = cart.lines.length === 0;
  const table = tables.find((x) => x.id === cart.tableId);

  const onProduct = (p: Product) => {
    setSent('');
    if (p.opts?.length) setOptionsFor(p);
    else cart.add(buildLine(p, {}));
  };

  const onCharge = () => {
    if (empty || !canCharge) return;
    const order = checkout({ lines: cart.lines, method: pay, mode, customer: cart.customer.trim() || undefined });
    setPaid({ order, total: t.total, method: PAY.find((p) => p[0] === pay)![1].toLowerCase() });
  };

  const onSend = () => {
    if (empty || !table || !canCharge) return;
    const order = sendToKitchen({ lines: cart.lines, tableId: table.id });
    cart.clear();
    setSent(`Comanda ${orderLabel(order.number)} enviada a cocina para la mesa ${table.id}.`);
  };

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand sub={`${catalog.label} · ${user?.name ?? 'Sin usuario'}`} />
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Buscar producto" aria-label="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="icon-btn" onClick={() => setSwitching(true)} aria-label={`Cambiar de usuario (ahora ${user?.name ?? 'nadie'})`} title="Cambiar de usuario">
            <Icon name="users" />
          </button>
          <a className="icon-btn" href="#/ajustes" aria-label="Ajustes">
            <Icon name="gear" />
          </a>
        </header>

        <nav className="chips" aria-label="Categorías">
          {[['todo', 'Todo'] as [string, string], ...catalog.cats].map(([id, label]) => (
            <button key={id} type="button" className="chip" aria-pressed={cat === id} onClick={() => setCat(id)}>
              {label}
              <span className="count">{id === 'todo' ? catalog.items.length : catalog.items.filter((p) => p.cat === id).length}</span>
            </button>
          ))}
        </nav>

        <section className="products" aria-label="Productos">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} qty={qtyBy[p.id] ?? 0} onClick={() => onProduct(p)} />
          ))}
          {products.length === 0 && (
            <div className="empty" style={{ gridColumn: '1 / -1' }}>
              <strong>No hay productos con “{query}”</strong>
              <span>Prueba con otra palabra o quita el filtro de categoría.</span>
            </div>
          )}
        </section>

        <ModuleNav current="caja" />
      </main>

      <aside className="aside" aria-label="Orden actual">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="col" style={{ gap: 0 }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Orden {orderLabel(nextNumber)}</span>
            <span className="muted">{t.units === 1 ? '1 artículo' : `${t.units} artículos`}</span>
          </div>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => cart.clear()} disabled={empty}>Vaciar</button>
        </div>

        <div className="seg" role="group" aria-label="Tipo de orden">
          <button type="button" aria-pressed={mode === 'mesa'} onClick={() => cart.setMode('mesa')}>{catalog.dineInLabel}</button>
          <button type="button" aria-pressed={mode === 'llevar'} onClick={() => cart.setMode('llevar')}>Para llevar</button>
        </div>

        {useTables ? (
          <label className="field">
            <span className="label">Mesa</span>
            <select className="input" value={cart.tableId} onChange={(e) => cart.setTable(e.target.value)}>
              <option value="">Elige una mesa…</option>
              {tables.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.id} · {x.seats} puestos · {x.status === 'libre' ? 'libre' : x.status === 'reservada' ? `reservada ${x.reserva?.time ?? ''}` : x.status === 'cuenta' ? 'por cobrar' : 'ocupada'}
                </option>
              ))}
            </select>
          </label>
        ) : mode === 'llevar' ? (
          <label className="field">
            <span className="label">Nombre del cliente <span className="muted">(opcional)</span></span>
            <input className="input" value={cart.customer} onChange={(e) => cart.setCustomer(e.target.value)} placeholder="Para llamarlo cuando esté listo" />
          </label>
        ) : null}

        <div className="scroll col" style={{ gap: 0 }}>
          {sent && (
            <div className="notice notice-ok" role="status" style={{ marginBottom: 8 }}>
              <Icon name="check" size={16} stroke={3} /> <span className="grow">{sent}</span>
              <a href="#/mesas" style={{ color: 'inherit' }}>Ver mesas</a>
            </div>
          )}
          {empty && !sent && (
            <div className="empty">
              <Icon name="bag" size={40} stroke={1.6} />
              <strong>La orden está vacía</strong>
              <span>Toca un producto para agregarlo.</span>
            </div>
          )}
          {cart.lines.map((l) => (
            <div key={l.key} className="line">
              <div className="col grow" style={{ gap: 2 }}>
                <span className="name">{l.name}</span>
                <span className="sub">{l.note ? `${l.note} · ` : ''}{money(l.unit)} c/u</span>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => cart.setQty(l.key, l.qty - 1)} aria-label={`Quitar uno de ${l.name}`}><Icon name="minus" size={16} stroke={2.4} /></button>
                <span className="num">{l.qty}</span>
                <button type="button" onClick={() => cart.setQty(l.key, l.qty + 1)} aria-label={`Agregar uno de ${l.name}`}><Icon name="plus" size={16} stroke={2.4} /></button>
              </div>
              <span className="total num">{money(l.unit * l.qty)}</span>
            </div>
          ))}
        </div>

        <div className="totals num">
          <div className="row-t"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
          {settings.tax !== 'none' && <div className="row-t"><span>{TAX[settings.tax].label}</span><span>{money(t.tax)}</span></div>}
          <div className="grand"><span>Total</span><span>{money(t.total)}</span></div>
        </div>

        {!canCharge && <div className="notice notice-warn"><Icon name="info" size={16} /> Tu rol no puede cobrar ni enviar comandas.</div>}

        {useTables ? (
          <button type="button" className="btn btn-primary btn-lg" disabled={empty || !table || !canCharge} onClick={onSend}>
            <Icon name="print" /> {table ? `Enviar a cocina · Mesa ${table.id}` : 'Elige una mesa'}
          </button>
        ) : (
          <>
            <div className="pay-grid" role="group" aria-label="Medio de pago">
              {PAY.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={pay === id} onClick={() => setPay(id)}>{label}</button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-lg" disabled={empty || !canCharge} onClick={onCharge}>
              Cobrar {money(t.total)} <Icon name="arrowRight" stroke={2.4} />
            </button>
          </>
        )}
      </aside>

      {optionsFor && (
        <OptionsDialog
          product={optionsFor}
          onClose={() => setOptionsFor(null)}
          onAdd={(sel) => {
            cart.add(buildLine(optionsFor, sel));
            setOptionsFor(null);
          }}
        />
      )}

      {paid && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-label="Pago registrado" style={{ width: 'min(25rem, 100%)', alignItems: 'center', padding: '2rem', gap: '0.75rem', textAlign: 'center' }}>
            <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 999 }}><Icon name="check" size={30} stroke={2.6} /></div>
            <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>Pago registrado</span>
            <span className="muted" style={{ fontSize: '0.9375rem' }}>
              {money(paid.total)} en {paid.method} · Orden {orderLabel(paid.order.number)} enviada a preparación
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', marginTop: 12 }}>
              <button type="button" className="btn btn-md" onClick={() => setPrinting(true)}><Icon name="print" size={18} /> Imprimir recibo</button>
              <button
                type="button" className="btn btn-primary btn-md"
                onClick={() => {
                  setPaid(null);
                  cart.clear();
                }}
              >
                Nueva orden
              </button>
            </div>
          </div>
        </div>
      )}
      {switching && <SwitchUserDialog onClose={() => setSwitching(false)} />}
      {printing && paid &&<PrintReceipt lines={paid.order.lines} title={`Orden ${orderLabel(paid.order.number)}`} at={paid.order.createdAt} onDone={() => setPrinting(false)} />}
    </div>
  );
}
