import { useEffect, useState } from 'react';
import type { User } from '../types';
import { useCurrentUser, useStore } from '../store';
import { roleLabel } from '../data/roles';
import { checkPin, lockRemaining, registerAttempt, triesLeft } from '../lib/pin';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { PinPad } from './PinPad';

export function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/** Elegir quién usa la caja. Pide el PIN de la persona elegida si tiene uno. */
export function SwitchUserDialog({ onClose }: { onClose: () => void }) {
  const users = useStore((s) => s.users).filter((u) => u.active);
  const current = useCurrentUser();
  const switchUser = useStore((s) => s.switchUser);
  const [target, setTarget] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(0);

  // Cuenta regresiva del bloqueo.
  useEffect(() => {
    if (!target) return;
    setLocked(lockRemaining(target.id));
    const t = setInterval(() => setLocked(lockRemaining(target.id)), 1000);
    return () => clearInterval(t);
  }, [target]);

  const choose = (u: User) => {
    if (u.id === current?.id) return onClose();
    if (!u.pinHash) {
      switchUser(u.id);
      return onClose();
    }
    setTarget(u);
    setPin('');
    setError('');
  };

  const verify = async (value: string) => {
    if (!target) return;
    const ok = await checkPin(target.id, target.pinHash, value);
    const wait = registerAttempt(target.id, ok);
    if (ok) {
      switchUser(target.id);
      onClose();
      return;
    }
    setPin('');
    setLocked(wait);
    setError(wait ? `Demasiados intentos. Espera ${wait} s.` : `PIN incorrecto. Te quedan ${triesLeft(target.id)} intentos.`);
  };

  if (target) {
    return (
      <Dialog title={`Hola, ${target.name.split(' ')[0]}`} subtitle={`${roleLabel(target.role)} · escribe tu PIN de 4 números`} onClose={onClose} width="26rem"
        footer={<button type="button" className="btn btn-md" style={{ width: '100%' }} onClick={() => setTarget(null)}><Icon name="arrowLeft" size={18} /> Elegir otro usuario</button>}>
        <PinPad label="PIN" value={pin} onChange={(v) => { setPin(v); if (!locked) setError(''); }} onComplete={verify}
          disabled={locked > 0} error={locked > 0 ? `Demasiados intentos. Espera ${locked} s.` : error} />
      </Dialog>
    );
  }

  return (
    <Dialog title="¿Quién usa la caja?" subtitle="Toca tu nombre. Si tienes PIN, te lo pedimos." onClose={onClose} width="28rem">
      <div className="col" style={{ gap: 8 }}>
        {users.map((u) => (
          <button key={u.id} type="button" className="user-pick" aria-current={u.id === current?.id} onClick={() => choose(u)}>
            <span className="avatar" aria-hidden="true">{initials(u.name)}</span>
            <span className="col grow" style={{ gap: 2 }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800 }}>{u.name}{u.id === current?.id ? ' (ahora)' : ''}</span>
              <span className="small" style={{ color: 'var(--ink-3)' }}>{roleLabel(u.role)}</span>
            </span>
            {u.pinHash ? <Icon name="lock" size={18} style={{ color: 'var(--ink-3)' }} /> : <span className="tag tag-warn">Sin PIN</span>}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
