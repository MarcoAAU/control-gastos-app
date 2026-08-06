import type { Account, Category, Transaction } from '@/models';
import { Icon } from '@/components/ui';
import { formatDateTime } from '@/utils/date';
import { formatSignedMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './TransactionItem.module.css';

export interface TransactionItemProps {
  transaction: Transaction;
  category: Category | undefined;
  account: Account | undefined;
  /** Muestra la fecha en la línea de detalle (fuera de una lista agrupada). */
  showDate?: boolean;
  onPress?: (transaction: Transaction) => void;
}

/**
 * Una fila de movimiento. Porta `.tx-item` de v1.
 *
 * DIFERENCIA IMPORTANTE CON v1: allí cada fila llevaba dos botones visibles,
 * "Editar" y "Eliminar", en un texto de 11px. Aquí la fila entera es pulsable
 * y las acciones viven en una hoja. Motivo: dos objetivos de 11px separados
 * por 8px en una lista densa provocan pulsaciones equivocadas, y una de ellas
 * borra un movimiento sin vuelta atrás.
 *
 * La descripción se renderiza como texto de React, que escapa por defecto: el
 * self-XSS de v1 (§16 de la auditoría, `escapeHTML` aplicado de forma
 * inconsistente) desaparece por construcción.
 */
export function TransactionItem({
  transaction,
  category,
  account,
  showDate = true,
  onPress,
}: TransactionItemProps) {
  const color = category?.color ?? '#93a2c6';
  const isIncome = transaction.type === 'income';

  const meta = [
    category?.name ?? 'Sin categoría',
    account?.name ?? '—',
    showDate ? formatDateTime(transaction.date, transaction.time) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const content = (
    <>
      <span
        className={styles.icon}
        // El color de la categoría es un DATO del usuario, no un token del
        // tema: por eso va inline. El `22` final es alfa ~13% para el fondo.
        style={{ background: `${color}22`, color }}
      >
        <Icon name={category?.icon ?? 'cat-otros'} size="md" />
      </span>

      <span className={styles.info}>
        <span className={styles.description}>
          {transaction.description || (category?.name ?? 'Movimiento')}
        </span>
        <span className={styles.meta}>{meta}</span>
      </span>

      <span
        className={cn(styles.amount, isIncome ? styles.amountIncome : styles.amountExpense)}
      >
        {formatSignedMoney(transaction.amount, transaction.type)}
      </span>
    </>
  );

  const className = cn(
    styles.item,
    transaction.isAdjustment && styles.adjustment,
    onPress && styles.itemInteractive,
  );

  if (!onPress) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onPress(transaction)}
      aria-label={`${transaction.description || category?.name}, ${formatSignedMoney(
        transaction.amount,
        transaction.type,
      )}`}
    >
      {content}
    </button>
  );
}
