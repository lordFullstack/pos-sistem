import { Icon } from './Icon';
import { useCurrentUser } from '../store';
import { roleLabel } from '../data/roles';

export function NoAccess({ what }: { what: string }) {
  const user = useCurrentUser();
  return (
    <div className="empty card" style={{ flex: '1 1 auto' }}>
      <Icon name="info" size={36} stroke={1.6} />
      <strong>Tu rol no tiene acceso a {what}</strong>
      <span>
        Estás como {user?.name ?? 'usuario'} ({user ? roleLabel(user.role) : 'sin rol'}). Pide a un administrador que entre, o cambia de usuario en
        Todos los módulos.
      </span>
      <a className="btn btn-white" href="#/modulos" style={{ marginTop: 8 }}>
        Ir a Todos los módulos
      </a>
    </div>
  );
}
