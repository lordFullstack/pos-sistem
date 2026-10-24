import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Ventana modal con encabezado, cuerpo con scroll y pie. Se cierra con Escape. */
export function Dialog({ title, subtitle, onClose, children, footer, width }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} style={width ? { width: `min(${width}, 100%)` } : undefined}>
        <div className="dialog-head">
          <div className="col grow">
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</span>
            {subtitle && <span style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>{subtitle}</span>}
          </div>
          <button type="button" className="icon-btn" style={{ background: 'var(--bg)', boxShadow: 'none' }} onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={18} stroke={2.4} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}
