import { AppRouter } from '@/router/AppRouter';
import { useAppliedTheme } from '@/hooks/useAppliedTheme';

/**
 * Raíz de la aplicación.
 *
 * El arranque (leer → migrar → hidratar) ocurre en `main.tsx` ANTES de
 * renderizar, así que aquí el estado ya está listo y no hay pantalla de carga
 * intermedia.
 *
 * Lo único que hace este componente es aplicar el tema. La lógica vive en
 * `useAppliedTheme` porque tiene tres piezas —preferencia guardada, esquema
 * del sistema y color de la barra de estado— y ninguna es asunto de la raíz.
 */
export default function App() {
  useAppliedTheme();
  return <AppRouter />;
}
