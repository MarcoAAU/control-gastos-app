import type { TransactionType } from '@/models';
import { Icon } from '@/components/ui';
import { cn } from '@/utils/cn';
import styles from './TypeToggle.module.css';

export interface TypeToggleProps {
  value: TransactionType;
  onChange(value: TransactionType): void;
}

/**
 * Selector ingreso / gasto. Porta `.type-toggle` de v1.
 *
 * Es `role="radiogroup"` y no dos botones sueltos: para un lector de pantalla
 * la diferencia es entre "dos botones" y "una elección entre dos opciones, la
 * primera seleccionada".
 */
export function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Tipo de movimiento">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'expense'}
        className={cn(styles.option, value === 'expense' && styles.optionActiveExpense)}
        onClick={() => onChange('expense')}
      >
        <Icon name="expense" size="sm" />
        Gasto
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'income'}
        className={cn(styles.option, value === 'income' && styles.optionActiveIncome)}
        onClick={() => onChange('income')}
      >
        <Icon name="income" size="sm" />
        Ingreso
      </button>
    </div>
  );
}
