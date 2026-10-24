import { useMemo, useState } from 'react';
import type { PayMethod } from '../types';
import { useCurrentUser, useStore } from '../store';
import { TAX, dateTime, intLabel, money, moneyShort, time } from '../lib/format';
import { buckets, change, niceMax, paySplit, rangeFor, salesIn, startOfDay, summarize, topProducts, type Period } from '../lib/stats';
import { downloadText, toCsv } from '../lib/backup';
import { backupNow } from '../lib/backupStore';
import { can } from '../data/roles';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';
import { Dialog } from '../components/Dialog';

const PERIODS: [Period, string, string, string][] = [
  ['hoy', 'Hoy', 'Ventas por hora', 'vs. ayer'],
  ['semana', 'Últimos 7 días', 'Ventas por día', 'vs. 7 días anteriores'],
  ['mes', 'Este mes', 'Ventas por semana', 'vs. mes anterior'],
];
const PAY_LABEL: Record<PayMethod, string> = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', transferencia: 'Transferencia' };
const PLOT_H = 260;

export function Reportes() {
  const user = useCurrentUser();
  const sales = useStore((s) => s.sales);
  const settings = useStore((s) => s.settings);
  const [period, setPeriod] = useState<Period>('hoy');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [hover, setHover] = useState(-1);
  const [closing, setClosing] = useState(false);
  const closures = useStore((s) => s.closures);

  const now = Date.now();
  const r = rangeFor(period, now);
  const cur = useMemo(() => salesIn(sales, r.start, r.end), [sales, r.start, r.end]);
  const prev = useMemo(() => salesIn(sales, r.prevStart, r.prevEnd), [sales, r.prevStart, r.prevEnd]);

  if (!can(user?.role, 'reportes')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Reportes" /></header><NoAccess what="los reportes" /><ModuleNav current="reportes" /></main></div>;
  }

  const [, , chartTitle, vs] = PERIODS.find((p) => p[0] === period)!;
  const sum = summarize(cur);
  const psum = summarize(prev);
  const bars = buckets(period, sales, now);
  const max = Math.max(0, ...bars.map((b) => b.value));
  const axisMax = niceMax(max);
  const peak = bars.findIndex((b) => b.value === max && max > 0);
  const top = topProducts(cur);
  const split = paySplit(cur);
  const splitList = (Object.keys(split) as PayMethod[]).map((k) => ({ k, v: split[k] })).sort((a, b) => b.v - a.v);
  const splitMax = Math.max(1, ...splitList.map((x) => x.v));
  const lastClosure = closures.filter((c) => c.at >= startOfDay(now)).sort((a, b) => b.at - a.at)[0];

  const delta = (a: number, b: number) => {
    const c = change(a, b);
    if (c === null) return { text: `Sin datos ${vs}`, icon: '' };
    return { text: `${c >= 0 ? '+' : ''}${c}% ${vs}`, icon: c >= 0 ? 'arrowUp' : 'arrowDown' };
  };
  const kpis = [
    { label: 'Ventas totales', value: money(sum.total), d: delta(sum.total, psum.total) },
    { label: 'Órdenes cobradas', value: intLabel(sum.count), d: delta(sum.count, psum.count) },
    { label: 'Ticket promedio', value: money(sum.ticket), d: delta(sum.ticket, psum.ticket) },
    { label: TAX[settings.tax].label, value: money(sum.tax), d: { text: settings.tax === 'none' ? 'No se cobra impuesto' : 'Cobrado sobre las ventas', icon: '' } },
  ];

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Fecha', 'Productos', 'Subtotal', 'Impuesto', 'Total', 'Medio de pago']];
    cur.forEach((s) => rows.push([dateTime(s.at), s.lines.map((l) => `${l.qty}x ${l.name}${l.note ? ' (' + l.note + ')' : ''}`).join(', '), s.subtotal, s.tax, s.total, PAY_LABEL[s.method]]));
    downloadText(`ventas-${period}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand title="Reportes" icon={<Icon name="chart" size={22} />} sub={PERIODS.find((p) => p[0] === period)![1]} />
          <button type="button" className="btn btn-white spacer" onClick={exportCsv} disabled={!cur.length}><Icon name="download" size={18} /> Exportar a Excel</button>
        </header>

        <nav className="chips" aria-label="Periodo">
          {PERIODS.map(([id, label]) => <button key={id} type="button" className="chip" aria-pressed={period === id} onClick={() => { setPeriod(id); setHover(-1); }}>{label}</button>)}
        </nav>

        <section className="kpis" aria-label="Indicadores">
          {kpis.map((k) => (
            <div key={k.label} className="kpi">
              <span className="k-label">{k.label}</span>
              <span className="k-value num">{k.value}</span>
              <span className="k-note">{k.d.icon && <Icon name={k.d.icon} size={12} stroke={3} />}{k.d.text}</span>
            </div>
          ))}
        </section>

        <section className="card col" aria-label={chartTitle} style={{ flex: '1 1 auto', minHeight: 0, padding: '18px 20px 14px', gap: 12 }}>
          <div className="row">
            <div className="col" style={{ gap: 0 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>{chartTitle}</h2>
              <span className="small" style={{ color: 'var(--ink-3)' }}>Pasa el dedo o el cursor por una barra para ver el valor</span>
            </div>
            <div className="seg spacer" role="group" aria-label="Vista" style={{ width: 180 }}>
              <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Gráfico</button>
              <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Tabla</button>
            </div>
          </div>

          {max === 0 ? (
            <div className="empty"><Icon name="chart" size={36} stroke={1.6} /><strong>Todavía no hay ventas en este periodo</strong><span>Cuando cobres en la caja, aquí verás el resultado.</span></div>
          ) : view === 'chart' ? (
            <div className="col" style={{ flex: '1 1 auto', justifyContent: 'flex-end', gap: 0, minHeight: PLOT_H + 30 }}>
              <div className="chart">
                <div className="grid-line" style={{ top: 0 }} />
                <div className="grid-line" style={{ top: PLOT_H / 2 }} />
                <div className="grid-line" style={{ bottom: 0, background: '#d6d0c9' }} />
                <span className="axis" style={{ top: -8 }}>{moneyShort(axisMax)}</span>
                <span className="axis" style={{ top: PLOT_H / 2 - 8 }}>{moneyShort(axisMax / 2)}</span>
                <span className="axis" style={{ bottom: -6 }}>$0</span>
                <div className="bars">
                  {bars.map((b, i) => {
                    const px = b.value ? Math.max(4, Math.round((b.value / axisMax) * PLOT_H)) : 0;
                    const hovered = hover === i;
                    const showTip = hovered || (hover < 0 && i === peak);
                    return (
                      <button key={b.label} type="button" className="bar-btn" aria-label={`${b.label}: ${money(b.value)}`}
                        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)}>
                        <span className="bar" style={{ height: px, opacity: hover >= 0 && !hovered ? 0.4 : 1 }} />
                        {showTip && <span className={`tip num ${hovered ? '' : 'soft'}`} style={{ bottom: px + 6 }}>{hovered ? money(b.value) : `Pico · ${moneyShort(b.value)}`}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="chart-labels" aria-hidden="true">{bars.map((b) => <span key={b.label}>{b.label}</span>)}</div>
            </div>
          ) : (
            <div className="scroll">
              <table className="data num">
                <thead><tr><th scope="col">{period === 'hoy' ? 'Hora' : period === 'semana' ? 'Día' : 'Semana'}</th><th scope="col" className="r">Ventas</th><th scope="col" className="r">% del total</th></tr></thead>
                <tbody>
                  {bars.map((b) => (
                    <tr key={b.label}><td style={{ fontWeight: 700 }}>{b.label}</td><td className="r">{money(b.value)}</td><td className="r" style={{ color: 'var(--ink-2)' }}>{sum.total ? Math.round((b.value / sum.total) * 100) : 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ModuleNav current="reportes" />
      </main>

      <aside className="aside" aria-label="Resumen" style={{ gap: 20 }}>
        <div className="col" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 className="section-title">Más vendidos</h2><span className="small" style={{ color: 'var(--ink-3)' }}>por ventas</span></div>
          {top.length === 0 && <span className="muted">Sin ventas en este periodo.</span>}
          {top.map((p, i) => (
            <div key={p.name} className="col" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                <span className="small" style={{ width: 18, fontWeight: 800, color: 'var(--ink-3)' }}>{i + 1}</span>
                <span className="grow" style={{ fontSize: '0.875rem', fontWeight: 700 }}>{p.name}</span>
                <span className="small num" style={{ color: 'var(--ink-3)' }}>{p.qty} und.</span>
                <span className="num" style={{ width: 84, textAlign: 'right', fontSize: '0.875rem', fontWeight: 800 }}>{moneyShort(p.value)}</span>
              </div>
              <span className="bar-track" aria-hidden="true" style={{ marginLeft: 26 }}><span className="bar-fill" style={{ display: 'block', width: `${Math.round((p.value / top[0].value) * 100)}%` }} /></span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--line-2)' }} />

        <div className="col" style={{ gap: 12 }}>
          <h2 className="section-title">Medios de pago</h2>
          {splitList.map(({ k, v }) => (
            <div key={k} className="col" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                <span className="grow" style={{ fontSize: '0.875rem', fontWeight: 700 }}>{PAY_LABEL[k]}</span>
                <span className="small num" style={{ color: 'var(--ink-3)' }}>{sum.total ? Math.round((v / sum.total) * 100) : 0}%</span>
                <span className="num" style={{ width: 96, textAlign: 'right', fontSize: '0.875rem', fontWeight: 800 }}>{money(v)}</span>
              </div>
              <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ display: 'block', width: `${Math.round((v / splitMax) * 100)}%` }} /></span>
            </div>
          ))}
        </div>

        {period === 'hoy' && can(user?.role, 'cierre') && (
          <div className="col" style={{ marginTop: 'auto', gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'var(--bg)' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>Efectivo esperado en caja</span>
              <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{money(split.efectivo)}</span>
            </div>
            {lastClosure && (
              <span className="small" style={{ color: 'var(--ink-2)' }}>
                Último cierre hoy: {time(lastClosure.at)} · contado {money(lastClosure.countedCash)} ·{' '}
                {lastClosure.countedCash === lastClosure.expectedCash ? 'cuadró exacto' : lastClosure.countedCash > lastClosure.expectedCash ? `sobraron ${money(lastClosure.countedCash - lastClosure.expectedCash)}` : `faltaron ${money(lastClosure.expectedCash - lastClosure.countedCash)}`}
              </span>
            )}
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setClosing(true)}>Hacer cierre de caja <Icon name="arrowRight" stroke={2.4} /></button>
          </div>
        )}
      </aside>

      {closing && <CierreDialog expected={split.efectivo} total={sum.total} count={sum.count} onClose={() => setClosing(false)} />}
    </div>
  );
}

function CierreDialog({ expected, total, count, onClose }: { expected: number; total: number; count: number; onClose: () => void }) {
  const remind = useStore((s) => s.settings.remindBackup);
  const snapshot = useStore((s) => s.snapshot);
  const addClosure = useStore((s) => s.addClosure);
  const user = useCurrentUser();
  const [counted, setCounted] = useState('');
  const [done, setDone] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const n = parseInt(counted.replace(/\D/g, ''), 10) || 0;
  const diff = n - expected;

  if (done) {
    return (
      <Dialog title="Cierre de caja listo" subtitle={`${count} ventas por ${money(total)} · diferencia en efectivo ${money(diff)}`} onClose={onClose} width="30rem"
        footer={<button type="button" className="btn btn-primary btn-lg" onClick={onClose}>Terminar</button>}>
        {remind && !backupMsg && (
          <div className="notice notice-note" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <span>Te recomendamos hacer una copia de seguridad al cerrar el turno.</span>
            <button type="button" className="btn btn-white" onClick={async () => {
              try {
                await backupNow(snapshot(), user?.name ?? '');
                setBackupMsg('Copia creada y descargada. Guárdala fuera de la tablet.');
              } catch (e) {
                setBackupMsg((e as Error).message);
              }
            }}><Icon name="database" size={18} /> Crear copia ahora</button>
          </div>
        )}
        {backupMsg && <div className="notice notice-ok" role="status"><Icon name="check" size={16} stroke={3} /> {backupMsg}</div>}
        <span className="muted">El cierre quedó guardado. Lo ves en Reportes › Hoy.</span>
      </Dialog>
    );
  }

  return (
    <Dialog title="Cierre de caja" subtitle={`Hoy: ${count} ventas por ${money(total)}`} onClose={onClose} width="30rem"
      footer={<button type="button" className="btn btn-primary btn-lg" disabled={!counted} onClick={() => {
        addClosure({ userId: user?.id ?? '', expectedCash: expected, countedCash: n, salesCount: count, salesTotal: total });
        setDone(true);
      }}>Confirmar cierre</button>}>
      <div className="row" style={{ justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'var(--bg)' }}>
        <span style={{ fontWeight: 600 }}>Efectivo esperado</span>
        <span className="num" style={{ fontSize: '1.125rem', fontWeight: 800 }}>{money(expected)}</span>
      </div>
      <label className="field">
        <span className="label">Efectivo contado en caja</span>
        <input className="input num" inputMode="numeric" placeholder="$0" value={counted ? money(n) : ''} onChange={(e) => setCounted(e.target.value)} autoFocus />
      </label>
      {counted && (
        <div className={`notice ${diff === 0 ? 'notice-ok' : 'notice-warn'}`}>
          <Icon name={diff === 0 ? 'check' : 'warning'} size={16} />
          {diff === 0 ? 'La caja cuadra exacto.' : diff > 0 ? `Sobran ${money(diff)}.` : `Faltan ${money(-diff)}.`}
        </div>
      )}
    </Dialog>
  );
}
