import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CartLine } from '../types';
import { useStore } from '../store';
import { totals } from '../lib/cart';
import { TAX, dateTime, money } from '../lib/format';

interface Props {
  lines: CartLine[];
  title: string;
  at?: number;
}

/** Recibo con el logo, el nombre y el mensaje del negocio. */
export function Receipt({ lines, title, at }: Props) {
  const settings = useStore((s) => s.settings);
  const t = totals(lines, settings.tax);
  return (
    <div className="receipt num">
      {settings.logo && <img src={settings.logo} alt="" style={{ display: 'block', width: 56, height: 56, margin: '0 auto 4px', objectFit: 'contain' }} />}
      <span style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.0625rem' }}>{settings.bizName}</span>
      {settings.nit && <span style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.75rem' }}>NIT {settings.nit}</span>}
      <span style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.75rem' }}>
        {title}
        {at ? ` · ${dateTime(at)}` : ''}
      </span>
      <span className="dash" />
      {lines.map((l) => (
        <span key={l.key} className="r-line">
          <span>
            {l.qty > 1 ? `${l.qty}× ` : ''}
            {l.name}
            {l.note && <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: '0.6875rem' }}>{l.note}</span>}
          </span>
          <span>{money(l.unit * l.qty)}</span>
        </span>
      ))}
      <span className="dash" />
      <span className="r-line" style={{ color: 'var(--ink-2)' }}><span>Subtotal</span><span>{money(t.subtotal)}</span></span>
      {settings.tax !== 'none' && (
        <span className="r-line" style={{ color: 'var(--ink-2)' }}><span>{TAX[settings.tax].label}</span><span>{money(t.tax)}</span></span>
      )}
      <span className="r-line" style={{ fontWeight: 800, fontSize: '0.9375rem' }}><span>Total</span><span>{money(t.total)}</span></span>
      {settings.footer && <span style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.75rem', marginTop: 8 }}>{settings.footer}</span>}
    </div>
  );
}

/** Imprime un recibo usando el diálogo de impresión del navegador. */
export function PrintReceipt(props: Props & { onDone: () => void }) {
  const root = document.getElementById('print-root');
  const { onDone } = props;
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 50);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!root) return null;
  return createPortal(<Receipt lines={props.lines} title={props.title} at={props.at} />, root);
}
