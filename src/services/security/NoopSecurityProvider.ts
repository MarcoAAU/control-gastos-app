import type { SecurityProvider } from './SecurityProvider';

/**
 * El proveedor que usa la app hoy: no bloquea nada.
 *
 * ── POR QUÉ EXISTE UN "NO HACE NADA" EN VEZ DE UN `null` ──────────────────
 * Con `provider: SecurityProvider | null`, cada punto de uso tendría que
 * preguntar si hay proveedor antes de nada, y ese `if` es justo donde se cuela
 * el fallo el día que sí lo haya: basta olvidarlo en un sitio para que una
 * pantalla se salte el bloqueo. Con un objeto que siempre está y siempre
 * responde `'disabled'`, no hay ninguna rama que olvidar — el patrón de objeto
 * nulo, y aquí gana claramente.
 *
 * ── ES UNA CONSTANTE, NO UNA FÁBRICA ──────────────────────────────────────
 * No tiene estado que aislar, y `useSyncExternalStore` exige que `subscribe` y
 * `getStatus` sean referencias ESTABLES: una fábrica que devolviera un objeto
 * nuevo en cada render provocaría una resuscripción infinita. Un proveedor de
 * verdad sí tendrá estado y será una fábrica, pero entonces se instancia una
 * sola vez en `index.ts`, no en un componente.
 */
export const noopSecurityProvider: SecurityProvider = {
  getStatus() {
    return 'disabled';
  },

  /**
   * Nunca falla. No es una puerta abierta: es que **no hay puerta**. Con
   * `getStatus()` devolviendo siempre `'disabled'`, nada de la app llama a
   * este método, porque no existe ninguna pantalla que pida un secreto.
   */
  async unlock() {
    return { ok: true };
  },

  lock() {
    // No hay nada que bloquear. Un `throw` aquí sería peor: convertiría en
    // error una llamada perfectamente razonable ("bloquear ahora" pulsado
    // cuando el bloqueo no está configurado).
  },

  subscribe() {
    // El estado no cambia nunca, así que no hay nada que notificar. Se
    // devuelve igualmente una función de baja: quien se suscribe debe poder
    // darse de baja sin comprobar antes qué proveedor le tocó.
    return () => {};
  },
};
