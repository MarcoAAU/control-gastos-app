import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { bootstrapApp } from './store/bootstrap';
import { useAppStore } from './store';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root en index.html');

/**
 * Arranque: primero se hidratan los datos, después se renderiza.
 *
 * El orden importa. Si se renderizara antes, la app aparecería vacía durante
 * unos fotogramas y el usuario vería "no tienes movimientos" justo antes de
 * que sus datos aparezcan de golpe — que con datos financieros es un susto
 * innecesario.
 */
async function start(): Promise<void> {
  const { persistence } = await bootstrapApp();

  /**
   * Guardado de emergencia al ocultar la app.
   *
   * En móvil, cerrar una PWA o cambiar de app puede matar el proceso sin
   * previo aviso, y con un debounce de 300ms el último cambio se perdería.
   * `pagehide` + `visibilitychange` es la combinación que sí se dispara de
   * forma fiable en iOS y Android; `beforeunload` no.
   */
  const flush = (): void => void persistence.flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  if (import.meta.env.DEV) {
    (globalThis as unknown as Record<string, unknown>)['__store'] = useAppStore;
    void import('./storage/devDryRun').then((m) => m.registerDryRun());
  }

  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
