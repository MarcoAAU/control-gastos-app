/**
 * Agrupa llamadas seguidas en una sola, tras `waitMs` de reposo.
 *
 * Dos usos reales en esta app: la escritura a disco (que no debe dispararse en
 * cada tecla mientras se escribe un importe) y el filtrado en vivo de la
 * búsqueda.
 *
 * `cancel()` es indispensable, no un extra: sin él, un temporizador pendiente
 * escribiría después de que la persistencia se haya detenido, o dispararía un
 * `setState` sobre un componente ya desmontado.
 */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  /** `true` si hay una llamada pendiente de ejecutarse. */
  isPending(): boolean;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  debounced.isPending = (): boolean => timer !== null;

  return debounced;
}
