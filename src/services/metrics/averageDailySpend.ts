import type { ISODate } from '@/models';
import { elapsedDaysInRange } from '@/services/periods/getPeriodRange';
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
 * Es el mismo criterio de truncado que usa la comparación entre periodos
 * ("vs. mismos días del mes pasado", ADR-031), y conviene que ambos digan lo
 * mismo — de hecho comparten la función que cuenta los días.
 *
 * Para un periodo YA CERRADO (julio visto en agosto) el divisor es el periodo
 * entero, porque ya transcurrió del todo.
 */

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
