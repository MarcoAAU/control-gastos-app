import type { CategorySlice, DailyPoint } from '@/services/metrics/categoryBreakdown';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { ChartCard } from '@/components/charts/ChartCard';
import { TrendBars } from '@/components/charts/TrendBars';
import { formatMoney } from '@/utils/money';

export interface ChartsSectionProps {
  slices: readonly CategorySlice[];
  trend: readonly DailyPoint[];
  trendDays: number;
  expenseTotal: number;
  periodLabel: string;
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
 * inmediatamente el saldo, los totales y los movimientos —que es lo que el
 * usuario viene a mirar— y las gráficas aparecen un instante después, sin
 * mover el contenido de sitio porque el hueco ya está reservado.
 *
 * No contiene lógica: recibe las series ya calculadas. Así el trabajo de
 * `services/metrics` no queda atrapado detrás de la descarga del chunk.
 */
export default function ChartsSection({
  slices,
  trend,
  trendDays,
  expenseTotal,
  periodLabel,
}: ChartsSectionProps) {
  const trendTotal = trend.reduce((sum, point) => sum + point.expense, 0);

  return (
    <>
      <ChartCard
        title="Gastos por categoría"
        aside={formatMoney(expenseTotal)}
        emptyMessage={
          slices.length === 0 ? `Sin gastos en ${periodLabel.toLowerCase()}.` : undefined
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
    </>
  );
}
