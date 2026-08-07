import { ACCOUNT_TYPE_META } from '@/constants';
import type { Account, Bank } from '@/models';
import { Icon } from '@/components/ui';
import { formatDateShort } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountBalanceHeader.module.css';

export interface AccountBalanceHeaderProps {
  account: Account;
  bank: Bank | undefined;
  /** Saldo derivado del libro. */
  balance: number;
  /** Movimientos reales (sin ajustes) de esta cuenta. */
  income: number;
  expense: number;
  adjustments: number;
}

/**
 * Cabecera del detalle de una cuenta: el saldo y **de dónde sale**.
 *
 * ── POR QUÉ SE DESGLOSA LA CUENTA ─────────────────────────────────────────
 * El saldo es derivado, así que el usuario no puede editarlo directamente y
 * eso resulta desconcertante si no se explica. Mostrar la operación completa
 * —`inicial + ingresos − gastos ± ajustes = saldo`— convierte un número
 * opaco en algo comprobable con una calculadora, y responde por adelantado a
 * "¿por qué me sale esta cifra?".
 *
 * Los ajustes van en su propia línea, separados de ingresos y gastos: mover el
 * saldo es su función, pero no son dinero ganado ni gastado (ADR-004).
 */
export function AccountBalanceHeader({
  account,
  bank,
  balance,
  income,
  expense,
  adjustments,
}: AccountBalanceHeaderProps) {
  const meta = ACCOUNT_TYPE_META[account.type];
  const alarming = balance < 0 && !meta.negativeIsExpected;

  return (
    <div className={styles.header}>
      <div className={styles.identity}>
        <span
          className={styles.icon}
          style={{ background: `${account.color}22`, color: account.color }}
        >
          <Icon name={account.icon} size="lg" />
        </span>
        <div className={styles.identityText}>
          <span className={styles.name}>{account.name}</span>
          <span className={styles.meta}>
            {bank?.name ?? 'Sin banco'} · {meta.label}
          </span>
        </div>
      </div>

      <span className={cn(styles.balance, alarming && styles.balanceNegative)}>
        {formatMoney(balance)}
      </span>

      {!account.includeInTotals && (
        <span className={styles.excluded}>No suma al saldo total</span>
      )}

      <dl className={styles.breakdown}>
        <div className={styles.row}>
          <dt>
            Saldo inicial
            <span className={styles.rowHint}>
              desde {formatDateShort(account.initialBalanceDate)}
            </span>
          </dt>
          <dd>{formatMoney(account.initialBalance)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Ingresos</dt>
          <dd className={styles.income}>+{formatMoney(income)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Gastos</dt>
          <dd>−{formatMoney(expense)}</dd>
        </div>
        {adjustments !== 0 && (
          <div className={styles.row}>
            <dt>
              Ajustes
              <span className={styles.rowHint}>no cuentan como ingreso ni gasto</span>
            </dt>
            <dd>
              {adjustments > 0 ? '+' : '−'}
              {formatMoney(Math.abs(adjustments))}
            </dd>
          </div>
        )}
        <div className={cn(styles.row, styles.rowTotal)}>
          <dt>Saldo actual</dt>
          <dd>{formatMoney(balance)}</dd>
        </div>
      </dl>
    </div>
  );
}
