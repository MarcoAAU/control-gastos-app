import { useSyncExternalStore, type ReactNode } from 'react';
import { security } from '@/services/security';

/**
 * Referencias ESTABLES, a nivel de módulo.
 *
 * `useSyncExternalStore` vuelve a suscribirse cada vez que `subscribe` cambia
 * de identidad. Pasando `security.subscribe` directamente el método perdería
 * su `this` —hoy da igual, pero un proveedor con estado lo usará—, y creando
 * las funciones dentro del componente se recrearían en cada render y la
 * suscripción se rehría sin parar.
 */
const subscribe = (listener: () => void): (() => void) => security.subscribe(listener);
const getStatus = (): ReturnType<typeof security.getStatus> => security.getStatus();

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Pasarela de autenticación. HOY NO HACE NADA, Y ESO ES LO CORRECTO.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Con el proveedor no-op el estado es siempre `'disabled'`, así que este
 * componente devuelve sus hijos tal cual: la app se comporta exactamente igual
 * que sin él. Verificable, y es el criterio de aceptación de la fase.
 *
 * ── POR QUÉ ENVOLVER YA, SI NO BLOQUEA NADA ───────────────────────────────
 * Porque el sitio donde va la pasarela no es una decisión menor. Tiene que
 * quedar por DENTRO del arranque —los datos se hidratan antes, o el bloqueo
 * mostraría una app vacía tras desbloquear— y por FUERA del enrutado, para que
 * ninguna ruta pueda alcanzarse sin pasar por aquí. Un enlace profundo a
 * `#/cuentas` no debe saltarse el bloqueo, y con la pasarela colgando de una
 * pantalla concreta se lo saltaría.
 *
 * Dejarlo colocado ahora, cuando se puede comprobar que no cambia nada, es más
 * seguro que colocarlo el día que además haya que depurar un PIN.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribe, getStatus);

  if (status === 'locked') return <LockedPlaceholder />;

  return <>{children}</>;
}

/**
 * ⚠️ NO ES LA PANTALLA DE BLOQUEO. No hay campo de PIN ni nada que verificar:
 * eso es la Fase que implemente `SecurityProvider`, no ésta.
 *
 * Existe únicamente para que el estado `'locked'` no se pinte como una página
 * en blanco. Hoy es inalcanzable —el proveedor no-op nunca devuelve
 * `'locked'`—, pero el primer proveedor de verdad lo devolverá antes de que
 * exista su pantalla, y una app instalada que arranca en blanco es
 * indistinguible de una app rota.
 */
function LockedPlaceholder() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <p>La aplicación está bloqueada.</p>
    </main>
  );
}
