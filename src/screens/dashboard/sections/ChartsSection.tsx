import type { AccountDistribution as Distribution } from '@/services/balance/accountDistribution';
import type { BalancePoint } from '@/services/balance/buildBalanceTimeline';
import type { CategorySlice, DailyPoint } from '@/services/metrics/categoryBreakdown';
import type { MonthlyPoint } from '@/services/metrics/monthlySeries';
import { AccountDistribution } from '@/components/charts/AccountDistribution';
import { BalanceEvolution } from '@/components/charts/BalanceEvolution';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { ChartCard } from '@/components/charts/ChartCard';
import { IncomeVsExpense } from '@/components/charts/IncomeVsExpense';
import { TrendBars } from '@/components/charts/TrendBars';
import { formatMoney } from '@/utils/money';

export interface ChartsSectionProps {
  slices: readonly CategorySlice[];
  trend: readonly DailyPoint[];
  trendDays: number;
  expenseTotal: number;
  /** El periodo dicho dentro de una frase: "hoy", "esta semana". */
  periodPhrase: string;
  monthly: readonly MonthlyPoint[];
  monthlyCount: number;
  balanceSeries: readonly BalancePoint[];
  balanceDays: number;
  distribution: Distribution;
}

/**
 * ⚠️ ESTE ARCHIVO ES LA FRONTERA DE CARGA DE RECHARTS. No lo importes de
 * forma estática desde ninguna pantalla.
 *
 * Recharts pesa ~100 kB gz. Al principio los gráficos vivían directamente en
 * `DashboardScreen`, y como el Inicio es la pantalla de arranque, **todo el
 * mundo pagaba esos 100 kB antes de ver una sola cifra** — justo lo que la
 * carga diferida pretendía evitar (el chunk del Inicio medía 107 kB gz).
 *
 * Al aislarlos aquí y cargar este módulo con `lazy()`, el Inicio pinta
 * inmediatamente el saldo, los indicadores y los movimientos —que es lo que el
 * usuario viene a mirar— y las gráficas aparecen un instante después, sin
 * mover el contenido de sitio porque el hueco ya está reservado.
 *
 * No contiene lógica: recibe las series ya calculadas. Así el trabajo de
 * `services/metrics` no queda atrapado detrás de la descarga del chunk.
 *
 * ── EL ORDEN DE LAS CINCO GRÁFICAS NO ES CASUAL ───────────────────────────
 * Va de lo concreto a lo general: en qué se fue el dinero del periodo (dona),
 * cómo se repartió por días (barras), cómo va el año (meses), cómo evolucionó
 * el saldo, y dónde está ahora. Las dos últimas son STOCK y por eso van al
 * final, después de una separación clara de las de flujo — para que nadie lea
 * la línea del saldo como si fuera una gráfica de ingresos (ADR-003).
 */
export default function ChartsSection({
  slices,
  trend,
  trendDays,
  expenseTotal,
  periodPhrase,
  monthly,
  monthlyCount,
  balanceSeries,
  balanceDays,
  distribution,
}: ChartsSectionProps) {
  const trendTotal = trend.reduce((sum, point) => sum + point.expense, 0);
  const monthlyMoved = monthly.reduce((sum, point) => sum + point.income + point.expense, 0);
  const hasAccounts = distribution.entries.length > 0;

  return (
    <>
      <ChartCard
        title="Gastos por categoría"
        aside={formatMoney(expenseTotal)}
        emptyMessage={
          slices.length === 0 ? `Sin gastos ${periodPhrase}.` : undefined
        }
      >
        <CategoryDonut slices={slices} />
      </ChartCard>

      <ChartCard
        title={`Gasto de los últimos ${trendDays} días`}
        aside={formatMoney(trendTotal)}
        emptyMessage={trendTotal === 0 ? 'Sin gastos en las últimas dos semanas.' : undefined}
      >
        <TrendBars series={trend} />
      </ChartCard>

      <ChartCard
        title={`Ingresos y gastos · ${monthlyCount} meses`}
        emptyMessage={
          monthlyMoved === 0 ? 'Sin movimientos en los últimos meses.' : undefined
        }
      >
        <IncomeVsExpense series={monthly} />
      </ChartCard>

      <ChartCard
        title={`Evolución del saldo · ${balanceDays} días`}
        aside={
          balanceSeries.length > 0
            ? formatMoney(balanceSeries[balanceSeries.length - 1]?.balance ?? 0)
            : undefined
        }
        emptyMessage={balanceSeries.length === 0 ? 'Sin datos suficientes.' : undefined}
      >
        <BalanceEvolution series={balanceSeries} />
      </ChartCard>

      <ChartCard
        title="Dónde está tu dinero"
        emptyMessage={hasAccounts ? undefined : 'Todavía no hay cuentas que sumen al total.'}
      >
        <AccountDistribution distribution={distribution} />
      </ChartCard>
    </>
  );
}
