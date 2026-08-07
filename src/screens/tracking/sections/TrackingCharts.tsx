import type { DailyPoint } from '@/services/metrics/categoryBreakdown';
import type { MonthlyPoint } from '@/services/metrics/monthlySeries';
import { ChartCard } from '@/components/charts/ChartCard';
import { IncomeVsExpense } from '@/components/charts/IncomeVsExpense';
import { TrendBars } from '@/components/charts/TrendBars';

export interface TrackingChartsProps {
  /** Serie diaria (semana o mes). Vacía si el periodo es anual. */
  daily: readonly DailyPoint[];
  /** Serie mensual (año). Vacía si el periodo no es anual. */
  monthly: readonly MonthlyPoint[];
  title: string;
}

/**
 * ⚠️ FRONTERA DE CARGA DE RECHARTS, igual que `ChartsSection` en el Inicio.
 * No importar estáticamente desde `TrackingScreen`.
 *
 * Los números y el ranking de categorías pintan de inmediato; la gráfica llega
 * un instante después. En una pantalla que existe para consultar cifras, la
 * cifra no debe esperar a la librería que dibuja la barra.
 *
 * Reutiliza `TrendBars` e `IncomeVsExpense` tal cual. No hay componentes de
 * gráfica propios de Seguimiento a propósito: serían los mismos con otro
 * nombre, y dos copias de la misma barra acaban divergiendo en el color, el
 * radio o el formato del eje.
 */
export default function TrackingCharts({ daily, monthly, title }: TrackingChartsProps) {
  if (monthly.length > 0) {
    const movido = monthly.reduce((sum, p) => sum + p.income + p.expense, 0);
    return (
      <ChartCard
        title={title}
        emptyMessage={movido === 0 ? 'Sin movimientos en este año.' : undefined}
      >
        <IncomeVsExpense series={monthly} />
      </ChartCard>
    );
  }

  const gastado = daily.reduce((sum, p) => sum + p.expense, 0);
  return (
    <ChartCard
      title={title}
      emptyMessage={gastado === 0 ? 'Sin gastos en este periodo.' : undefined}
    >
      {/* Sin resaltar el último día: aquí el periodo puede ser un mes entero
          ya cerrado, donde "el último" no es hoy y destacarlo mentiría. */}
      <TrendBars series={daily} highlightLast={false} />
    </ChartCard>
  );
}
