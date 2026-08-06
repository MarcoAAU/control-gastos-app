import { format, isThisYear, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ISODate, ISOTime, Transaction } from '@/models';

/**
 * Fechas como HORA DE PARED LOCAL, nunca como instante UTC (ADR-006).
 *
 * ⚠️ NUNCA usar `new Date().toISOString().slice(0,10)` para obtener "hoy".
 * Eso convierte a UTC, y en Colombia (UTC-5) un gasto de las 8 de la noche
 * acabaría contado en el día siguiente. v1 lo hacía así (`todayISO`), un fallo
 * silencioso que sólo se nota al revisar el resumen del día.
 */

/** Fecha civil de hoy, en la zona horaria del dispositivo. */
export function todayISO(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Hora actual `HH:mm` local. */
export function nowTime(): ISOTime {
  return format(new Date(), 'HH:mm');
}

/**
 * Convierte `'2026-08-05'` en un `Date` LOCAL.
 *
 * `new Date('2026-08-05')` lo interpreta como medianoche UTC, que en Colombia
 * es el día 4 a las 19:00 — y entonces "hoy" se muestra como "ayer".
 * `parseISO` de date-fns sí lo interpreta como local.
 */
export function parseISODate(date: ISODate): Date {
  return parseISO(date);
}

/**
 * Etiqueta legible para una cabecera de grupo: "Hoy", "Ayer",
 * "martes, 5 de agosto" o, si es de otro año, con el año incluido.
 */
export function formatDateLabel(date: ISODate): string {
  const parsed = parseISODate(date);
  if (isToday(parsed)) return 'Hoy';
  if (isYesterday(parsed)) return 'Ayer';
  if (isThisYear(parsed)) return format(parsed, "EEEE, d 'de' MMMM", { locale: es });
  return format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Fecha corta para líneas de detalle: "5 ago 2026". */
export function formatDateShort(date: ISODate): string {
  return format(parseISODate(date), 'd MMM yyyy', { locale: es });
}

/** "5 ago 2026 · 14:30". Omite la hora si es `'00:00'` (movimientos migrados). */
export function formatDateTime(date: ISODate, time: ISOTime): string {
  const base = formatDateShort(date);
  return time && time !== '00:00' ? `${base} · ${time}` : base;
}

/**
 * Clave de ordenación de un movimiento: fecha + hora + creación.
 *
 * El desempate por `createdAt` es necesario, no decorativo: todos los
 * movimientos migrados de v1 tienen la hora en `'00:00'`, así que sin él los
 * de un mismo día se ordenarían de forma inestable y "saltarían" entre
 * renders.
 */
export function txSortKey(tx: Transaction): string {
  return `${tx.date}T${tx.time}#${tx.createdAt}`;
}

/** Más reciente primero. */
export function compareTxDesc(a: Transaction, b: Transaction): number {
  const ka = txSortKey(a);
  const kb = txSortKey(b);
  return ka === kb ? 0 : ka < kb ? 1 : -1;
}
