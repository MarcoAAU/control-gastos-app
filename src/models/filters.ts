import type { ID, ISODate, TransactionType } from './common';

/**
 * Criterios de filtrado de movimientos.
 *
 * TODOS los campos son opcionales y se combinan con Y lógico: es el requisito
 * de "filtros combinables". Un campo ausente = sin restricción por ese eje.
 *
 * Las listas (`accountIds`, `categoryIds`…) usan O lógico entre sus elementos
 * — "cuenta A **o** cuenta B" — que es lo que espera cualquiera al marcar dos
 * casillas. Y lógico dentro de una lista no seleccionaría nunca nada.
 *
 * Este objeto es serializable a propósito: permite guardar filtros favoritos
 * o ponerlos en la URL más adelante sin rediseñar nada.
 */
export interface TransactionFilters {
  /** Texto libre. Busca en descripción, observaciones y nombre de categoría. */
  search?: string;

  dateFrom?: ISODate;
  dateTo?: ISODate;
  /** Atajo de mes completo, `'YYYY-MM'`. Excluyente con `dateFrom`/`dateTo`. */
  month?: string;
  /** Atajo de año completo, `'YYYY'`. */
  year?: string;

  accountIds?: ID[];
  bankIds?: ID[];
  categoryIds?: ID[];
  subcategoryIds?: ID[];

  types?: TransactionType[];

  amountMin?: number;
  amountMax?: number;

  /**
   * Incluir los movimientos de ajuste de saldo. Por defecto **false**: son
   * ruido contable para el usuario, que quiere ver sus gastos reales. Se
   * activa desde el detalle de la cuenta, donde sí importan.
   */
  includeAdjustments?: boolean;
}

export type SortField = 'date' | 'amount' | 'description';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

/** Filtro vacío: todo pasa (salvo los ajustes). */
export const EMPTY_FILTERS: TransactionFilters = {};

/** Orden por defecto: lo más reciente arriba, como en v1. */
export const DEFAULT_SORT: TransactionSort = { field: 'date', direction: 'desc' };
