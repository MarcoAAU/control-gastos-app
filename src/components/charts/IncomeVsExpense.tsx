import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis } from 'recharts';
import type { MonthlyPoint } from '@/services/metrics/monthlySeries';
import { formatMoney } from '@/utils/money';
import { AXIS_TICK, CHART_COLORS, CHART_HEIGHT, CHART_MARGIN } from './chartTheme';
import styles from './IncomeVsExpense.module.css';

export interface IncomeVsExpenseProps {
  series: readonly MonthlyPoint[];
}

/**
 * Ingresos frente a gastos, mes a mes.
 *
 * ── LA GRÁFICA QUE RESPONDE A LA QUEJA ORIGINAL ───────────────────────────
 * El usuario decía que los gastos "se comían" los ingresos. Aquí las dos
 * magnitudes se dibujan **una al lado de la otra, nunca apiladas**: apilarlas
 * volvería a sugerir que una se resta de la otra dentro de la misma barra, que
 * es justo la confusión de v1. Dos barras separadas dicen lo único cierto —son
 * dos flujos independientes— y dejan ver de un vistazo en qué meses la roja
 * pasó a la verde.
 *
 * ── SIN EJE Y, CON LEYENDA DE CIFRAS ──────────────────────────────────────
 * Seis pares de barras en 350 px no dejan sitio para etiquetas de importe, y
 * un eje Y en pesos colombianos son números de siete dígitos que llenan un
 * tercio del ancho. La rejilla horizontal da la referencia visual y los totales
 * exactos van debajo, en HTML: texto real, seleccionable y legible por un
 * lector de pantalla, al contrario que el canvas de v1.
 */
export function IncomeVsExpense({ series }: IncomeVsExpenseProps) {
  const income = series.reduce((sum, point) => sum + point.income, 0);
  const expense = series.reduce((sum, point) => sum + point.expense, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT.bars}>
        <BarChart data={series as MonthlyPoint[]} margin={CHART_MARGIN} barGap={2}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} strokeDasharray="2 4" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Bar
            dataKey="income"
            fill={CHART_COLORS.income}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expense"
            fill={CHART_COLORS.expense}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>

      <ul className={styles.legend}>
        <li className={styles.item}>
          <span className={styles.dotIncome} aria-hidden="true" />
          Ingresos
          <span className={styles.value}>{formatMoney(income)}</span>
        </li>
        <li className={styles.item}>
          <span className={styles.dotExpense} aria-hidden="true" />
          Gastos
          <span className={styles.value}>{formatMoney(expense)}</span>
        </li>
      </ul>
    </div>
  );
}
