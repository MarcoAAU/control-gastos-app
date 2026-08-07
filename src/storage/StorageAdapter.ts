/**
 * Contrato de almacenamiento de bajo nivel.
 *
 * ASÍNCRONO DESDE EL DÍA UNO aunque localStorage sea síncrono (ADR-008).
 * El motivo es puramente práctico: si mañana los datos se mueven a IndexedDB
 * o a la nube, la firma no cambia. Con una interfaz síncrona, ese cambio
 * obligaría a propagar `await` por decenas de archivos y a revisar cada punto
 * de llamada — exactamente la clase de refactor que este proyecto existe para
 * no volver a necesitar.
 */

export type StorageFailureReason =
  /** Sin espacio. En localStorage son ~5 MB por origen. */
  | 'quota-exceeded'
  /** No hay almacenamiento (modo privado, cookies bloqueadas, WebView raro). */
  | 'unavailable'
  | 'unknown';

/**
 * Error de almacenamiento con una causa clasificada.
 *
 * Existe para que la capa de arriba pueda REACCIONAR de forma distinta a
 * cada caso (cuota llena → ofrecer exportar y borrar historial; no disponible
 * → arrancar en modo sólo lectura) en vez de mostrar un "algo salió mal".
 * En v1 un fallo al guardar no se notaba: el usuario seguía escribiendo
 * movimientos que no se estaban persistiendo.
 */
export class StorageError extends Error {
  readonly reason: StorageFailureReason;

  constructor(reason: StorageFailureReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
    this.reason = reason;
  }
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  /** @throws {StorageError} */
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** Claves presentes. Lo usa el listado de respaldos. */
  keys(): Promise<string[]>;
  /** `false` si el medio no está operativo (modo privado, cuota a cero…). */
  isAvailable(): boolean;
}
