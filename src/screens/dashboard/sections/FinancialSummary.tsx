import type { FlowTotals } from '@/services/metrics/periodTotals';
import { Card } from '@/components/ui';
import { StatTile } from '@/components/common/StatTile';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './FinancialSummary.module.css';

export interface FinancialSummaryProps {
  /** STOCK: suma de saldos derivados de las cuentas que cuentan para el total. */
  totalBalance: number;
  /** FLUJO: ingresos y gastos del periodo seleccionado. */
  totals: FlowTotals;
  /** El periodo dicho dentro de una frase: "hoy", "esta semana". */
  periodPhrase: string;
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  AQUÍ SE CORRIGE EL BUG ORIGINAL DE LA APLICACIÓN.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * En v1, el Inicio mostraba tres cifras: "Ingresos", "Egresos" y "Saldo". Pero
 * la tarjeta rotulada **Ingresos** calculaba en realidad
 * `state.accounts.reduce((s,a) => s + a.balance, 0)` (`app.js:221`) — la suma
 * de los SALDOS de las cuentas. Como cada gasto baja el saldo, cada gasto
 * bajaba "Ingresos", y de ahí la queja: *los gastos se comen los ingresos*.
 *
 * No eran dos cifras mal calculadas: eran **dos magnitudes distintas con un
 * solo rótulo**. Un saldo es un STOCK (cuánto hay ahora); un ingreso es un
 * FLUJO (cuánto entró durante un periodo). Ver ADR-003.
 *
 * Aquí se separan de forma explícita:
 *  · **Saldo total** — el stock, arriba y destacado. Sale de `services/balance`.
 *  · **Ingresos / Gastos / Balance** — el flujo del periodo. Sale de
 *    `services/metrics`, que por regla de ESLint no puede ni importar
 *    `services/balance`.
 *
 * ⚠️ CONSECUENCIA ESPERADA PARA EL USUARIO: la cifra que veía bajo "Ingresos"
 * cambiará al actualizar. Es una corrección, no una regresión (nota 1 del
 * checklist de regresión), y por eso el rótulo del saldo lleva debajo de dónde
 * sale el número.
 */
export function FinancialSummary({ totalBalance, totals, periodPhrase }: FinancialSummaryProps) {
  return (
    <>
      <Card className={styles.totalCard}>
        <span className={styles.totalLabel}>Saldo total</span>
        <span className={cn(styles.totalValue, totalBalance < 0 && styles.totalNegative)}>
          {formatMoney(totalBalance)}
        </span>
        <span className={styles.totalHint}>
          Lo que tienes ahora, sumando tus cuentas. No depende del periodo.
        </span>
      </Card>

      <div className={styles.grid}>
        <StatTile label="Ingresos" value={totals.income} icon="income" tone="income" />
        <StatTile label="Gastos" value={totals.expense} icon="expense" tone="expense" />
        <StatTile label="Balance" value={totals.net} signed />
      </div>

      <p className={styles.caption}>
        Ingresos, gastos y balance de <strong>{periodPhrase}</strong>. Los ajustes de
        saldo no se cuentan aquí.
      </p>
    </>
  );
}
