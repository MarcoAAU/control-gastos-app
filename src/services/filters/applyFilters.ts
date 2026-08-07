import { SYSTEM_CATEGORY_ADJUSTMENT } from '@/constants';
import type { Transaction, TransactionFilters } from '@/models';
import {
  matchesAccount,
  matchesAmount,
  matchesCategory,
  matchesDate,
  matchesSubcategory,
  matchesType,
} from './predicates';
import { matchesSearch, type SearchContext } from './searchTransactions';
import { tokenizeQuery } from '@/utils/text';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Composición de todos los criterios de filtrado.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Esta función NO decide nada por sí misma: encadena los predicados de
 * `predicates.ts` y la búsqueda de `searchTransactions.ts`. Las dos reglas que
 * gobiernan el conjunto:
 *
 * 1. Los criterios distintos se combinan con Y; los valores DENTRO de una
 *    lista, con O. "Cuenta A o cuenta B, y que sea un gasto" es lo que espera
 *    cualquiera al marcar dos casillas. Y lógico dentro de la lista no
 *    seleccionaría nunca nada.
 *
 * 2. Los ajustes de saldo se EXCLUYEN por defecto (ver abajo).
 */

/** Contexto para resolver nombres al buscar. Sin él la búsqueda sólo mira
 *  descripción y observaciones. */
export type FilterContext = SearchContext;

/**
 * ¿Deben verse los ajustes de saldo?
 *
 * Por defecto NO: son contabilidad interna (ADR-004). Si aparecieran mezclados
 * en la lista, el usuario vería "ingresos" que nunca ingresó — que es
 * exactamente la confusión que originó toda esta reescritura.
 *
 * PERO filtrar POR la categoría "Ajuste de saldo" sólo puede significar una
 * cosa: que el usuario quiere verlos. Sin esta regla ese filtro devolvería
 * siempre cero resultados, y los ajustes quedarían registrados e invisibles:
 * imposibles de revisar y, sobre todo, de BORRAR — que es lo que los hace
 * reversibles y lo que promete el aviso al crearlos.
 *
 * La regla vive aquí y no en la pantalla a propósito: en la Fase 8 estaba
 * escrita en `TransactionsScreen`, así que sólo valía allí. Cualquier otra
 * vista que filtrara por esa categoría habría mostrado una lista vacía.
 */
function resolveIncludeAdjustments(filters: TransactionFilters): boolean {
  if (filters.includeAdjustments !== undefined) return filters.includeAdjustments;
  return filters.categoryIds?.includes(SYSTEM_CATEGORY_ADJUSTMENT) ?? false;
}

export function applyFilters(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  context?: FilterContext,
): Transaction[] {
  // Se trocea la consulta UNA vez, fuera del bucle: normalizar y partir la
  // cadena por cada movimiento se nota en cuanto la lista crece, y es trabajo
  // idéntico repetido.
  const tokens = tokenizeQuery(filters.search ?? '');
  const includeAdjustments = resolveIncludeAdjustments(filters);

  return transactions.filter((tx) => {
    if (!includeAdjustments && tx.isAdjustment) return false;

    return (
      matchesType(tx, filters.types) &&
      matchesAccount(tx, filters.accountIds) &&
      matchesCategory(tx, filters.categoryIds) &&
      matchesSubcategory(tx, filters.subcategoryIds) &&
      matchesDate(tx, filters) &&
      matchesAmount(tx, filters.amountMin, filters.amountMax) &&
      matchesSearch(tx, tokens, context)
    );
  });
}

/**
 * Los ejes de filtrado, tal como los percibe quien usa la app.
 *
 * ⚠️ NO ES LA LISTA DE CLAVES DE `TransactionFilters`, y esa diferencia es
 * justo lo que arregla. Un rango de fechas ocupa DOS claves (`dateFrom` y
 * `dateTo`) pero es UN criterio: "el periodo". Contando claves, elegir "Mes"
 * ponía un 2 en la insignia mientras abajo aparecía una sola ficha
 * ("1 ago – 31 ago"). Dos números distintos describiendo lo mismo, en la misma
 * pantalla, y ninguno de los dos claramente equivocado a ojos del usuario: la
 * clase de detalle que hace desconfiar de toda la app.
 *
 * Mismo caso con el importe mínimo y el máximo. `month`/`year` van con las
 * fechas porque responden a la misma pregunta —cuándo— y la hoja los limpia al
 * aplicar un rango.
 */
const FILTER_AXES: readonly (readonly (keyof TransactionFilters)[])[] = [
  ['types'],
  ['accountIds'],
  ['bankIds'],
  ['categoryIds'],
  ['subcategoryIds'],
  ['dateFrom', 'dateTo', 'month', 'year'],
  ['amountMin', 'amountMax'],
];

function isSet(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  // Una lista vacía no filtra nada: contarla dejaría la insignia marcando un
  // criterio que el usuario no encuentra por ninguna parte.
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Criterios activos, uno por eje. Es el número de la insignia del botón.
 *
 * Cuenta EJES, no valores: marcar tres cuentas es *un* filtro puesto ("por
 * cuenta"), no tres. Un "3" tras tocar un solo control desconcierta.
 *
 * NO cuenta la búsqueda: el texto ya está a la vista en su propio cuadro, y
 * sumarlo aquí haría que la insignia creciera al escribir sin que nada dentro
 * de la hoja de filtros hubiera cambiado.
 */
export function countActiveFilters(filters: TransactionFilters): number {
  return FILTER_AXES.filter((axis) => axis.some((key) => isSet(filters[key]))).length;
}

/**
 * ¿Hay algo recortando la lista?
 *
 * Responde a una pregunta DISTINTA de la anterior y por eso no se deriva de
 * ella: aquí la búsqueda sí cuenta. Sirve para decidir si ofrecer "quitar
 * filtros", y no ofrecerlo a quien sólo ha escrito en el buscador lo dejaría
 * sin salida ante una lista vacía.
 */
export function hasActiveFilters(filters: TransactionFilters): boolean {
  if (isSet(filters.search)) return true;
  return countActiveFilters(filters) > 0;
}
