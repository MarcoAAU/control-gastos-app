import { AppRouter } from '@/router/AppRouter';
import { AuthGate } from '@/components/security/AuthGate';
import { useAppliedTheme } from '@/hooks/useAppliedTheme';

/**
 * Raíz de la aplicación.
 *
 * El arranque (leer → migrar → hidratar) ocurre en `main.tsx` ANTES de
 * renderizar, así que aquí el estado ya está listo y no hay pantalla de carga
 * intermedia.
 *
 * `AuthGate` envuelve al enrutado y no al revés: así ninguna ruta —tampoco un
 * enlace profundo a `#/cuentas`— puede alcanzarse sin pasar por él. Hoy es
 * transparente: el proveedor de seguridad no bloquea nada (Fase 19).
 *
 * El tema se aplica en `useAppliedTheme`, que junta tres piezas —preferencia
 * guardada, esquema del sistema y color de la barra de estado— y ninguna es
 * asunto de la raíz.
 */
export default function App() {
  useAppliedTheme();

  return (
    <AuthGate>
      <AppRouter />
    </AuthGate>
  );
}
