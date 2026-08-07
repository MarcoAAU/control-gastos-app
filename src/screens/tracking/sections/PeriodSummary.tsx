import type { PeriodComparison } from '@/services/metrics/comparePeriods';
import type { PeriodComparisonRanges } from '@/services/periods/getPreviousPeriodRange';
import { Card, Icon } from '@/components/ui';
import { ComparisonBadge } from '@/components/common/ComparisonBadge';
import { formatDateShort } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './PeriodSummary.module.css';

export interface PeriodSummaryProps {
  comparison: PeriodComparison;
  ranges: PeriodComparisonRanges;
  /** "vs. mismos días del mes pasado". Lo decide la pantalla. */
  comparisonLabel: string;
}

/**
 * Ingresos, gastos y balance del periodo, cada uno con su variación.
 *
 * ── SE DICE CONTRA QUÉ SE COMPARA, CON FECHAS ─────────────────────────────
 * Debajo va el rango exacto del tramo anterior ("1 – 7 de julio") y su
 * importe. Un "−23%" suelto obliga a fiarse; con el rango y la cifra al lado,
 * el usuario puede comprobarlo. Es la diferencia entre un dato y un veredicto.
 *
 * ── EL AVISO DE TRAMOS DESIGUALES ─────────────────────────────────────────
 * Sólo aparece cuando el periodo está EN CURSO y el anterior se quedó corto —
 * el 30 de marzo, con 30 días transcurridos contra los 28 de febrero. Un julio
 * ya cerrado contra un junio de 30 días también tiene duraciones distintas,
 * pero ésa es la comparación mensual de toda la vida y avisar cada mes de 31
 * días sería ruido que enseña a ignorar los avisos.
 */
export function PeriodSummary({ comparison, ranges, comparisonLabel }: PeriodSummaryProps) {
  const { current, previous, income, expense, net } = comparison;
  const avisoTramos = ranges.isPartial && !ranges.sameLength;

  return (
    <Card className={styles.card}>
      <ul className={styles.rows}>
        <li className={styles.row}>
          <span className={styles.label}>
            <Icon name="income" size="sm" className={styles.iconIncome} />
            Ingresos
          </span>
          <span className={cn(styles.value, styles.income)}>{formatMoney(current.income)}</span>
          <ComparisonBadge change={income} polarity="more-is-better" label={comparisonLabel} />
        </li>

        <li className={styles.row}>
          <span className={styles.label}>
            <Icon name="expense" size="sm" className={styles.iconExpense} />
            Gastos
          </span>
          <span className={cn(styles.value, styles.expense)}>{formatMoney(current.expense)}</span>
          {/* Gastar MENOS es la buena noticia: la flecha baja y el color es
              verde. Ver la nota de ComparisonBadge. */}
          <ComparisonBadge change={expense} polarity="less-is-better" label={comparisonLabel} />
        </li>

        <li className={cn(styles.row, styles.rowTotal)}>
          <span className={styles.label}>
            <Icon name="scale" size="sm" />
            Balance
          </span>
          <span className={cn(styles.value, current.net < 0 && styles.expense)}>
            {formatMoney(current.net)}
          </span>
          <ComparisonBadge change={net} polarity="more-is-better" label={comparisonLabel} />
        </li>
      </ul>

      <p className={styles.caption}>
        Comparado con <strong>{formatDateShort(ranges.previous.from)}</strong> –{' '}
        <strong>{formatDateShort(ranges.previous.to)}</strong>: {formatMoney(previous.income)} de
        ingresos y {formatMoney(previous.expense)} de gastos.
      </p>

      {avisoTramos && (
        <p className={styles.warning}>
          <Icon name="info" size="sm" />
          El tramo anterior sólo llega a {ranges.previousDays} días frente a los{' '}
          {ranges.elapsedDays} que llevas, porque el periodo pasado fue más corto. La comparación
          favorece al actual.
        </p>
      )}
    </Card>
  );
}
