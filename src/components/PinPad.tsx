import { useEffect } from 'react';
import { PIN_LENGTH } from '../lib/pin';
import { Icon } from './Icon';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Se llama al completar los 4 dígitos. */
  onComplete?: (v: string) => void;
  error?: string;
  disabled?: boolean;
  label: string;
}

/** Cuatro puntos y un teclado numérico grande. También acepta el teclado físico. */
export function PinPad({ value, onChange, onComplete, error, disabled, label }: Props) {
  const press = (d: string) => {
    if (disabled || value.length >= PIN_LENGTH) return;
    const next = value + d;
    onChange(next);
    if (next.length === PIN_LENGTH) onComplete?.(next);
  };
  const back = () => !disabled && onChange(value.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="col" style={{ alignItems: 'center', gap: 16 }}>
      <div role="status" aria-label={`${label}: ${value.length} de ${PIN_LENGTH} números`} className="row" style={{ gap: 14, justifyContent: 'center' }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} aria-hidden="true" style={{
            width: 18, height: 18, borderRadius: 999,
            background: i < value.length ? (error ? 'var(--bad-ink)' : 'var(--accent)') : 'transparent',
            boxShadow: `inset 0 0 0 2px ${error ? 'var(--bad-ink)' : i < value.length ? 'var(--accent)' : '#c9c2ba'}`,
          }} />
        ))}
      </div>
      <span role="alert" style={{ minHeight: 20, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--bad-ink)', textAlign: 'center' }}>{error}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 4.5rem)', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="pin-key" onClick={() => press(d)} disabled={disabled}>{d}</button>
        ))}
        <span />
        <button type="button" className="pin-key" onClick={() => press('0')} disabled={disabled}>0</button>
        <button type="button" className="pin-key" onClick={back} disabled={disabled || !value} aria-label="Borrar último número" style={{ background: 'transparent' }}>
          <Icon name="arrowLeft" size={22} />
        </button>
      </div>
    </div>
  );
}
