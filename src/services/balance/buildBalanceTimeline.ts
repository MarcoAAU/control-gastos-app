import type { Account, ISODate, Transaction } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Cómo ha evolucionado el saldo total, día a día.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Es STOCK: cada punto es "cuánto había al cerrar ese día", no "cuánto se
 * movió". La gráfica que alimenta se rotula **Evolución del saldo** y nunca
 * "Ingresos" — es la misma distinción cuya confusión causó el bug de v1
 * (ADR-003). Los ajustes SÍ cuentan aquí, porque su razón de ser es mover el
 * saldo.
 *
 * ── EL PUNTO CRÍTICO: SE CALCULA EN UNA PASADA, NO EN UNA POR DÍA ────────
 * Lo evidente sería, para cada día, sumar todos los movimientos anteriores.
 * Con 30 días y varios años de historial son 30 recorridos completos en cada
 * render, y el Inicio es la pantalla de arranque. Aquí se hace al revés:
 *
 *   1. Una sola pasada reparte cada movimiento en una de tres cajas —antes de
 *      la ventana (suma al saldo de apertura), dentro (suma a su día), o
 *      después (se descarta)—.
 *   2. Un recorrido por los días acumula esos deltas.
 *
 * Coste O(movimientos + días) en lugar de O(movimientos × días). Es la misma
 * corrección que ya se aplicó a `dailySeries` en la Fase 9.
 *
 * ── POR QUÉ HAY QUE MIRAR EL PASADO ──────────────────────────────────────
 * El primer punto de la gráfica no puede empezar en cero: el saldo del 1 de
 * agosto incluye todo lo ocurrido antes. Sin el saldo de apertura, la línea
 * arrancaría en 0 y subiría hasta el saldo real, dibujando una ganancia
 * espectacular que nunca existió.
 */

export interface BalancePoint {
  date: ISODate;
  /** Saldo total al cerrar ese día. */
  balance: number;
}

type TimelineAccount = Pick<Account, 'id' | 'initialBalance' | 'includeInTotals'>;

function signedAmount(tx: Transaction): number {
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

/**
 * Serie de saldo total para los días indicados (ya construidos con
 * `eachDayInRange`, para que ningún día se salte aunque no tenga movimientos).
 *
 * Sólo cuentan las cuentas con `includeInTotals`, igual que en
 * `computeTotalBalance`: si una cuenta no entra en el saldo total, tampoco
 * puede mover la línea que representa ese total.
 */
export function buildBalanceTimeline(
  accounts: readonly TimelineAccount[],
  transactions: readonly Transaction[],
  days: readonly ISODate[],
): BalancePoint[] {
  if (days.length === 0) return [];

  const first = days[0]!;
  const last = days[days.length - 1]!;

  const included = new Set<string>();
  let opening = 0;
  for (const account of accounts) {
    if (!account.includeInTotals) continue;
    included.add(account.id);
    opening += account.initialBalance;
  }

  const deltaByDay = new Map<string, number>();

  for (const tx of transactions) {
    if (!included.has(tx.accountId)) continue;
    const amount = signedAmount(tx);

    if (tx.date < first) {
      // Ya estaba en el saldo antes de que empiece la ventana.
      opening += amount;
    } else if (tx.date <= last) {
      deltaByDay.set(tx.date, (deltaByDay.get(tx.date) ?? 0) + amount);
    }
    // Posterior a la ventana: no se descarta por error. Un movimiento con
    // fecha futura (un pago programado) ya está en el saldo total de la
    // cabecera, pero no puede aparecer en la línea de días que aún no han
    // ocurrido. La discrepancia es correcta: son dos preguntas distintas.
  }

  let running = opening;
  return days.map((date) => {
    running += deltaByDay.get(date) ?? 0;
    return { date, balance: running };
  });
}
