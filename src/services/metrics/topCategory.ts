import type { CategorySlice } from './categoryBreakdown';

/**
 * La categoría en la que más se gastó durante el periodo.
 *
 * ── POR QUÉ ES UNA FUNCIÓN Y NO `slices[0]` ESCRITO EN LA PANTALLA ────────
 * Porque `slices[0]` sólo es la categoría principal mientras
 * `categoryBreakdown` siga devolviendo el reparto ORDENADO de mayor a menor.
 * Ese orden es hoy un detalle interno de otra función; escrito a mano en una
 * pantalla, el día que alguien cambie el criterio de ordenación (por nombre,
 * por color, por lo que sea) la tarjeta empezaría a mostrar una categoría
 * cualquiera rotulada "en lo que más gastas" — sin error, sin aviso, y con una
 * cifra que parece correcta porque lo es: sólo que de otra categoría.
 *
 * Al pasar por aquí, esa dependencia queda escrita, con un test que la fija.
 */
export function topCategory(slices: readonly CategorySlice[]): CategorySlice | null {
  let best: CategorySlice | null = null;
  for (const slice of slices) {
    if (best === null || slice.total > best.total) best = slice;
  }
  return best;
}
