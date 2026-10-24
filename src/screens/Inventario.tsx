import { useMemo, useState } from 'react';
import type { InventoryItem } from '../types';
import { useCurrentUser, useStore } from '../store';
import { INVENTORY_CATS, stepFor, stockStatus, type StockStatus } from '../data/inventory';
import { can } from '../data/roles';
import { dayLabel, qty, time } from '../lib/format';
import { startOfDay } from '../lib/stats';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { Dialog } from '../components/Dialog';

const LOOK: Record<StockStatus, { label: string; tag: string; bar: string; icon: string }> = {
  ok: { label: 'Suficiente', tag: 'tag-ok', bar: 'var(--accent)', icon: 'check' },
  low: { label: 'Por reponer', tag: 'tag-warn', bar: 'var(--warn-bar)', icon: 'warning' },
  out: { label: 'Agotado', tag: 'tag-bad', bar: 'var(--bad-ink)', icon: 'x' },
};

type StatusFilter = 'todos' | 'low' | 'out';

export function Inventario() {
  const user = useCurrentUser();
  const items = useStore((s) => s.inventory);
  const moves = useStore((s) => s.inventoryMoves);
  const registerEntry = useStore((s) => s.registerEntry);
  const adjustCount = useStore((s) => s.adjustCount);
  const addItem = useStore((s) => s.addInventoryItem);
  const canEdit = can(user?.role, 'inventario');

  const [status, setStatus] = useState<StatusFilter>('todos');
  const [cat, setCat] = useState('todo');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(() => items.find((i) => stockStatus(i) !== 'ok')?.id ?? items[0]?.id ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'new' | 'adjust' | null>(null);
  const [notice, setNotice] = useState('');

  const cats = useMemo(() => Object.keys(INVENTORY_CATS).filter((k) => items.some((i) => i.cat === k)), [items]);
  const q = query.trim().toLowerCase();
  const rows = items
    .filter((i) => cat === 'todo' || i.cat === cat)
    .filter((i) => status === 'todos' || stockStatus(i) === status)
    .filter((i) => !q || i.name.toLowerCase().includes(q) || i.usedIn.toLowerCase().includes(q));
  const item = items.find((i) => i.id === sel) ?? rows[0];
  const step = item ? stepFor(item.unit) : 1;
  const suggested = item ? Math.max(step, Math.ceil(Math.max(item.min * 2 - item.stock, step) / step) * step) : step;
  const entry = amount ?? suggested;
  const pct = (i: InventoryItem) => Math.max(stockStatus(i) === 'out' ? 0 : 4, Math.min(100, Math.round((i.stock / (i.min * 2 || 1)) * 100)));
  const count = (s: StockStatus) => items.filter((i) => stockStatus(i) === s).length;

  const pick = (id: string) => {
    setSel(id);
    setAmount(null);
    setNotice('');
  };

  return (
    <div className="app">
      <main className="main" style={{ gap: '0.875rem' }}>
        <header className="header">
          <Brand title="Inventario" icon={<Icon name="box" size={22} />} sub="Insumos de cocina y barra" />
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" aria-label="Buscar insumo" placeholder="Buscar insumo" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={!canEdit} onClick={() => setDialog('new')}><Icon name="plus" size={18} stroke={2.4} /> Nuevo insumo</button>
        </header>

        <section aria-label="Resumen de existencias" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {([
            ['todos', 'Insumos en total', items.length, 'box', 'var(--bg)', 'var(--ink)'],
            ['low', 'Por reponer', count('low'), 'warning', 'var(--warn-bg)', 'var(--warn-ink)'],
            ['out', 'Agotados', count('out'), 'info', 'var(--bad-bg)', 'var(--bad-ink)'],
          ] as [StatusFilter, string, number, string, string, string][]).map(([id, label, n, icon, bg, fg]) => (
            <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(status === id ? 'todos' : id)} className="card row"
              style={{ height: 84, padding: '14px 18px', border: 0, textAlign: 'left', gap: 14, boxShadow: status === id ? 'var(--ring-active)' : undefined }}>
              <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg }}><Icon name={icon} size={22} /></span>
              <span className="col" style={{ gap: 2 }}>
                <span className="num" style={{ fontSize: '1.625rem', fontWeight: 800, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
              </span>
            </button>
          ))}
        </section>

        <nav className="chips" aria-label="Categorías">
          <button type="button" className="chip chip-sm" aria-pressed={cat === 'todo'} onClick={() => setCat('todo')}>Todo</button>
          {cats.map((k) => <button key={k} type="button" className="chip chip-sm" aria-pressed={cat === k} onClick={() => setCat(k)}>{INVENTORY_CATS[k]}</button>)}
        </nav>

        <section className="card col" aria-label="Insumos" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', gap: 0 }}>
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.1fr', gap: 16, padding: '10px 18px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-3)', boxShadow: '0 1px 0 var(--line)' }}>
            <span>Insumo</span><span>Existencia</span><span>Mínimo</span><span>Estado</span>
          </div>
          <div className="scroll">
            {rows.length === 0 && <div className="empty"><strong>No hay insumos con este filtro</strong></div>}
            {rows.map((i) => {
              const s = stockStatus(i);
              return (
                <button key={i.id} type="button" className="list-row" aria-pressed={item?.id === i.id} onClick={() => pick(i.id)}
                  style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.1fr', gap: 16 }}>
                  <span className="col" style={{ gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{i.name}</span>
                    <span className="small" style={{ color: 'var(--ink-3)' }}>{INVENTORY_CATS[i.cat] ?? i.cat}</span>
                  </span>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="num" style={{ width: 72, fontSize: '0.9375rem', fontWeight: 800 }}>{qty(i.stock)} {i.unit}</span>
                    <span className="bar-track grow" aria-hidden="true"><span className="bar-fill" style={{ display: 'block', width: `${pct(i)}%`, background: LOOK[s].bar }} /></span>
                  </span>
                  <span className="num" style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>{qty(i.min)} {i.unit}</span>
                  <span className={`tag ${LOOK[s].tag}`} style={{ justifySelf: 'start' }}><Icon name={LOOK[s].icon} size={12} stroke={3} /> {LOOK[s].label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <ModuleNav current="inventario" />
      </main>

      <aside className="aside" aria-label="Detalle del insumo">
        {!item ? (
          <div className="empty"><strong>Sin insumos</strong><span>Agrega el primero con “Nuevo insumo”.</span></div>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: '1.375rem', fontWeight: 800 }}>{item.name}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-2)' }}>{INVENTORY_CATS[item.cat] ?? item.cat}</span>
              </div>
              <span className={`tag ${LOOK[stockStatus(item)].tag}`}>{LOOK[stockStatus(item)].label}</span>
            </div>

            <div className="col" style={{ gap: 10, padding: 18, borderRadius: 16, background: 'var(--bg)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>Existencia actual</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>Mínimo {qty(item.min)} {item.unit}</span>
              </div>
              <span className="num" style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{qty(item.stock)} {item.unit}</span>
              <span className="bar-track" aria-hidden="true" style={{ height: 8, background: 'var(--line)' }}><span className="bar-fill" style={{ display: 'block', width: `${pct(item)}%`, background: LOOK[stockStatus(item)].bar }} /></span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>Se usa en: {item.usedIn || '—'}</span>
            </div>

            {canEdit ? (
              <div className="col" style={{ gap: 10 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>Registrar entrada</span>
                <div className="row" style={{ gap: 8 }}>
                  <div className="row grow" style={{ justifyContent: 'space-between', height: 52, padding: '0 4px', borderRadius: 12, background: 'var(--bg)' }}>
                    <button type="button" className="icon-btn" aria-label="Menos" onClick={() => setAmount(Math.max(step, entry - step))}><Icon name="minus" size={16} stroke={2.4} /></button>
                    <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{qty(entry)} {item.unit}</span>
                    <button type="button" className="icon-btn" aria-label="Más" onClick={() => setAmount(entry + step)}><Icon name="plus" size={16} stroke={2.4} /></button>
                  </div>
                  <button type="button" className="btn btn-outline" style={{ height: 52 }} onClick={() => setDialog('adjust')}>Ajustar conteo</button>
                </div>
              </div>
            ) : (
              <div className="notice notice-warn"><Icon name="info" size={16} /> Tu rol solo puede consultar el inventario.</div>
            )}

            {notice && <div className="notice notice-ok" role="status"><Icon name="check" size={16} stroke={3} /> {notice}</div>}

            <div className="scroll col" style={{ gap: 0 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, paddingBottom: 4 }}>Movimientos recientes</span>
              {moves.filter((m) => m.itemId === item.id).slice(0, 8).map((m) => (
                <div key={m.id} className="line">
                  <div className="col grow" style={{ gap: 2 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{m.label}</span>
                    <span className="small" style={{ color: 'var(--ink-3)' }}>{m.at >= startOfDay(Date.now()) ? 'Hoy' : dayLabel(m.at)} · {time(m.at)}</span>
                  </div>
                  <span className="num" style={{ fontSize: '0.875rem', fontWeight: 800 }}>{m.delta > 0 ? '+' : '−'}{qty(Math.abs(m.delta))} {item.unit}</span>
                </div>
              ))}
              {!moves.some((m) => m.itemId === item.id) && <span className="muted" style={{ padding: '8px 0' }}>Todavía no hay movimientos de este insumo.</span>}
            </div>

            {canEdit && (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => { registerEntry(item.id, entry); setAmount(null); setNotice(`Entrada de ${qty(entry)} ${item.unit} registrada.`); }}>
                Registrar entrada de {qty(entry)} {item.unit} <Icon name="arrowRight" stroke={2.4} />
              </button>
            )}
          </>
        )}
      </aside>

      {dialog === 'adjust' && item && (
        <AdjustDialog item={item} onClose={() => setDialog(null)} onSave={(v) => { adjustCount(item.id, v); setDialog(null); setNotice(`Conteo ajustado a ${qty(v)} ${item.unit}.`); }} />
      )}
      {dialog === 'new' && (
        <NewItemDialog cats={Object.keys(INVENTORY_CATS)} onClose={() => setDialog(null)} onSave={(it) => { addItem(it); setDialog(null); }} />
      )}
    </div>
  );
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function AdjustDialog({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(qty(item.stock));
  const n = parseNum(v);
  return (
    <Dialog title="Ajustar conteo" subtitle={`${item.name} · hoy hay ${qty(item.stock)} ${item.unit} en el sistema`} onClose={onClose} width="26rem"
      footer={<button type="button" className="btn btn-primary btn-lg" disabled={!(n >= 0)} onClick={() => onSave(Math.round(n * 10) / 10)}>Guardar conteo</button>}>
      <label className="field">
        <span className="label">Cantidad contada ({item.unit})</span>
        <input className="input" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      </label>
    </Dialog>
  );
}

function NewItemDialog({ cats, onClose, onSave }: { cats: string[]; onClose: () => void; onSave: (it: Omit<InventoryItem, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState(cats[0]);
  const [unit, setUnit] = useState<InventoryItem['unit']>('und');
  const [stock, setStock] = useState('0');
  const [min, setMin] = useState('1');
  const [usedIn, setUsedIn] = useState('');
  const valid = name.trim() && parseNum(stock) >= 0 && parseNum(min) >= 0;
  return (
    <Dialog title="Nuevo insumo" onClose={onClose} width="32rem"
      footer={<button type="button" className="btn btn-primary btn-lg" disabled={!valid} onClick={() => onSave({ name: name.trim(), cat, unit, stock: parseNum(stock), min: parseNum(min), usedIn: usedIn.trim() })}>Guardar insumo</button>}>
      <label className="field"><span className="label">Nombre</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Azúcar morena" autoFocus /></label>
      <div className="field"><span className="label">Categoría</span>
        <div className="chips">{cats.map((k) => <button key={k} type="button" className="chip chip-sm" aria-pressed={cat === k} onClick={() => setCat(k)}>{INVENTORY_CATS[k]}</button>)}</div>
      </div>
      <div className="field"><span className="label">Unidad</span>
        <div className="seg">{(['und', 'kg', 'L'] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>{u === 'und' ? 'Unidades' : u === 'kg' ? 'Kilos' : 'Litros'}</button>)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="field"><span className="label">Existencia inicial</span><input className="input" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
        <label className="field"><span className="label">Mínimo</span><input className="input" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} /></label>
      </div>
      <label className="field"><span className="label">Se usa en <span className="muted">(opcional)</span></span><input className="input" value={usedIn} onChange={(e) => setUsedIn(e.target.value)} placeholder="Ej. Café con leche, tortas" /></label>
    </Dialog>
  );
}
