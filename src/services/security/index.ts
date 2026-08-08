import { noopSecurityProvider } from './NoopSecurityProvider';
import type { SecurityProvider } from './SecurityProvider';

export type { SecurityProvider, SecurityStatus, UnlockResult } from './SecurityProvider';
export { noopSecurityProvider } from './NoopSecurityProvider';

/**
 * ⚠️ ESTA LÍNEA ES LA COSTURA. Cambiarla es todo lo que hace falta para
 * activar el bloqueo el día que exista un proveedor de verdad.
 *
 * Se instancia una sola vez, a nivel de módulo y no dentro de un componente:
 * `AuthGate` lo consume con `useSyncExternalStore`, que exige referencias
 * estables. Un proveedor creado en cada render se resuscribiría sin parar.
 *
 * Antes de sustituirlo, leer el `README.md` de esta carpeta.
 */
export const security: SecurityProvider = noopSecurityProvider;
