import type { Transaction } from '@/models';

/**
 * Ingresos y gastos agrupados por mes. Alimenta la gráfica comparada del
 * Inicio.
 *
 * ⚠️ FLUJO PURO: mira movimientos, nunca saldos. Los ajustes quedan fuera —
 * un ajuste al alza dibujaría una barra de "ingresos" del tamaño del descuadre
 * el mes en que se cuadró la cuenta, que es en pequeño el error de v1.
 *
 * ── UNA SOLA PASADA ───────────────────────────────────────────────────────
 * Recibe los meses ya construidos (`lastMonths`) y los indexa antes de
 * recorrer los movimientos: O(meses + movimientos). Lo natural —recorrer los
 * movimientos una vez por mes— sería seis recorridos completos del historial
 * en cada render del Inicio, que es exactamente lo que hacía v1 con su serie
 * diaria (`app.js:322`).
 *
 * ── POR QUÉ SE COMPARA POR PREFIJO ────────────────────────────────────────
 * `'2026-08-14'.slice(0, 7) === '2026-08'`. Sin construir ningún `Date`, y por
 * tanto sin ninguna conversión que pueda desplazar un movimiento al mes
 * anterior en una zona horaria negativa (ADR-006).
 */

export interface MonthlyPoint {
  /** `'2026-08'`. Sirve de clave y de orden: ordena igual como cadena. */
  month: string;
  /** Rótulo corto para el eje: `'ago'`. */
  label: string;
  income: number;
  expense: number;
}

const MONTH_LABELS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

/** `'2026-08'` → `'ago'`. Devuelve la clave entera si viene malformada. */
export function monthLabel(month: string): string {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTH_LABELS[index] ?? month;
}

export function monthlySeries(
  transactions: readonly Transaction[],
  months: readonly string[],
): MonthlyPoint[] {
  const index = new Map<string, MonthlyPoint>();
  const series = months.map((month) => {
    const point: MonthlyPoint = { month, label: monthLabel(month), income: 0, expense: 0 };
    index.set(month, point);
    return point;
  });

  for (const tx of transactions) {
    if (tx.isAdjustment) continue;
    const point = index.get(tx.date.slice(0, 7));
    if (!point) continue; // fuera de la ventana
    if (tx.type === 'income') point.income += tx.amount;
    else point.expense += tx.amount;
  }

  return series;
}
