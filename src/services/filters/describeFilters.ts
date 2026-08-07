import { LOCALE } from '@/constants';
import type {
  Account,
  Category,
  FilterPatch,
  ID,
  Subcategory,
  TransactionFilters,
} from '@/models';
import { formatDateShort } from '@/utils/date';
import { formatMoney } from '@/utils/money';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Traduce los criterios activos a etiquetas legibles… y a cómo quitarlos.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── EL PROBLEMA QUE RESUELVE ──────────────────────────────────────────────
 * Con filtros combinables aparece un fallo de usabilidad clásico: el usuario
 * pone cuatro criterios, la lista se queda vacía, y no recuerda cuáles puso.
 * La única salida que le queda es "Limpiar todo", así que pierde también los
 * tres filtros que sí quería. Las fichas de criterio activo lo arreglan:
 * cada una dice qué está aplicado y se quita sola, por separado.
 *
 * ── POR QUÉ ESTÁ EN `services/` Y NO EN EL COMPONENTE ─────────────────────
 * Es una transformación pura de datos a datos: entra un `TransactionFilters`,
 * sale una lista de fichas. Aquí se puede testear sin montar React, y el
 * componente que las pinta se queda sin ninguna decisión que tomar.
 *
 * ── UNA FICHA POR VALOR, NO POR EJE ───────────────────────────────────────
 * Tres cuentas marcadas producen tres fichas, no una que diga "3 cuentas".
 * Quitar una sola cuenta de la selección es una acción normal; obligar a
 * abrir la hoja de filtros para desmarcar una casilla no lo es. (La insignia
 * del botón sí cuenta ejes: ver `countActiveFilters`.)
 */

export interface ActiveFilterChip {
  /** Estable entre renders: sirve de `key` en React. */
  id: string;
  label: string;
  /** Parche que quita ESTE criterio y deja intactos los demás. */
  patch: FilterPatch;
}

export interface DescribeContext {
  accountById?: Map<ID, Account> | undefined;
  categoryById?: Map<ID, Category> | undefined;
  subcategoryById?: Map<ID, Subcategory> | undefined;
}

/**
 * Quita un valor de una lista; si queda vacía, borra el criterio entero.
 *
 * Devolver `[]` en vez de `undefined` sería un fallo sutil pero real: una
 * lista vacía no filtra nada (ver `predicates.ts`), así que el criterio
 * seguiría "puesto" en el objeto —contando en la insignia del botón— sin tener
 * ningún efecto. La insignia diría "1 filtro" con cero filtros aplicados.
 */
function withoutValue<T>(list: readonly T[], value: T): T[] | undefined {
  const next = list.filter((item) => item !== value);
  return next.length === 0 ? undefined : next;
}

const TYPE_LABELS = { income: 'Ingresos', expense: 'Gastos' } as const;

export function describeFilters(
  filters: TransactionFilters,
  context: DescribeContext = {},
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const type of filters.types ?? []) {
    chips.push({
      id: `types:${type}`,
      label: TYPE_LABELS[type],
      patch: { types: withoutValue(filters.types ?? [], type) },
    });
  }

  for (const accountId of filters.accountIds ?? []) {
    chips.push({
      id: `accountIds:${accountId}`,
      // Si la cuenta ya no existe se muestra el rótulo genérico en vez de un
      // id crudo: el usuario no debe leer nunca una cadena interna.
      label: context.accountById?.get(accountId)?.name ?? 'Cuenta',
      patch: { accountIds: withoutValue(filters.accountIds ?? [], accountId) },
    });
  }

  for (const categoryId of filters.categoryIds ?? []) {
    chips.push({
      id: `categoryIds:${categoryId}`,
      label: context.categoryById?.get(categoryId)?.name ?? 'Categoría',
      patch: { categoryIds: withoutValue(filters.categoryIds ?? [], categoryId) },
    });
  }

  for (const subcategoryId of filters.subcategoryIds ?? []) {
    chips.push({
      id: `subcategoryIds:${subcategoryId}`,
      label: context.subcategoryById?.get(subcategoryId)?.name ?? 'Subcategoría',
      patch: { subcategoryIds: withoutValue(filters.subcategoryIds ?? [], subcategoryId) },
    });
  }

  // Las fechas se describen como UN criterio aunque ocupen dos campos: "desde
  // el 1 hasta el 15" es una sola idea en la cabeza del usuario, y dos fichas
  // permitirían quitar la mitad de un rango y quedarse con "hasta el 15",
  // que no es lo que nadie quiere al pulsar la X.
  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      id: 'dateRange',
      label: dateRangeLabel(filters.dateFrom, filters.dateTo),
      patch: { dateFrom: undefined, dateTo: undefined },
    });
  }

  if (filters.month) {
    chips.push({ id: 'month', label: monthLabel(filters.month), patch: { month: undefined } });
  }

  if (filters.year) {
    chips.push({ id: 'year', label: filters.year, patch: { year: undefined } });
  }

  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    chips.push({
      id: 'amountRange',
      label: amountRangeLabel(filters.amountMin, filters.amountMax),
      patch: { amountMin: undefined, amountMax: undefined },
    });
  }

  return chips;
}

function dateRangeLabel(from: string | undefined, to: string | undefined): string {
  if (from !== undefined && to !== undefined) {
    return `${formatDateShort(from)} – ${formatDateShort(to)}`;
  }
  if (from !== undefined) return `Desde ${formatDateShort(from)}`;
  if (to !== undefined) return `Hasta ${formatDateShort(to)}`;
  return 'Fechas';
}

function amountRangeLabel(min: number | undefined, max: number | undefined): string {
  if (min !== undefined && max !== undefined) {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }
  if (min !== undefined) return `Desde ${formatMoney(min)}`;
  if (max !== undefined) return `Hasta ${formatMoney(max)}`;
  return 'Importe';
}

/** `'2026-07'` → `'julio 2026'`. Un mes crudo en una ficha se lee como un
 *  código, no como una fecha. */
function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-');
  if (year === undefined || monthNumber === undefined) return month;
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}
