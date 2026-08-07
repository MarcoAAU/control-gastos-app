import { DEFAULT_PERIOD, type Period } from '@/constants';
import { EMPTY_FILTERS, type FilterPatch, type TransactionFilters } from '@/models';
import { applyFilterPatch } from '@/services/filters/applyFilterPatch';
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

/**
 * Pantallas que filtran, cada una con sus criterios.
 *
 * Es un tipo cerrado a propósito: añadir un ámbito obliga a decidir dónde vive
 * y a inicializarlo, en vez de que aparezca un `undefined` la primera vez que
 * alguien escriba una cadena nueva.
 */
export type FilterScope = 'transactions' | 'reports';

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

  /**
   * Criterios de filtrado, SEPARADOS POR PANTALLA.
   *
   * ⚠️ NO ES UN JUEGO DE FILTROS COMPARTIDO, y la diferencia es de
   * comportamiento, no de organización. Acotar un informe para exportarlo no
   * debe recortar en silencio la lista de Movimientos, ni al revés: un filtro
   * que aparece en una pantalla donde nadie lo puso es indistinguible de datos
   * perdidos.
   *
   * Tampoco valía dejar los de Reportes en `useState` local: se perdían al
   * tocar cualquier pestaña de la barra inferior, y montar un informe con
   * cuatro criterios cuesta bastante más que anotar un gasto. Con el ámbito
   * dentro del store, cada pantalla conserva lo suyo mientras dure la sesión.
   */
  filters: Record<FilterScope, TransactionFilters>;

  /**
   * Texto TAL COMO SE ESTÁ ESCRIBIENDO, también por pantalla.
   *
   * No es lo mismo que `filters[scope].search`. Esta cadena cambia con cada
   * tecla y la pinta el cuadro de búsqueda al instante; el criterio que se
   * aplica es el valor retrasado (`useDebouncedValue`), para no recorrer todos
   * los movimientos en cada pulsación. Son dos cosas distintas —lo que se ve y
   * lo que se aplica— y fundirlas obligaría a elegir entre un campo que va a
   * tirones o un filtrado en cada tecla.
   */
  search: Record<FilterScope, string>;
  toasts: Toast[];

  setStatus(status: AppStatus): void;
  setStartupWarnings(warnings: string[]): void;
  dismissStartupWarnings(): void;
  setPersistenceError(message: string | null): void;

  setPeriod(period: Period): void;
  setFilters(scope: FilterScope, filters: TransactionFilters): void;
  /** Añade, cambia o QUITA criterios. Poner una clave a `undefined` la borra. */
  patchFilters(scope: FilterScope, patch: FilterPatch): void;
  clearFilters(scope: FilterScope): void;
  setSearch(scope: FilterScope, search: string): void;

  showToast(message: string, kind?: ToastKind): string;
  dismissToast(id: string): void;
}

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  status: 'hydrating',
  startupWarnings: [],
  persistenceError: null,

  period: DEFAULT_PERIOD,
  filters: { transactions: EMPTY_FILTERS, reports: EMPTY_FILTERS },
  search: { transactions: '', reports: '' },
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

  setFilters(scope, filters) {
    set((state) => ({ filters: { ...state.filters, [scope]: filters } }));
  },

  /**
   * Fusiona el parche y elimina las claves puestas a `undefined`.
   *
   * La regla vive en `services/filters/applyFilterPatch` y no aquí: es lógica
   * pura, se testea sin montar el store, y así las dos pantallas que filtran
   * comparten literalmente el mismo código en vez de dos copias parecidas.
   */
  patchFilters(scope, patch) {
    set((state) => ({
      filters: { ...state.filters, [scope]: applyFilterPatch(state.filters[scope], patch) },
    }));
  },

  clearFilters(scope) {
    set((state) =>
      Object.keys(state.filters[scope]).length === 0
        ? {}
        : { filters: { ...state.filters, [scope]: EMPTY_FILTERS } },
    );
  },

  setSearch(scope, search) {
    set((state) =>
      state.search[scope] === search ? {} : { search: { ...state.search, [scope]: search } },
    );
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
