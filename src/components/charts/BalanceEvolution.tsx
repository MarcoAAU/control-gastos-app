import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { BalancePoint } from '@/services/balance/buildBalanceTimeline';
import { parseISODate } from '@/utils/date';
import { AXIS_TICK, CHART_COLORS, CHART_HEIGHT, CHART_MARGIN } from './chartTheme';

export interface BalanceEvolutionProps {
  series: readonly BalancePoint[];
}

/**
 * Evolución del saldo total.
 *
 * ⚠️ ES STOCK, NO FLUJO. Cada punto es "cuánto había al cerrar ese día", no
 * "cuánto se movió". Por eso el rótulo de la tarjeta dice **Evolución del
 * saldo** y jamás "Ingresos": confundir ambas magnitudes bajo un solo rótulo
 * fue el bug de v1 (ADR-003). Una línea que sube no significa que se haya
 * ingresado dinero ese día — significa que había más al terminarlo.
 *
 * ── EL EJE Y NO EMPIEZA EN CERO, Y HAY QUE DECIRLO ────────────────────────
 * Con saldos de siete cifras y variaciones del 3%, un eje anclado en 0 dibuja
 * una línea perfectamente plana: la gráfica no informa de nada. Con
 * `domain={['dataMin', 'dataMax']}` la variación se ve, a cambio de exagerarla
 * visualmente. Se compensa mostrando los valores de los extremos en el eje —
 * quien mire las cifras verá que el rango es estrecho— y con la línea de cero
 * cuando el saldo llega a ser negativo, que es la única referencia absoluta que
 * importa de verdad.
 */
export function BalanceEvolution({ series }: BalanceEvolutionProps) {
  const values = series.map((point) => point.balance);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const showZeroLine = min < 0;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT.bars}>
      <AreaChart data={series as BalancePoint[]} margin={CHART_MARGIN}>
        <defs>
          {/* Degradado hacia transparente: el relleno da cuerpo a la línea sin
              tapar la rejilla. */}
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.income} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} strokeDasharray="2 4" />

        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          // Un rótulo de cada siete: con treinta días, todas las fechas se
          // solapan y no se lee ninguna.
          interval={6}
          // ⚠️ `locale: es` NO es opcional. Sin él, date-fns rotula en inglés y
          // el eje mezcla idiomas sin que salte ningún error: "9 jul" y "6 Aug"
          // en la misma fila, porque julio se escribe igual en los dos y agosto
          // no. Sólo se ve en agosto, marzo y agosto — es decir, casi nunca al
          // desarrollar, y siempre en producción.
          tickFormatter={(value: string) => format(parseISODate(value), 'd MMM', { locale: es })}
        />

        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={['dataMin', 'dataMax']}
          // Millones abreviados: "$3.4M" cabe donde "3.400.000" no.
          tickFormatter={(value: number) =>
            Math.abs(value) >= 1_000_000
              ? `${(value / 1_000_000).toFixed(1)}M`
              : `${Math.round(value / 1000)}k`
          }
        />

        {showZeroLine && <ReferenceLine y={0} stroke={CHART_COLORS.axis} strokeDasharray="4 4" />}

        <Area
          type="monotone"
          dataKey="balance"
          stroke={CHART_COLORS.income}
          strokeWidth={2}
          fill="url(#balanceFill)"
          isAnimationActive={false}
          // Sin puntos: con treinta días serían treinta círculos amontonados.
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
