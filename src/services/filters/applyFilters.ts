import type { Category, ID, Transaction, TransactionFilters } from '@/models';

/**
 * Filtrado de movimientos. Lógica pura, sin React.
 *
 * ── DOS REGLAS QUE PARECEN DETALLES Y NO LO SON ───────────────────────────
 *
 * 1. Los campos del filtro se combinan con Y; los valores DENTRO de una lista,
 *    con O. "Cuenta A o cuenta B, y que sea un gasto" es lo que espera
 *    cualquiera al marcar dos casillas. Y lógico dentro de la lista no
 *    seleccionaría nunca nada.
 *
 * 2. Los ajustes de saldo se EXCLUYEN por defecto. Son contabilidad interna:
 *    si aparecieran en la lista, el usuario vería "ingresos" que nunca
 *    ingresó. Se muestran sólo donde tienen sentido (el detalle de la cuenta),
 *    activando `includeAdjustments`.
 *
 * La versión completa —búsqueda, rangos de importe, subcategorías, bancos—
 * llega en la Fase 14; aquí está lo que la pantalla de Movimientos necesita
 * para tener paridad con v1.
 */

export interface FilterContext {
  /** Necesario para buscar por nombre de categoría, no sólo por descripción. */
  categoryById: Map<ID, Category>;
}

function matchesSearch(tx: Transaction, term: string, context?: FilterContext): boolean {
  const haystack = [
    tx.description,
    tx.notes,
    context?.categoryById.get(tx.categoryId)?.name ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function applyFilters(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  context?: FilterContext,
): Transaction[] {
  // Se normaliza una vez, fuera del bucle: con miles de movimientos,
  // minusculizar el término en cada iteración se nota.
  const term = filters.search?.trim().toLowerCase() ?? '';
  const includeAdjustments = filters.includeAdjustments ?? false;

  return transactions.filter((tx) => {
    if (!includeAdjustments && tx.isAdjustment) return false;

    if (filters.types && filters.types.length > 0 && !filters.types.includes(tx.type)) {
      return false;
    }

    if (filters.accountIds && filters.accountIds.length > 0) {
      if (!filters.accountIds.includes(tx.accountId)) return false;
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(tx.categoryId)) return false;
    }

    if (filters.subcategoryIds && filters.subcategoryIds.length > 0) {
      if (tx.subcategoryId === null || !filters.subcategoryIds.includes(tx.subcategoryId)) {
        return false;
      }
    }

    // Comparación de cadenas `YYYY-MM-DD`: es correcta porque el formato es
    // lexicográficamente ordenable, y evita construir un Date por movimiento.
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;
    if (filters.month && !tx.date.startsWith(filters.month)) return false;
    if (filters.year && !tx.date.startsWith(filters.year)) return false;

    if (filters.amountMin !== undefined && tx.amount < filters.amountMin) return false;
    if (filters.amountMax !== undefined && tx.amount > filters.amountMax) return false;

    if (term && !matchesSearch(tx, term, context)) return false;

    return true;
  });
}

/** ¿Hay algún criterio activo? Sirve para decidir si mostrar "limpiar filtros". */
export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Object.entries(filters).some(([key, value]) => {
    // `includeAdjustments` es una preferencia de visualización, no un filtro
    // que el usuario haya "puesto".
    if (key === 'includeAdjustments') return false;
    if (value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}
