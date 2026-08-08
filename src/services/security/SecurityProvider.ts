/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Costura de seguridad — LA INTERFAZ, NADA MÁS.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Aquí no hay PIN, ni biometría, ni cifrado. Es deliberado y es lo que se
 * pidió: dejar preparada la arquitectura sin implementar nada todavía.
 *
 * Lo que este archivo compra es que el día que se implemente **no haya que
 * tocar ninguna pantalla**: `AuthGate` ya consulta esta interfaz, `AppSettings`
 * ya reserva los tres campos (`pinEnabled`, `biometricsEnabled`,
 * `autoLockMinutes`) y `services/security/index.ts` decide qué proveedor se
 * usa en una sola línea. Sin la costura, añadir el bloqueo más adelante sería
 * una migración del modelo de datos con el dinero real del usuario dentro.
 *
 * ⚠️ Léase `README.md` de esta carpeta antes de implementar nada: explica qué
 * protege realmente un PIN en una app web y qué NO, que es la parte que más
 * fácil se malentiende.
 *
 * ── POR QUÉ CUATRO MÉTODOS Y NO OCHO ──────────────────────────────────────
 * Una abstracción especulativa se paga dos veces: al escribirla y el día que
 * no encaja con lo que de verdad hacía falta. Estos cuatro son los que
 * cualquier implementación —PIN local, biometría del sistema, contraseña
 * remota— necesita sí o sí. Todo lo demás (reintentos, caducidad, políticas)
 * es asunto interno del proveedor y no tiene por qué asomar aquí.
 */

/**
 * `'disabled'` NO es lo mismo que `'unlocked'`.
 *
 * Sin bloqueo configurado no hay nada que desbloquear: la app entra directa y
 * no debe existir ninguna pantalla intermedia. Con bloqueo configurado y ya
 * superado, sí hay una sesión abierta que un temporizador puede cerrar. Si se
 * fundieran en un solo valor, el auto-bloqueo tendría que adivinar cuál de las
 * dos situaciones tiene delante.
 */
export type SecurityStatus = 'disabled' | 'locked' | 'unlocked';

export interface UnlockResult {
  ok: boolean;
  /** Texto listo para mostrar cuando `ok` es `false`. */
  error?: string;
  /**
   * Intentos que quedan antes de una espera forzada, si el proveedor la
   * aplica. `undefined` = el proveedor no lleva esa cuenta.
   */
  attemptsLeft?: number;
}

export interface SecurityProvider {
  /** Situación actual. Es lo que decide si `AuthGate` deja pasar. */
  getStatus(): SecurityStatus;

  /**
   * Comprueba el secreto y, si es correcto, abre la sesión.
   *
   * Asíncrono desde el día uno aunque un PIN local se verifique al instante:
   * la biometría del sistema y cualquier comprobación remota lo son, y
   * convertir esto en `Promise` más tarde obligaría a propagar `await` por
   * todos los llamantes.
   */
  unlock(secret: string): Promise<UnlockResult>;

  /** Cierra la sesión. Lo llamará el auto-bloqueo y el botón "Bloquear ahora". */
  lock(): void;

  /**
   * Avisa de cada cambio de estado y devuelve la función para dejar de
   * escuchar.
   *
   * Es la forma que espera `useSyncExternalStore`, que es como `AuthGate` lo
   * consume: sin esto, bloquear por inactividad no repintaría nada.
   */
  subscribe(listener: () => void): () => void;
}
