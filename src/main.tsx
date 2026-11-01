import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Letra incluida en la app: funciona sin internet.
import '@fontsource-variable/manrope';
import './styles.css';

const printRoot = document.createElement('div');
printRoot.id = 'print-root';
document.body.appendChild(printRoot);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
