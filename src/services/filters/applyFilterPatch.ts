import type { FilterPatch, TransactionFilters } from '@/models';

/**
 * Aplica un parche de filtros y ELIMINA las claves puestas a `undefined`.
 *
 * ── POR QUÉ NO ES UN SPREAD Y YA ──────────────────────────────────────────
 * Con `{ ...filters, ...patch }` a secas, quitar el filtro de cuenta dejaría
 * dentro `accountIds: undefined`. No filtraría nada —los predicados tratan lo
 * ausente como "sin restricción"— pero `Object.entries` seguiría viendo la
 * clave, así que la insignia del botón contaría un filtro que ya no existe y
 * el usuario lo buscaría en vano (ADR-026).
 *
 * ── POR QUÉ ESTÁ AQUÍ Y NO DENTRO DEL SLICE ───────────────────────────────
 * Porque hay DOS dueños de filtros: el store, para Movimientos, y la pantalla
 * de Reportes, que lleva los suyos en estado local a propósito (un filtro
 * puesto para exportar un informe no debe recortar la lista de movimientos sin
 * avisar). Los dos necesitan exactamente esta regla, y tenerla escrita dos
 * veces garantizaba que un día divergieran.
 */
export function applyFilterPatch(
  filters: TransactionFilters,
  patch: FilterPatch,
): TransactionFilters {
  const next: Record<string, unknown> = { ...filters, ...patch };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
  }
  return next as TransactionFilters;
}
