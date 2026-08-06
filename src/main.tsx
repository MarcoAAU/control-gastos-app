import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css';

// Herramientas de diagnóstico sólo en desarrollo. Vite sustituye
// `import.meta.env.DEV` por `false` al compilar, así que la importación
// dinámica se elimina del bundle publicado junto con todo su árbol.
if (import.meta.env.DEV) {
  void import('./storage/devDryRun').then((m) => m.registerDryRun());
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root en index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
