import type { Account, ID } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Dónde está el dinero: reparto del saldo entre cuentas.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── POR QUÉ ESTE ARCHIVO NO ESTÁ EN `services/metrics/` ───────────────────
 * El plan lo situaba ahí. Es un error del plan y aquí se corrige: esta función
 * lee SALDOS, o sea stock, y `services/metrics` tiene prohibido por regla de
 * ESLint importar `services/balance`. Colocarlo en metrics habría obligado a
 * pasarle los saldos ya calculados desde fuera —esquivando la regla sin
 * quebrantarla— y a dejar una función de "métricas" cuyo dato de entrada es
 * justo el que ese directorio no debe manejar. La regla existe para que este
 * tipo de confusión duela pronto (ADR-003); saltársela por comodidad la
 * anularía.
 *
 * ── EL PROBLEMA DE LOS SALDOS NEGATIVOS ───────────────────────────────────
 * Una tarjeta de crédito tiene saldo negativo. Un reparto porcentual sobre un
 * conjunto con negativos no significa nada: con +3.400.000 y −420.000, la
 * "parte del total" de la tarjeta sale negativa y las dos porciones suman más
 * del 100%. Una gráfica de tarta con eso es directamente falsa.
 *
 * Por eso: el porcentaje se calcula SÓLO sobre lo positivo, y las cuentas en
 * negativo se marcan (`isDebt`) con `share: 0`. La gráfica las dibuja aparte,
 * en rojo y hacia el otro lado — se ven, se leen, pero no fingen ser una
 * fracción de un dinero que no existe.
 */

export interface AccountShare {
  accountId: ID;
  name: string;
  color: string;
  icon: string;
  balance: number;
  /** Fracción del dinero DISPONIBLE, 0-100. Siempre 0 si el saldo no es positivo. */
  share: number;
  /** Saldo negativo: es una deuda, no una parte del total. */
  isDebt: boolean;
}

export interface AccountDistribution {
  entries: AccountShare[];
  /** Suma de los saldos positivos. El denominador de `share`. */
  totalPositive: number;
  /** Suma de los negativos, en positivo. Lo que se debe. */
  totalDebt: number;
}

/**
 * Reparto de los saldos ya calculados.
 *
 * Recibe el mapa de `computeAllAccountBalances` en vez de recalcularlo: el
 * Inicio ya lo tiene para pintar la fila de cuentas, y volver a recorrer todos
 * los movimientos para el mismo número sería trabajo duplicado en cada render.
 *
 * Sólo entran las cuentas con `includeInTotals`: si una cuenta está excluida
 * del saldo total, verla repartiéndoselo sería contradictorio.
 */
export function accountDistribution(
  accounts: readonly Account[],
  balances: ReadonlyMap<ID, number>,
): AccountDistribution {
  let totalPositive = 0;
  let totalDebt = 0;

  const included = accounts.filter((account) => account.includeInTotals);

  for (const account of included) {
    const balance = balances.get(account.id) ?? 0;
    if (balance > 0) totalPositive += balance;
    else if (balance < 0) totalDebt += -balance;
  }

  const entries = included.map((account): AccountShare => {
    const balance = balances.get(account.id) ?? 0;
    return {
      accountId: account.id,
      name: account.name,
      color: account.color,
      icon: account.icon,
      balance,
      share: balance > 0 && totalPositive > 0 ? (balance / totalPositive) * 100 : 0,
      isDebt: balance < 0,
    };
  });

  // De mayor a menor saldo: arriba dónde hay más dinero, abajo las deudas.
  entries.sort((a, b) => b.balance - a.balance);

  return { entries, totalPositive, totalDebt };
}
