import { useMemo } from 'react';
import type { Account, Category, ID, Transaction } from '@/models';
import { formatDateLabel } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { TransactionItem } from './TransactionItem';
import styles from './TransactionItem.module.css';

export interface TransactionListProps {
  transactions: readonly Transaction[];
  categoryById: Map<ID, Category>;
  accountById: Map<ID, Account>;
  /** Agrupa por día con cabecera y neto diario. */
  grouped?: boolean;
  onPress?: (transaction: Transaction) => void;
}

interface DayGroup {
  date: string;
  items: Transaction[];
  net: number;
}

/**
 * Lista de movimientos, opcionalmente agrupada por día.
 *
 * El agrupado no es adorno: con una lista plana hay que leer la fecha de cada
 * fila para saber dónde acaba un día. La cabecera además muestra el NETO del
 * día, que responde de un vistazo a "¿cuánto llevo gastado hoy?".
 *
 * El neto excluye los ajustes de saldo, igual que el resto de la app
 * (invariante 42 del checklist de regresión).
 */
export function TransactionList({
  transactions,
  categoryById,
  accountById,
  grouped = true,
  onPress,
}: TransactionListProps) {
  const groups = useMemo<DayGroup[]>(() => {
    if (!grouped) return [];
    const byDate = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const bucket = byDate.get(tx.date);
      if (bucket) bucket.push(tx);
      else byDate.set(tx.date, [tx]);
    }
    return [...byDate.entries()].map(([date, items]) => ({
      date,
      items,
      net: items.reduce((sum, tx) => {
        if (tx.isAdjustment) return sum;
        return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
      }, 0),
    }));
  }, [transactions, grouped]);

  if (!grouped) {
    return (
      <div className={styles.list}>
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            category={categoryById.get(tx.categoryId)}
            account={accountById.get(tx.accountId)}
            {...(onPress ? { onPress } : {})}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.date} className={styles.dateGroup}>
          <header className={styles.dateHeader}>
            <span className={styles.dateLabel}>{formatDateLabel(group.date)}</span>
            <span className={styles.dateTotal}>
              {group.net >= 0 ? '+' : ''}
              {formatMoney(group.net)}
            </span>
          </header>
          <div className={styles.list}>
            {group.items.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={categoryById.get(tx.categoryId)}
                account={accountById.get(tx.accountId)}
                showDate={false}
                {...(onPress ? { onPress } : {})}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
