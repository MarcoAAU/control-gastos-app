import type { ID, ISODate, Transaction, TransactionType } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Un predicado por eje de filtrado. Lógica pura, sin React.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── POR QUÉ EXISTE ESTE ARCHIVO ───────────────────────────────────────────
 * `applyFilters` era una sola función con nueve `if` seguidos. Funcionaba,
 * pero cada `if` repetía a mano la misma regla — "si el criterio no está
 * puesto, no descarta nada" — y esa regla es justo la que se rompe sola: basta
 * olvidar comprobar `length > 0` una vez para que deseleccionar la última
 * casilla deje la lista vacía en lugar de mostrarlo todo.
 *
 * Aquí la regla está escrita UNA VEZ por eje, en una función con nombre y
 * testeable por separado. `applyFilters` pasa a ser la composición.
 *
 * ── LA CONVENCIÓN QUE HACE QUE ESTO FUNCIONE ──────────────────────────────
 * Todos devuelven `true` cuando el criterio está ausente o vacío. "Sin
 * criterio" significa "sin restricción", nunca "no pasa nada". Es lo que
 * permite componerlos con Y lógico sin casos especiales.
 */

/** Ninguno de los valores marcados descarta, si no hay ninguno marcado. */
function matchesAnyOf<T>(value: T, selected: readonly T[] | undefined): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.includes(value);
}

export function matchesType(
  tx: Transaction,
  types: readonly TransactionType[] | undefined,
): boolean {
  return matchesAnyOf(tx.type, types);
}

export function matchesAccount(tx: Transaction, accountIds: readonly ID[] | undefined): boolean {
  return matchesAnyOf(tx.accountId, accountIds);
}

export function matchesCategory(tx: Transaction, categoryIds: readonly ID[] | undefined): boolean {
  return matchesAnyOf(tx.categoryId, categoryIds);
}

/**
 * Subcategoría. Único predicado que NO puede usar `matchesAnyOf`: un
 * movimiento sin subcategoría tiene `null`, y `null` nunca debe colarse en un
 * filtro que pide subcategorías concretas.
 */
export function matchesSubcategory(
  tx: Transaction,
  subcategoryIds: readonly ID[] | undefined,
): boolean {
  if (!subcategoryIds || subcategoryIds.length === 0) return true;
  if (tx.subcategoryId === null) return false;
  return subcategoryIds.includes(tx.subcategoryId);
}

export interface DateCriteria {
  dateFrom?: ISODate | undefined;
  dateTo?: ISODate | undefined;
  month?: string | undefined;
  year?: string | undefined;
}

/**
 * Fechas.
 *
 * ⚠️ SE COMPARAN CADENAS, NO `Date`. `'2026-08-06'` es lexicográficamente
 * ordenable, así que `<` y `>` ya dan el orden cronológico correcto. Construir
 * un `Date` por movimiento sería más lento y, peor, reintroduciría la zona
 * horaria en un dato que es una fecha civil (ADR-006): en Colombia (UTC-5) un
 * gasto del día 6 se convertiría en uno del día 5.
 *
 * Los extremos van INCLUIDOS: quien pone "hasta el 31" espera ver el 31.
 */
export function matchesDate(tx: Transaction, criteria: DateCriteria): boolean {
  if (criteria.dateFrom && tx.date < criteria.dateFrom) return false;
  if (criteria.dateTo && tx.date > criteria.dateTo) return false;
  if (criteria.month && !tx.date.startsWith(criteria.month)) return false;
  if (criteria.year && !tx.date.startsWith(criteria.year)) return false;
  return true;
}

/**
 * Importe. Se compara el valor ABSOLUTO guardado: `amount` es siempre positivo
 * y el signo lo pone `type`. Filtrar "más de 50.000" debe encontrar tanto un
 * gasto de 60.000 como un ingreso de 60.000.
 */
export function matchesAmount(
  tx: Transaction,
  min: number | undefined,
  max: number | undefined,
): boolean {
  if (min !== undefined && tx.amount < min) return false;
  if (max !== undefined && tx.amount > max) return false;
  return true;
}
