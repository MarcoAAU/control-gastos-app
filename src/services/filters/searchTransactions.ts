import type { Account, Category, ID, Subcategory, Transaction } from '@/models';
import { normalizeText, tokenizeQuery } from '@/utils/text';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Búsqueda de texto libre sobre los movimientos.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── DÓNDE BUSCA ───────────────────────────────────────────────────────────
 * Descripción, observaciones, y los NOMBRES de categoría, subcategoría y
 * cuenta. Buscar sólo en la descripción sería inútil en esta app: la mayoría
 * de movimientos se anotan sin descripción (el formulario la marca como
 * opcional a propósito), así que lo único que los identifica es su categoría.
 * Sin esto, buscar "comida" no encontraría ni un gasto de comida.
 *
 * ── DÓNDE NO BUSCA: EL IMPORTE ────────────────────────────────────────────
 * Es tentador y es un error. Los importes son cadenas de dígitos largas y
 * cualquier consulta corta coincidiría con casi todo: escribir "5" devolvería
 * los movimientos de 5.000, 50.000, 15.000, 250.000… es decir, prácticamente
 * la lista entera, justo cuando el usuario cree estar acotando. Para acotar
 * por importe está el filtro de rango, que sí dice lo que hace.
 *
 * ── COSTE ─────────────────────────────────────────────────────────────────
 * Se construye el "pajar" de cada movimiento en el momento de comparar, no un
 * índice persistente. Con las magnitudes reales de esta app (miles de
 * movimientos como mucho) es una pasada de milisegundos, y un índice habría
 * que invalidarlo en cada alta, edición y borrado — un caché mal invalidado
 * mostrando resultados obsoletos es peor problema que el que resolvería.
 * Si algún día se nota, el punto de ataque es memorizar por `tx.id`+`updatedAt`.
 */

export interface SearchContext {
  categoryById?: Map<ID, Category> | undefined;
  subcategoryById?: Map<ID, Subcategory> | undefined;
  accountById?: Map<ID, Account> | undefined;
}

/** Todo el texto por el que un movimiento puede encontrarse, ya normalizado. */
export function buildHaystack(tx: Transaction, context: SearchContext = {}): string {
  const parts = [
    tx.description,
    tx.notes,
    context.categoryById?.get(tx.categoryId)?.name ?? '',
    tx.subcategoryId === null ? '' : (context.subcategoryById?.get(tx.subcategoryId)?.name ?? ''),
    context.accountById?.get(tx.accountId)?.name ?? '',
  ];
  return normalizeText(parts.join(' '));
}

/**
 * ¿Coincide el movimiento con TODAS las palabras de la consulta?
 *
 * Recibe los tokens ya troceados, no la consulta cruda: tokenizar dentro
 * significaría repetir el mismo trabajo por cada uno de los movimientos de la
 * lista, que es exactamente el bucle que se quiere mantener barato.
 */
export function matchesSearch(
  tx: Transaction,
  tokens: readonly string[],
  context: SearchContext = {},
): boolean {
  if (tokens.length === 0) return true;
  const haystack = buildHaystack(tx, context);
  return tokens.every((token) => haystack.includes(token));
}

/** Atajo para buscar directamente sobre una lista. */
export function searchTransactions(
  transactions: readonly Transaction[],
  query: string,
  context: SearchContext = {},
): Transaction[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return transactions.slice();
  return transactions.filter((tx) => matchesSearch(tx, tokens, context));
}
