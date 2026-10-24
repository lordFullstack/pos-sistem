import { useMemo, useState } from 'react';
import type { ExpenseCat, PayMethod } from '../types';
import { useCurrentUser, useStore } from '../store';
import { TAX, dayLabel, money, monthLabel } from '../lib/format';
import { dailyIncome, monthRange, salesIn } from '../lib/stats';
import { downloadText, toCsv } from '../lib/backup';
import { can } from '../data/roles';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';

const CATS: [ExpenseCat, string][] = [['insumos', 'Insumos'], ['nomina', 'Nómina'], ['arriendo', 'Arriendo'], ['servicios', 'Servicios'], ['otros', 'Otros']];
const METHODS: [PayMethod, string][] = [['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['tarjeta', 'Tarjeta']];
const catName = (c: ExpenseCat) => CATS.find((x) => x[0] === c)?.[1] ?? c;
const methodName = (m: PayMethod) => METHODS.find((x) => x[0] === m)?.[1] ?? m;

type Filter = 'todos' | 'in' | 'out';

export function Contabilidad() {
  const user = useCurrentUser();
  const sales = useStore((s) => s.sales);
  const expenses = useStore((s) => s.expenses);
  const tax = useStore((s) => s.settings.tax);
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);

  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [filter, setFilter] = useState<Filter>('todos');
  const [concept, setConcept] = useState('');
  const [cat, setCat] = useState<ExpenseCat>('insumos');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PayMethod>('efectivo');
  const [notice, setNotice] = useState('');
  const [confirmDel, setConfirmDel] = useState('');

  const { start, end } = monthRange(ym.y, ym.m);
  const monthSales = useMemo(() => salesIn(sales, start, end), [sales, start, end]);
  const monthExpenses = useMemo(() => expenses.filter((e) => e.at >= start && e.at < end), [expenses, start, end]);

  if (!can(user?.role, 'contabilidad')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Contabilidad" /></header><NoAccess what="la contabilidad" /><ModuleNav current="contabilidad" /></main></div>;
  }

  const isCurrent = ym.y === today.getFullYear() && ym.m === today.getMonth();
  const income = monthSales.reduce((a, s) => a + s.total, 0);
  const taxTotal = monthSales.reduce((a, s) => a + s.tax, 0);
  const spent = monthExpenses.reduce((a, e) => a + e.value, 0);
  const profit = income - spent;
  const margin = income ? Math.round((profit / income) * 100) : 0;

  const byCat = CATS.map(([id, label]) => ({ id, label, value: monthExpenses.filter((e) => e.cat === id).reduce((a, e) => a + e.value, 0) }))
    .filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  type Move = { id: string; at: number; concept: string; meta: string; value: number; type: 'in' | 'out'; expenseId?: string };
  const moves: Move[] = [
    ...dailyIncome(monthSales).map((d) => ({
      id: `in-${d.day}`, at: d.day + 86_399_000, concept: 'Ventas del día', meta: `${dayLabel(d.day)} · Ventas · ${d.count} cobros`, value: d.total, type: 'in' as const,
    })),
    ...monthExpenses.map((e) => ({
      id: e.id, at: e.at, concept: e.concept, meta: `${dayLabel(e.at)} · ${catName(e.cat)} · ${methodName(e.method)}`, value: e.value, type: 'out' as const, expenseId: e.id,
    })),
  ].filter((m) => filter === 'todos' || m.type === filter).sort((a, b) => b.at - a.at);

  const shift = (d: number) => {
    const dt = new Date(ym.y, ym.m + d, 1);
    setYm({ y: dt.getFullYear(), m: dt.getMonth() });
  };

  const valid = concept.trim().length > 0 && amount > 0;
  const save = () => {
    if (!valid) return;
    addExpense({ concept: concept.trim(), cat, value: amount, method });
    setNotice(`Gasto guardado: ${concept.trim()} por ${money(amount)}.`);
    setConcept('');
    setAmount(0);
    if (!isCurrent) setYm({ y: today.getFullYear(), m: today.getMonth() });
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Medio', 'Valor']];
    dailyIncome(monthSales).forEach((d) => rows.push([dayLabel(d.day), 'Ingreso', 'Ventas del día', 'Ventas', 'Caja', d.total]));
    monthExpenses.forEach((e) => rows.push([dayLabel(e.at), 'Gasto', e.concept, catName(e.cat), methodName(e.method), -e.value]));
    rows.push([], ['', '', 'Ingresos', '', '', income], ['', '', 'Gastos', '', '', -spent], ['', '', 'Utilidad', '', '', profit], ['', '', TAX[tax].label + ' cobrado', '', '', taxTotal]);
    downloadText(`contabilidad-${ym.y}-${String(ym.m + 1).padStart(2, '0')}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand title="Contabilidad" icon={<Icon name="ledger" size={22} />} sub="Ingresos, gastos y utilidad del mes" />
          <div className="row spacer" style={{ gap: 4, height: 44, padding: '0 4px', borderRadius: 12, background: '#fff', boxShadow: 'var(--shadow-ring)' }}>
            <button type="button" className="icon-btn" style={{ width: 36, height: 36, boxShadow: 'none' }} aria-label="Mes anterior" onClick={() => shift(-1)}><Icon name="chevronLeft" size={16} stroke={2.4} /></button>
            <span style={{ minWidth: 130, textAlign: 'center', fontSize: '0.875rem', fontWeight: 800 }}>{monthLabel(ym.y, ym.m)}</span>
            <button type="button" className="icon-btn" style={{ width: 36, height: 36, boxShadow: 'none' }} aria-label="Mes siguiente" disabled={isCurrent} onClick={() => shift(1)}><Icon name="chevronRight" size={16} stroke={2.4} /></button>
          </div>
          <button type="button" className="btn btn-white" onClick={exportCsv}><Icon name="download" size={18} /> Exportar a Excel</button>
        </header>

        <section className="kpis" aria-label="Resumen del mes">
          <div className="kpi"><span className="k-label">Ingresos</span><span className="k-value num">{money(income)}</span><span className="k-note">{monthSales.length} ventas registradas en caja</span></div>
          <div className="kpi"><span className="k-label">Gastos</span><span className="k-value num">{money(spent)}</span><span className="k-note">{monthExpenses.length} gastos anotados</span></div>
          <div className="kpi strong"><span className="k-label">Utilidad</span><span className="k-value num">{money(profit)}</span><span className="k-note">{income ? `Margen del ${margin}%` : 'Sin ingresos este mes'}</span></div>
          <div className="kpi"><span className="k-label">{tax === 'iva' ? 'IVA por declarar' : 'Impoconsumo por declarar'}</span><span className="k-value num">{money(taxTotal)}</span><span className="k-note">Incluido en los ingresos</span></div>
        </section>

        <div className="row" style={{ flex: '1 1 auto', minHeight: 0, alignItems: 'stretch' }}>
          <section className="card col grow" aria-label="Movimientos" style={{ minHeight: 0, overflow: 'hidden', gap: 0 }}>
            <div className="card-head">
              <h2>Movimientos</h2>
              <div className="seg spacer" role="group" aria-label="Filtrar movimientos" style={{ width: 260 }}>
                {([['todos', 'Todos'], ['in', 'Ingresos'], ['out', 'Gastos']] as [Filter, string][]).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="scroll">
              {moves.length === 0 && <div className="empty"><strong>Sin movimientos en {monthLabel(ym.y, ym.m).toLowerCase()}</strong></div>}
              {moves.map((m) => (
                <div key={m.id} className="list-row">
                  <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.type === 'in' ? 'var(--ok-bg)' : 'var(--bg)', color: m.type === 'in' ? 'var(--ok-ink)' : 'var(--ink-2)', flex: '0 0 auto' }}>
                    <Icon name={m.type === 'in' ? 'arrowIn' : 'arrowOut'} size={16} stroke={2.6} />
                  </span>
                  <span className="col grow" style={{ gap: 2 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{m.concept}</span>
                    <span className="small" style={{ color: 'var(--ink-3)' }}>{m.meta}</span>
                  </span>
                  <span className="num" style={{ fontSize: '0.9375rem', fontWeight: 800, color: m.type === 'in' ? 'var(--ok-ink)' : 'var(--ink)' }}>
                    {m.type === 'in' ? '+' : '−'}{money(m.value)}
                  </span>
                  {m.expenseId && (confirmDel === m.expenseId ? (
                    <span className="row" style={{ gap: 4 }}>
                      <button type="button" className="btn btn-sm btn-white" onClick={() => setConfirmDel('')}>No</button>
                      <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }} onClick={() => { deleteExpense(m.expenseId!); setConfirmDel(''); }}>Borrar</button>
                    </span>
                  ) : (
                    <button type="button" className="icon-btn" style={{ width: 36, height: 36, boxShadow: 'none' }} aria-label={`Borrar gasto ${m.concept}`} onClick={() => setConfirmDel(m.expenseId!)}><Icon name="trash" size={16} /></button>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="card col" aria-label="Gastos por categoría" style={{ width: 280, flex: '0 0 280px', padding: '16px 18px', gap: 14, overflowY: 'auto' }}>
            <div className="col" style={{ gap: 2 }}>
              <h2 className="section-title">Gastos por categoría</h2>
              <span className="small" style={{ color: 'var(--ink-3)' }}>Total {money(spent)}</span>
            </div>
            {byCat.length === 0 && <span className="muted">Sin gastos este mes.</span>}
            {byCat.map((c) => (
              <div key={c.id} className="col" style={{ gap: 6 }}>
                <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                  <span className="grow" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{c.label}</span>
                  <span className="small num" style={{ color: 'var(--ink-3)' }}>{Math.round((c.value / spent) * 100)}%</span>
                </div>
                <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ display: 'block', width: `${Math.max(2, Math.round((c.value / byCat[0].value) * 100))}%` }} /></span>
                <span className="num" style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{money(c.value)}</span>
              </div>
            ))}
          </section>
        </div>

        <ModuleNav current="contabilidad" />
      </main>

      <aside className="aside" aria-label="Registrar gasto">
        <div className="col" style={{ gap: 2 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registrar gasto</h2>
          <span className="muted">Las ventas entran solas desde la caja. Aquí anotas lo que sale.</span>
        </div>
        <label className="field">
          <span className="label">Concepto</span>
          <input className="input" value={concept} onChange={(e) => { setConcept(e.target.value); setNotice(''); }} placeholder="Ej. Compra de frutas" />
        </label>
        <div className="field">
          <span className="label">Categoría</span>
          <div className="chips" role="radiogroup" aria-label="Categoría">
            {CATS.map(([id, label]) => <button key={id} type="button" role="radio" className="chip chip-sm" aria-checked={cat === id} onClick={() => setCat(id)}>{label}</button>)}
          </div>
        </div>
        <label className="field">
          <span className="label">Valor</span>
          <span className="row" style={{ height: 56, padding: '0 14px', borderRadius: 12, background: 'var(--bg)', gap: 6 }}>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--ink-3)' }}>$</span>
            <input className="num grow" inputMode="numeric" placeholder="0" value={amount ? money(amount).slice(1) : ''}
              onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); setAmount(d ? parseInt(d, 10) : 0); setNotice(''); }}
              style={{ height: 52, border: 0, outline: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 800, minWidth: 0 }} />
          </span>
        </label>
        <div className="field">
          <span className="label">Pagado con</span>
          <div className="seg" role="group" aria-label="Pagado con">
            {METHODS.map(([id, label]) => <button key={id} type="button" aria-pressed={method === id} onClick={() => setMethod(id)}>{label}</button>)}
          </div>
        </div>
        {notice && <div className="notice notice-ok" role="status"><Icon name="check" size={16} stroke={3} /> {notice}</div>}
        <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 'auto' }} disabled={!valid} onClick={save}>
          Guardar gasto {amount ? money(amount) : ''}
        </button>
      </aside>
    </div>
  );
}
