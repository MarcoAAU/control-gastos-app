import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts';
import { format } from 'date-fns';
import type { DailyPoint } from '@/services/metrics/categoryBreakdown';
import { parseISODate } from '@/utils/date';
import { AXIS_TICK, CHART_COLORS, CHART_HEIGHT, CHART_MARGIN } from './chartTheme';

export interface TrendBarsProps {
  series: readonly DailyPoint[];
  /** Resalta el último día (hoy) para dar referencia. */
  highlightLast?: boolean;
}

/**
 * Gasto diario de los últimos días. Porta la gráfica de tendencia de v1
 * (`renderTrendChart`, `app.js:400`), que dibujaba 14 barras en un canvas.
 *
 * ── DECISIONES DE LEGIBILIDAD EN MÓVIL ────────────────────────────────────
 * · Sin eje Y: catorce barras en 350px de ancho no dejan sitio para etiquetas
 *   de importe, y la gráfica sirve para ver la FORMA del gasto, no para leer
 *   cifras exactas. Para eso está la lista de movimientos.
 * · Sólo se rotula un día de cada tres en el eje X; con los catorce, las
 *   fechas se solapan y no se lee ninguna.
 * · Sin animación de entrada: la gráfica se recalcula al cambiar de pestaña
 *   y reanimar en cada cambio distrae más de lo que aporta.
 */
export function TrendBars({ series, highlightLast = true }: TrendBarsProps) {
  const lastIndex = series.length - 1;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.bars}>
      <BarChart data={series as DailyPoint[]} margin={CHART_MARGIN}>
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={2}
          tickFormatter={(value: string) => format(parseISODate(value), 'd')}
        />
        <Bar dataKey="expense" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {series.map((point, index) => (
            <Cell
              key={point.date}
              fill={CHART_COLORS.expense}
              // Los días anteriores se atenúan para que "hoy" se distinga sin
              // introducir un segundo color.
              fillOpacity={highlightLast && index === lastIndex ? 1 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
