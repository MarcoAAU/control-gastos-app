import { addDays, subDays, subMonths, subWeeks, subYears } from 'date-fns';
import { format } from 'date-fns';
import { type Period } from '@/constants';
import type { ISODate } from '@/models';
import type { DateRange } from '@/services/metrics/periodTotals';
import { parseISODate, todayISO } from '@/utils/date';
import { daysInRange, elapsedDaysInRange, getPeriodRange } from './getPeriodRange';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  El periodo anterior, TRUNCADO al mismo tramo que lleva el actual.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── EL PROBLEMA QUE RESUELVE, QUE ES DE HONESTIDAD ────────────────────────
 * El 7 de agosto llevas gastados 655.000. Julio entero fueron 1.545.000.
 * Comparar esas dos cifras da "−58%" y un cartel verde de enhorabuena — por
 * llevar siete días de mes. Al llegar el día 31 el mismo cartel se habrá dado
 * la vuelta sin que hayas cambiado un solo hábito.
 *
 * No es un error de cálculo: los dos números están bien. Es una comparación
 * entre cosas distintas, presentada como si fueran comparables. Y una app que
 * felicita al usuario por gastar poco a principios de mes, todos los meses, es
 * una app que enseña a ignorar sus propios avisos.
 *
 * La corrección: el periodo anterior se recorta al MISMO NÚMERO DE DÍAS que
 * lleva transcurridos el actual. El 7 de agosto se compara contra el 1–7 de
 * julio, y el rótulo lo dice: *"vs. mismos días del mes pasado"*.
 *
 * ── POR QUÉ SE CUENTAN DÍAS Y NO SE COPIA LA FECHA ────────────────────────
 * Truncar "hasta el mismo día del mes" se rompe solo: el 31 de marzo no existe
 * en febrero. Contando días transcurridos, el recorte se ajusta al final del
 * periodo anterior sin ningún caso especial — y de paso resuelve igual de bien
 * el año bisiesto y la semana que cruza el cambio de año.
 *
 * ⚠️ Cuando el periodo anterior es MÁS CORTO (marzo contra febrero) los dos
 * tramos no miden lo mismo. No se puede evitar —febrero no tiene 31 días— así
 * que en vez de disimularlo se expone: `sameLength` dice si la comparación es
 * de igual a igual, y la interfaz avisa cuando no lo es.
 */

export interface PeriodComparisonRanges {
  current: DateRange;
  previous: DateRange;
  /** Días ya transcurridos del periodo actual. Es el largo del recorte. */
  elapsedDays: number;
  /** Días que abarca el tramo anterior tras recortarlo. */
  previousDays: number;
  /**
   * El periodo actual sigue en marcha.
   *
   * Es lo que decide el RÓTULO: mientras corre, la comparación es contra "los
   * mismos días" del anterior; una vez cerrado, es simplemente "el mes
   * pasado". Sin esta distinción, un julio ya terminado seguiría rotulándose
   * "vs. mismos 31 días de junio", que suena a advertencia donde no la hay.
   */
  isPartial: boolean;
  /**
   * Los dos tramos miden exactamente lo mismo.
   *
   * ⚠️ NO ES LO MISMO QUE "la comparación es justa", y conviene no confundirlo
   * al leerlo. Un julio completo (31 días) contra un junio completo (30) da
   * `false` y es la comparación mensual de toda la vida: nadie espera otra
   * cosa y avisar cada mes de 31 días sería puro ruido.
   *
   * Donde sí importa es combinado con `isPartial`: el 30 de marzo, el tramo
   * transcurrido son 30 días y febrero sólo llega a 28. Ahí la comparación
   * está sesgada a favor del mes actual y hay que decirlo.
   */
  sameLength: boolean;
}

function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Un día del periodo anterior, para poder pedirle a `getPeriodRange` sus
 * límites sin reimplementar inicio/fin de semana, mes y año.
 */
function stepBack(period: Period, reference: ISODate): ISODate {
  const date = parseISODate(reference);
  switch (period) {
    case 'day':
      return toISO(subDays(date, 1));
    case 'week':
      return toISO(subWeeks(date, 1));
    case 'month':
      return toISO(subMonths(date, 1));
    case 'year':
      return toISO(subYears(date, 1));
  }
}

/**
 * Rango del periodo anterior a `reference`, recortado al tramo transcurrido.
 *
 * ⚠️ `stepBack` para 'month' usa `subMonths`, que ya resuelve el caso del
 * 31: `subMonths('2026-03-31')` da el 28 de febrero, no una fecha inválida.
 * Pero eso sólo sirve para CAER dentro del mes anterior; el recorte real lo
 * hace el conteo de días de abajo.
 */
export function getPreviousPeriodRange(
  period: Period,
  reference: ISODate = todayISO(),
): PeriodComparisonRanges {
  const current = getPeriodRange(period, reference);
  const previousFull = getPeriodRange(period, stepBack(period, reference));

  const elapsedDays = elapsedDaysInRange(current, reference);
  const previousFullDays = daysInRange(previousFull);
  const isPartial = elapsedDays > 0 && elapsedDays < daysInRange(current);

  // Un periodo que aún no ha empezado no tiene con qué compararse: se
  // devuelve el anterior completo y `elapsedDays: 0`, y quien llama decide.
  // Devolver un rango invertido aquí produciría totales de cero disfrazados
  // de dato real.
  if (elapsedDays <= 0) {
    return {
      current,
      previous: previousFull,
      elapsedDays: 0,
      previousDays: previousFullDays,
      isPartial: false,
      sameLength: false,
    };
  }

  // El recorte nunca puede pasarse del final del periodo anterior. Ese
  // `Math.min` es lo que resuelve marzo→febrero sin un caso especial.
  const cappedDays = Math.min(elapsedDays, previousFullDays);
  const previousEnd = toISO(addDays(parseISODate(previousFull.from), cappedDays - 1));

  return {
    current,
    previous: { from: previousFull.from, to: previousEnd },
    elapsedDays,
    previousDays: cappedDays,
    isPartial,
    sameLength: cappedDays === elapsedDays,
  };
}
