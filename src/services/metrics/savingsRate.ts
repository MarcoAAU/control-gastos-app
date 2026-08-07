import type { FlowTotals } from './periodTotals';

/**
 * Qué proporción de lo que entró NO se gastó, en porcentaje.
 *
 *     (ingresos − gastos) / ingresos × 100
 *
 * ── POR QUÉ DEVUELVE `null` Y NO 0 ────────────────────────────────────────
 * Sin ingresos en el periodo la división es por cero. Devolver 0 diría
 * "ahorraste el 0%", que es una afirmación falsa: no ahorraste nada porque no
 * entró nada, que no es lo mismo. Devolver `Infinity` o `NaN` acabaría pintado
 * en la tarjeta tal cual. `null` es "no se puede decir", y la interfaz lo
 * muestra como «—».
 *
 * Es el mismo criterio que la Fase 16 aplicará a todas las comparaciones entre
 * periodos: división por cero → «—», nunca un porcentaje inventado.
 *
 * ── PUEDE SER NEGATIVA, Y ESO ES INFORMACIÓN ──────────────────────────────
 * Un mes en el que se gasta más de lo que entra da un porcentaje negativo. No
 * se recorta a 0: "−45%" dice algo que "0%" oculta.
 */
export function savingsRate(totals: FlowTotals): number | null {
  if (totals.income <= 0) return null;
  return (totals.net / totals.income) * 100;
}
