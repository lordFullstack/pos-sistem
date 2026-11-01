import { useEffect } from 'react';
import { useStore } from './store';
import { useRoute } from './router';
import { Bienvenida } from './screens/Bienvenida';
import { Caja } from './screens/Caja';
import { Mesas } from './screens/Mesas';
import { Ordenes } from './screens/Ordenes';
import { Inventario } from './screens/Inventario';
import { Reportes } from './screens/Reportes';
import { Contabilidad } from './screens/Contabilidad';
import { Ajustes } from './screens/Ajustes';
import { Modulos } from './screens/Modulos';
import { Menu } from './screens/Menu';
import { SaveBanner } from './components/SaveBanner';
import { gradientEnd } from './data/palettes';

export function App() {
  const settings = useStore((s) => s.settings);
  const { route, param } = useRoute();

  // Color principal y tamaño de texto elegidos en Ajustes.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', settings.accent);
    root.style.setProperty('--accent-2', gradientEnd(settings.accent));
    root.dataset.text = settings.textSize;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.accent);
    document.title = settings.onboarded ? `${settings.bizName} · POS` : 'POS Moderno';
  }, [settings.accent, settings.textSize, settings.bizName, settings.onboarded]);

  return (
    <>
      <SaveBanner />
      {!settings.onboarded ? <Bienvenida /> : <Screen route={route} param={param} />}
    </>
  );
}

function Screen({ route, param }: ReturnType<typeof useRoute>) {
  switch (route) {
    case 'mesas': return <Mesas />;
    case 'ordenes': return <Ordenes />;
    case 'inventario': return <Inventario />;
    case 'reportes': return <Reportes />;
    case 'contabilidad': return <Contabilidad />;
    case 'menu': return <Menu />;
    case 'ajustes': return <Ajustes key={param} initialSection={param} />;
    case 'modulos': return <Modulos />;
    default: return <Caja tableParam={param} />;
  }
}
