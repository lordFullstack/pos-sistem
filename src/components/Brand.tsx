import type { ReactNode } from 'react';
import { useStore } from '../store';
import { BizIcon } from './ProductIcon';

/** Logo del negocio (o el ícono del tipo de negocio) con título y subtítulo. */
export function Brand({ title, sub, icon }: { title?: string; sub: ReactNode; icon?: ReactNode }) {
  const settings = useStore((s) => s.settings);
  return (
    <div className="brand">
      <div className="brand-mark">
        {icon ?? (settings.logo ? <img src={settings.logo} alt={`Logotipo de ${settings.bizName}`} /> : <BizIcon type={settings.bizType} />)}
      </div>
      <div className="col" style={{ gap: 0 }}>
        <span className="brand-title">{title ?? settings.bizName}</span>
        <span className="brand-sub">{sub}</span>
      </div>
    </div>
  );
}
