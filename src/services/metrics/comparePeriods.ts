import type { Transaction } from '@/models';
import { periodTotals, type DateRange, type FlowTotals } from './periodTotals';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Comparación de dos periodos. FLUJO puro: ni un saldo entra aquí.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los rangos los prepara `services/periods/getPreviousPeriodRange`, que se
 * encarga de recortar el anterior al mismo tramo transcurrido (ADR-031). Este
 * módulo sólo resta y divide — pero las dos cosas tienen trampa.
 *
 * ── LA DIVISIÓN POR CERO NO SE MAQUILLA ───────────────────────────────────
 * Si el periodo anterior fue 0, el porcentaje de variación no existe. Las
 * salidas tentadoras son todas mentira:
 *   · `Infinity`  → se pinta tal cual en la tarjeta.
 *   · `100%`      → afirma que se duplicó algo que no había.
 *   · `0%`        → afirma que no cambió nada, cuando cambió todo.
 * Se devuelve `null`, la interfaz lo pinta «—», y el importe absoluto sigue
 * estando: "sin datos del mes pasado, +$340.000" informa; "+∞%" no.
 *
 * ── SUBIR NO ES BUENO NI MALO: DEPENDE DE QUÉ SUBE ────────────────────────
 * Que los gastos suban un 20% es una mala noticia; que los ingresos suban un
 * 20% es buena. Este módulo NO decide eso: devuelve la dirección desnuda
 * (`up`/`down`/`flat`) y es la insignia quien la colorea según la métrica.
 * Meter aquí el juicio obligaría a que "gasto" fuese un concepto conocido por
 * la aritmética, y bastaría reutilizar la función para otra cosa —una
 * comparación de ahorro, por ejemplo— para que los colores salieran al revés.
 */

export interface Change {
  /** `actual − anterior`. Siempre existe, aunque el porcentaje no. */
  absolute: number;
  /** Variación en %, o `null` si el periodo anterior fue cero. */
  percentage: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface PeriodComparison {
  current: FlowTotals;
  previous: FlowTotals;
  income: Change;
  expense: Change;
  net: Change;
}

export function computeChange(current: number, previous: number): Change {
  const absolute = current - previous;
  const direction = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat';

  // `previous === 0` incluye el caso de un periodo anterior sin movimientos,
  // que es lo normal en el primer mes de uso de la app.
  if (previous === 0) return { absolute, percentage: null, direction };

  // Valor absoluto en el denominador: con un `net` anterior negativo, dividir
  // por él invertiría el signo de la variación y un empeoramiento se
  // anunciaría como mejora.
  return { absolute, percentage: (absolute / Math.abs(previous)) * 100, direction };
}

export function comparePeriods(
  transactions: readonly Transaction[],
  current: DateRange,
  previous: DateRange,
): PeriodComparison {
  const currentTotals = periodTotals(transactions, current);
  const previousTotals = periodTotals(transactions, previous);

  return {
    current: currentTotals,
    previous: previousTotals,
    income: computeChange(currentTotals.income, previousTotals.income),
    expense: computeChange(currentTotals.expense, previousTotals.expense),
    net: computeChange(currentTotals.net, previousTotals.net),
  };
}
