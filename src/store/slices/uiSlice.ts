import { DEFAULT_PERIOD, type Period } from '@/constants';
import { EMPTY_FILTERS, type FilterPatch, type TransactionFilters } from '@/models';
import { createId } from '@/services/id/createId';
import type { SliceCreator } from '../types';

/**
 * Estado efímero de la interfaz.
 *
 * ⚠️ NADA DE ESTE SLICE SE PERSISTE (`selectPersisted` en `types.ts` no lo
 * incluye). Es deliberado: guardar la UI hace que la app reabra con un modal a
 * medias o un filtro invisible aplicado, y el usuario cree que se rompió.
 *
 * Aquí también vive el estado de arranque (hidratación, avisos de migración,
 * error de almacenamiento) porque es exactamente lo mismo: información que la
 * interfaz necesita mostrar y que no tiene sentido conservar entre sesiones.
 */

export type AppStatus = 'hydrating' | 'ready' | 'error';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

export interface UiSlice {
  status: AppStatus;
  /** Avisos de la carga/migración, para mostrarlos una sola vez. */
  startupWarnings: string[];
  /**
   * Motivo por el que no se está guardando, si aplica.
   *
   * En v1 un fallo al guardar era invisible: el usuario seguía escribiendo
   * movimientos que no se estaban persistiendo. Aquí la UI puede avisarlo.
   */
  persistenceError: string | null;

  period: Period;
  filters: TransactionFilters;
  /**
   * Texto TAL COMO SE ESTÁ ESCRIBIENDO. No es lo mismo que `filters.search`.
   *
   * Esta cadena cambia con cada tecla y la pinta el cuadro de búsqueda al
   * instante; `filters.search` es el criterio ya comprometido, que la pantalla
   * compone con el valor retrasado (`useDebouncedValue`) para no recorrer
   * todos los movimientos en cada pulsación. Son dos cosas distintas —lo que
   * se ve y lo que se aplica— y por eso viven separadas: fundirlas obligaría a
   * elegir entre un campo que va a tirones o un filtrado en cada tecla.
   */
  search: string;
  toasts: Toast[];

  setStatus(status: AppStatus): void;
  setStartupWarnings(warnings: string[]): void;
  dismissStartupWarnings(): void;
  setPersistenceError(message: string | null): void;

  setPeriod(period: Period): void;
  setFilters(filters: TransactionFilters): void;
  /** Añade, cambia o QUITA criterios. Poner una clave a `undefined` la borra. */
  patchFilters(patch: FilterPatch): void;
  clearFilters(): void;
  setSearch(search: string): void;

  showToast(message: string, kind?: ToastKind): string;
  dismissToast(id: string): void;
}

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  status: 'hydrating',
  startupWarnings: [],
  persistenceError: null,

  period: DEFAULT_PERIOD,
  filters: EMPTY_FILTERS,
  search: '',
  toasts: [],

  setStatus(status) {
    set((state) => (state.status === status ? {} : { status }));
  },

  setStartupWarnings(warnings) {
    set({ startupWarnings: warnings });
  },

  dismissStartupWarnings() {
    set((state) => (state.startupWarnings.length === 0 ? {} : { startupWarnings: [] }));
  },

  setPersistenceError(message) {
    set((state) => (state.persistenceError === message ? {} : { persistenceError: message }));
  },

  setPeriod(period) {
    set((state) => (state.period === period ? {} : { period }));
  },

  setFilters(filters) {
    set({ filters });
  },

  /**
   * Fusiona el parche y ELIMINA las claves puestas a `undefined`.
   *
   * El borrado no es cosmético. Con `{ ...filters, ...patch }` a secas, quitar
   * el filtro de cuenta dejaría dentro `accountIds: undefined`: no filtraría
   * nada —los predicados tratan lo ausente como "sin restricción"— pero
   * `Object.entries` seguiría viendo la clave, así que la insignia del botón
   * contaría un filtro que ya no existe y el usuario buscaría en vano cuál es.
   */
  patchFilters(patch) {
    set((state) => {
      const next: Record<string, unknown> = { ...state.filters, ...patch };
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete next[key];
      }
      return { filters: next as TransactionFilters };
    });
  },

  clearFilters() {
    set((state) =>
      Object.keys(state.filters).length === 0 ? {} : { filters: EMPTY_FILTERS },
    );
  },

  setSearch(search) {
    set((state) => (state.search === search ? {} : { search }));
  },

  showToast(message, kind = 'info') {
    const id = createId();
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }));
    return id;
  },

  dismissToast(id) {
    set((state) => {
      const next = state.toasts.filter((t) => t.id !== id);
      return next.length === state.toasts.length ? {} : { toasts: next };
    });
  },
});
