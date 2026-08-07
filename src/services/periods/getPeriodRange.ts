import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { WEEK_STARTS_ON, type Period } from '@/constants';
import type { ISODate } from '@/models';
import type { DateRange } from '@/services/metrics/periodTotals';
import { parseISODate, todayISO } from '@/utils/date';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Rangos de fechas. Todo el bucketing de la app pasa por aquí.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ SE TRABAJA CON FECHAS CIVILES (`yyyy-MM-dd`), NO CON INSTANTES.
 * Nunca `toISOString()`: convierte a UTC y en Colombia (UTC-5) un gasto de las
 * 8 de la noche caería en el día siguiente. Ver ADR-006. `date-fns` opera en
 * la zona del dispositivo, que es justo lo que queremos.
 *
 * La semana empieza en LUNES (`WEEK_STARTS_ON = 1`), convenio es-CO. v1 lo
 * tenía a mano y con domingo en algunos sitios.
 */

/** `Date` → `'2026-08-06'`. */
function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Rango del periodo que contiene a `reference`.
 *
 * ── UNA DIFERENCIA DELIBERADA CON v1 ──────────────────────────────────────
 * v1 construía el rango como `[inicio, ahora + 1 día)`, así que un movimiento
 * con fecha futura (un pago programado, una compra anotada por adelantado)
 * quedaba fuera de "Mes" hasta que llegara el día. Aquí el rango es el periodo
 * CIVIL COMPLETO: si anotas un gasto para el día 28 y hoy es 6, ese gasto ya
 * cuenta en el total del mes. Es lo que espera cualquiera que anote un gasto
 * futuro a propósito, y es lo que hace que Seguimiento (Fase 16) pueda
 * comparar periodos completos entre sí.
 *
 * Sólo se nota si hay movimientos con fecha futura. Para `'day'` no hay
 * diferencia alguna.
 */
export function getPeriodRange(period: Period, reference: ISODate = todayISO()): DateRange {
  const date = parseISODate(reference);

  switch (period) {
    case 'day':
      return { from: reference, to: reference };
    case 'week':
      return {
        from: toISO(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
        to: toISO(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
      };
    case 'month':
      return { from: toISO(startOfMonth(date)), to: toISO(endOfMonth(date)) };
    case 'year':
      return { from: toISO(startOfYear(date)), to: toISO(endOfYear(date)) };
  }
}

/**
 * Los últimos `days` días terminando hoy, ambos incluidos.
 *
 * Es lo que necesita la gráfica de tendencia del Inicio (14 días en v1). No es
 * un periodo civil: es una ventana móvil, y por eso vive aparte.
 */
export function getRollingRange(days: number, reference: ISODate = todayISO()): DateRange {
  const end = parseISODate(reference);
  return { from: toISO(subDays(end, Math.max(0, days - 1))), to: toISO(end) };
}

/**
 * Los últimos `count` meses terminando en el de `reference`, como `'yyyy-MM'`.
 *
 * Devuelve CLAVES DE MES y no rangos: la serie mensual del Inicio agrupa
 * comparando el prefijo de la fecha (`'2026-08-14'.startsWith('2026-08')`), que
 * es una comparación de cadenas en lugar de dos de fechas por movimiento.
 *
 * Como `eachDayInRange`, incluye los meses SIN movimientos: un mes que
 * desaparece de la serie comprime el eje y hace que medio año parezca un
 * trimestre.
 */
export function lastMonths(count: number, reference: ISODate = todayISO()): string[] {
  const end = startOfMonth(parseISODate(reference));
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(format(subMonths(end, i), 'yyyy-MM'));
  }
  return months;
}

/**
 * Todos los días del rango, en orden, como fechas civiles.
 *
 * Necesario para las gráficas: sin esto, un día sin movimientos simplemente no
 * existiría en la serie y la barra desaparecería en vez de dibujarse a cero,
 * comprimiendo el eje y haciendo que dos semanas parezcan cinco días.
 */
export function eachDayInRange(range: DateRange): ISODate[] {
  const days: ISODate[] = [];
  let cursor = parseISODate(range.from);
  const end = parseISODate(range.to);

  // Guarda de seguridad: un rango invertido o absurdo no debe colgar la app
  // construyendo un array infinito.
  let guard = 0;
  while (cursor <= end && guard < 4000) {
    days.push(toISO(cursor));
    cursor = addDays(cursor, 1);
    guard++;
  }
  return days;
}
