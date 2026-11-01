import { WARN_SIZE, useSaveStatus } from '../lib/safeStorage';
import { Icon } from './Icon';

/** Aviso fijo cuando la tablet no pudo guardar o se está quedando sin espacio. */
export function SaveBanner() {
  const { ok, size } = useSaveStatus();
  if (ok && size < WARN_SIZE) return null;
  return (
    <div className={`notice ${ok ? 'notice-note' : 'notice-warn'} save-banner`} role={ok ? 'status' : 'alert'}>
      <Icon name="warning" size={18} />
      <span className="grow">
        {ok
          ? 'La memoria de esta tablet se está llenando. Haz una copia de seguridad en Ajustes y avisa al administrador antes de que deje de guardar.'
          : 'No se pudieron guardar los últimos cambios: la memoria de esta tablet está llena. No recargues la página. Haz una copia de seguridad en Ajustes y avisa al administrador.'}
      </span>
      <a className="btn btn-sm btn-white" href="#/ajustes/backup">Ir a copias</a>
    </div>
  );
}
