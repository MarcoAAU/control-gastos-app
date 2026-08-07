import { Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: number;
  icon?: string;
  tone?: 'income' | 'expense' | 'neutral';
  /** Colorea el valor según su signo. Para el balance del periodo. */
  signed?: boolean;
}

/**
 * Una cifra con su rótulo. Porta `.stat-card` de v1.
 *
 * ⚠️ EL RÓTULO Y LA CIFRA TIENEN QUE MEDIR LO MISMO. Este componente es tonto
 * a propósito: recibe un número ya calculado y lo pinta. Quien lo usa es
 * responsable de que "Ingresos" reciba ingresos y no otra cosa — que es
 * exactamente lo que falló en v1, donde la tarjeta "Ingresos" recibía la suma
 * de saldos de las cuentas (`app.js:221`). Ver ADR-003.
 */
export function StatTile({ label, value, icon, tone = 'neutral', signed = false }: StatTileProps) {
  const negative = signed && value < 0;

  return (
    <div className={styles.tile}>
      <span className={styles.label}>
        {icon && <Icon name={icon} size="sm" />}
        {label}
      </span>
      <span
        className={cn(
          styles.value,
          tone === 'income' && styles.income,
          tone === 'expense' && styles.expense,
          signed && (negative ? styles.negative : styles.positive),
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
