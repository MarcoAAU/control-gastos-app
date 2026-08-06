import { useEffect } from 'react';
import { AppRouter } from '@/router/AppRouter';
import { useAppStore } from '@/store';

/**
 * Raíz de la aplicación.
 *
 * El arranque (leer → migrar → hidratar) ocurre en `main.tsx` ANTES de
 * renderizar, así que aquí el estado ya está listo y no hay pantalla de carga
 * intermedia.
 */
export default function App() {
  const theme = useAppStore((state) => state.settings.theme);

  /**
   * Aplica el tema al elemento raíz.
   *
   * Es el único sitio de la app que toca `data-theme`. Los componentes leen
   * roles de color (`--color-surface`), nunca el tema: por eso cambiar de tema
   * no requiere tocar ni un componente.
   *
   * `'system'` existe en el modelo pero el selector llega en la Fase 18; hoy
   * cae en oscuro, que es lo que el usuario ya tiene instalado.
   */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }, [theme]);

  return <AppRouter />;
}
