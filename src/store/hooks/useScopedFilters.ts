import { useCallback } from 'react';
import type { FilterPatch, TransactionFilters } from '@/models';
import type { FilterScope } from '../slices/uiSlice';
import { useAppStore } from '../index';

export interface ScopedFilters {
  filters: TransactionFilters;
  search: string;
  patchFilters(patch: FilterPatch): void;
  clearFilters(): void;
  setSearch(value: string): void;
}

/**
 * Los filtros de UNA pantalla, con el ámbito ya atado.
 *
 * ── POR QUÉ UN HOOK Y NO PASAR EL ÁMBITO EN CADA LLAMADA ──────────────────
 * Sin esto, cada pantalla escribiría `patchFilters('reports', patch)` en cinco
 * sitios y `clearFilters('reports')` en otros dos. Basta olvidar uno —o
 * copiarlo de la otra pantalla sin cambiar la cadena— para que Reportes
 * escriba en los filtros de Movimientos. El fallo no daría ningún error: la
 * otra pantalla simplemente aparecería filtrada sola, que es justo el problema
 * que la separación por ámbito venía a evitar.
 *
 * Atándolo una vez, el ámbito se nombra en un único punto por pantalla y el
 * resto del código no sabe que existe.
 *
 * Las funciones se memorizan con `useCallback` porque acaban en las
 * dependencias de los `useMemo` que filtran: sin ello se recrearían en cada
 * render y el filtrado se recalcularía siempre, que es exactamente lo que el
 * retraso de la búsqueda intenta evitar.
 */
export function useScopedFilters(scope: FilterScope): ScopedFilters {
  const filters = useAppStore((state) => state.filters[scope]);
  const search = useAppStore((state) => state.search[scope]);
  const patch = useAppStore((state) => state.patchFilters);
  const clear = useAppStore((state) => state.clearFilters);
  const setValue = useAppStore((state) => state.setSearch);

  return {
    filters,
    search,
    patchFilters: useCallback((next: FilterPatch) => patch(scope, next), [patch, scope]),
    clearFilters: useCallback(() => clear(scope), [clear, scope]),
    setSearch: useCallback((value: string) => setValue(scope, value), [setValue, scope]),
  };
}
