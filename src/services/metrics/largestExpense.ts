import type { Transaction } from '@/models';
import type { DateRange } from './periodTotals';

/**
 * El gasto más grande del periodo, como movimiento completo.
 *
 * Devuelve el movimiento y no sólo su importe: la tarjeta necesita también su
 * descripción, y volver a buscarlo desde la pantalla sería recorrer la lista
 * dos veces para responder a la misma pregunta.
 *
 * ── AJUSTES FUERA, COMO SIEMPRE ───────────────────────────────────────────
 * Un ajuste de saldo a la baja está guardado como un gasto (`type: 'expense'`)
 * porque así es como resta del saldo. Si contara aquí, cuadrar una cuenta
 * descuadrada por 800.000 pondría "Mayor gasto: Ajuste de saldo" en el Inicio,
 * y el usuario leería que su mayor gasto del mes fue una operación contable que
 * no compró nada. Ver ADR-004.
 *
 * ── EMPATES ───────────────────────────────────────────────────────────────
 * Gana el primero que se encuentra. Como la lista llega ordenada de más
 * reciente a más antiguo, ante dos gastos idénticos se muestra el más nuevo,
 * que es el que el usuario recuerda. Lo importante es que sea DETERMINISTA:
 * una tarjeta que alterna entre dos movimientos empatados al re-renderizar
 * parece un fallo.
 */
export function largestExpense(
  transactions: readonly Transaction[],
  range?: DateRange,
): Transaction | null {
  let best: Transaction | null = null;

  for (const tx of transactions) {
    if (tx.isAdjustment) continue;
    if (tx.type !== 'expense') continue;
    if (range && (tx.date < range.from || tx.date > range.to)) continue;
    if (best === null || tx.amount > best.amount) best = tx;
  }

  return best;
}
