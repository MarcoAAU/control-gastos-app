import type { ISODate } from '@/models';
import { todayISO } from '@/utils/date';
import type { DateRange } from './periodTotals';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Gasto medio diario del periodo.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── LA DECISIÓN QUE HACE QUE EL NÚMERO SIRVA: DÍAS TRANSCURRIDOS ──────────
 * Lo evidente sería `gasto / días del periodo`. Es lo que hace inútil el dato
 * en el único momento en que se mira: el mes EN CURSO. El 2 de agosto,
 * dividir entre 31 diría "gastas 6.000 al día" cuando llevas 186.000 gastados
 * en dos días. El número no está mal calculado — está respondiendo a una
 * pregunta que nadie hizo ("cuánto habré gastado al día si no gasto nada más
 * en todo el mes").
 *
 * Aquí se divide entre los días TRANSCURRIDOS: el mes en curso se compara
 * consigo mismo día a día, y sólo cuando el mes termina el divisor llega a 31.
 * Es el mismo criterio de truncado que usará la comparación entre periodos de
 * la Fase 16 ("vs. mismos días del mes pasado"), y conviene que ambos digan lo
 * mismo.
 *
 * Para un periodo YA CERRADO (julio visto en agosto) el divisor es el periodo
 * entero, porque ya transcurrió del todo.
 */

/** Días de un rango civil, ambos extremos incluidos. Nunca menos de 0. */
export function daysInRange(range: DateRange): number {
  // Se cuenta con aritmética de cadenas convertidas a UTC a mediodía para que
  // el cambio de horario de verano no reste ni sume un día. En Colombia no lo
  // hay, pero el dato viaja en las copias de seguridad y no debe depender de
  // dónde se abra el archivo.
  const from = Date.parse(`${range.from}T12:00:00Z`);
  const to = Date.parse(`${range.to}T12:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  const days = Math.round((to - from) / 86_400_000) + 1;
  return days > 0 ? days : 0;
}

/**
 * Días del rango que ya han ocurrido, contando hoy.
 *
 * · Periodo futuro entero → 0 (no ha empezado).
 * · Periodo en curso → del primer día hasta hoy.
 * · Periodo cerrado → el rango completo.
 */
export function elapsedDaysInRange(range: DateRange, reference: ISODate = todayISO()): number {
  if (reference < range.from) return 0;
  const end = reference < range.to ? reference : range.to;
  return daysInRange({ from: range.from, to: end });
}

/**
 * Gasto medio por día transcurrido.
 *
 * Devuelve `null` —y no 0— cuando no hay días que promediar. Cero significaría
 * "gastas 0 al día", que es una afirmación; `null` significa "todavía no se
 * puede decir", y la interfaz lo pinta como «—». Nunca `Infinity` ni `NaN`.
 */
export function averageDailySpend(
  expense: number,
  range: DateRange,
  reference: ISODate = todayISO(),
): number | null {
  const days = elapsedDaysInRange(range, reference);
  if (days <= 0) return null;
  return expense / days;
}
