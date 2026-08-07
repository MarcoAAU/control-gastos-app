import type { ISODate, Transaction } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  FLUJO — cuánto entró y cuánto salió durante un periodo.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NO CONFUNDIR CON `services/balance/`, que calcula STOCK (el saldo, una
 * foto puntual). Confundir ambas magnitudes fue la causa raíz del bug de v1:
 * la tarjeta rotulada "Ingresos" del Inicio mostraba en realidad la suma de
 * saldos (`app.js:221`), así que cada gasto la hacía bajar y parecía que los
 * gastos "se comían los ingresos" (ADR-003).
 *
 * Una regla de ESLint impide que este directorio importe de `services/balance`.
 * Si alguna vez necesitas un saldo aquí, la respuesta correcta casi siempre es
 * que estás calculando la métrica equivocada.
 *
 * ── QUÉ CUENTA Y QUÉ NO ───────────────────────────────────────────────────
 * Los AJUSTES (`isAdjustment: true`) quedan FUERA. Un ajuste mueve el saldo
 * para que el libro coincida con la realidad, pero no es dinero ganado ni
 * gastado: contarlo diría que ganaste tres millones el día que cuadraste tu
 * cuenta. Ver `services/balance/solveAdjustment.ts`.
 *
 * Este módulo nace en la Fase 8 porque sin él el invariante de los ajustes no
 * se podría probar, y probarlo tarde es probarlo cuando ya se rompió. La Fase 9
 * lo amplía con desglose por categoría y comparativas entre periodos.
 */

export interface FlowTotals {
  /** Suma de ingresos reales del periodo. Nunca incluye ajustes. */
  income: number;
  /** Suma de gastos reales del periodo, en positivo. Nunca incluye ajustes. */
  expense: number;
  /** `income − expense`. Puede ser negativo: es lo normal en un mal mes. */
  net: number;
  /** Movimientos contados (sin ajustes). Útil para "3 movimientos". */
  count: number;
}

/** Rango de fechas civiles, ambos extremos incluidos. */
export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/**
 * Comparación de fechas por cadena.
 *
 * `'2026-08-05' <= '2026-08-31'` es correcto porque el formato `yyyy-MM-dd`
 * ordena igual lexicográficamente que cronológicamente. Evita construir un
 * `Date` por movimiento —caro con años de historial— y de paso esquiva el
 * problema de zona horaria: no hay conversión que pueda desplazar un día
 * (ADR-006).
 */
function inRange(date: ISODate, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/**
 * Totales de flujo de un conjunto de movimientos.
 *
 * Sin `range`, cuenta todos los que reciba: quien llama ya habrá filtrado.
 */
export function periodTotals(
  transactions: readonly Transaction[],
  range?: DateRange,
): FlowTotals {
  let income = 0;
  let expense = 0;
  let count = 0;

  for (const tx of transactions) {
    // El orden importa poco, pero la razón de cada descarte no: primero se
    // excluye lo que NUNCA es flujo, luego lo que cae fuera del periodo.
    if (tx.isAdjustment) continue;
    if (range && !inRange(tx.date, range)) continue;

    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
    count++;
  }

  return { income, expense, net: income - expense, count };
}
