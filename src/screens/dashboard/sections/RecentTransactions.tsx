import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import type { Account, Category, ID, Transaction } from '@/models';
import { Card, EmptyState, Icon } from '@/components/ui';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import styles from './RecentTransactions.module.css';

export interface RecentTransactionsProps {
  transactions: readonly Transaction[];
  categoryById: Map<ID, Category>;
  accountById: Map<ID, Account>;
  /** El periodo dicho dentro de una frase: "hoy", "esta semana". */
  periodPhrase: string;
}

/**
 * Últimos movimientos del periodo. Porta `renderRecentList` de v1, incluido su
 * tope de 6.
 *
 * Las filas son de sólo lectura a propósito: tocar una aquí no abre acciones
 * de editar/borrar. El Inicio es para mirar; para operar está Movimientos, a
 * un toque de distancia. Así no hay dos sitios distintos donde borrar un
 * movimiento con dos confirmaciones que mantener sincronizadas.
 */
export function RecentTransactions({
  transactions,
  categoryById,
  accountById,
  periodPhrase,
}: RecentTransactionsProps) {
  return (
    <section className={styles.section} aria-label="Movimientos recientes">
      <div className={styles.header}>
        <h2 className={styles.title}>Movimientos recientes</h2>
        <Link to={ROUTES.transactions} className={styles.link}>
          Ver todos
          <Icon name="chevron-right" size="sm" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="nav-transactions"
            title={`Sin movimientos ${periodPhrase}`}
            description="Registra un ingreso o un gasto con el botón + de la pantalla Movimientos."
          />
        </Card>
      ) : (
        <div className={styles.list}>
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              category={categoryById.get(transaction.categoryId)}
              account={accountById.get(transaction.accountId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
