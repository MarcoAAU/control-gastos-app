import type { Account, ID, Transaction } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  STOCK — el saldo de una cuenta en un instante.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NO CONFUNDIR CON `services/metrics/`, que calcula FLUJO (ingresos y
 * gastos de un periodo). Son magnitudes distintas y mezclarlas fue la causa
 * raíz del bug de v1: la tarjeta rotulada "Ingresos" en el Inicio mostraba en
 * realidad la suma de saldos (`app.js:221`), así que cada gasto la hacía bajar
 * y parecía que los gastos "se comían los ingresos". Ver ADR-003.
 *
 * Una regla de ESLint impide que `services/metrics/**` importe de este módulo.
 * No es burocracia: es la única forma de que la confusión no pueda volver.
 *
 * FÓRMULA
 *     saldo = initialBalance + Σ(ingresos) − Σ(gastos)
 *
 * Los ajustes (`isAdjustment: true`) SÍ cuentan aquí — su razón de ser es
 * mover el saldo — y quedan excluidos de las métricas de flujo.
 */

type BalanceInput = Pick<Account, 'id' | 'initialBalance'>;

/** Cuánto suma o resta un movimiento al saldo de su cuenta. */
function signedAmount(tx: Transaction): number {
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

/**
 * Saldo actual de UNA cuenta.
 *
 * O(n) sobre todos los movimientos. Para pintar una lista de cuentas usa
 * `computeAllAccountBalances`, que resuelve todas en una sola pasada.
 */
export function computeAccountBalance(
  account: BalanceInput,
  transactions: readonly Transaction[],
): number {
  let balance = account.initialBalance;
  for (const tx of transactions) {
    if (tx.accountId === account.id) balance += signedAmount(tx);
  }
  return balance;
}

/**
 * Saldos de TODAS las cuentas en una única pasada: O(cuentas + movimientos)
 * en lugar de O(cuentas × movimientos).
 *
 * No es optimización prematura: esto se recalcula en cada render del Inicio y
 * de Cuentas, y con varios años de movimientos la diferencia se nota en un
 * móvil modesto.
 */
export function computeAllAccountBalances(
  accounts: readonly BalanceInput[],
  transactions: readonly Transaction[],
): Map<ID, number> {
  const balances = new Map<ID, number>();
  for (const account of accounts) {
    balances.set(account.id, account.initialBalance);
  }
  for (const tx of transactions) {
    const current = balances.get(tx.accountId);
    // Un movimiento cuya cuenta no existe se ignora en el saldo (no hay dónde
    // sumarlo). La migración impide que eso ocurra reasignándolo a la cuenta
    // "Sin asignar", pero la función no puede darlo por hecho.
    if (current !== undefined) balances.set(tx.accountId, current + signedAmount(tx));
  }
  return balances;
}

/**
 * Saldo total: sólo cuentas con `includeInTotals`.
 *
 * Éste es el número que en el Inicio se rotula **"Saldo total"** — nunca
 * "Ingresos". Ver la nota 1 del checklist de regresión.
 */
export function computeTotalBalance(
  accounts: readonly (BalanceInput & { includeInTotals: boolean })[],
  transactions: readonly Transaction[],
): number {
  const balances = computeAllAccountBalances(accounts, transactions);
  let total = 0;
  for (const account of accounts) {
    if (account.includeInTotals) total += balances.get(account.id) ?? 0;
  }
  return total;
}
