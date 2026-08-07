import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { CategorySlice } from '@/services/metrics/categoryBreakdown';
import { Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import { CHART_COLORS, CHART_HEIGHT } from './chartTheme';
import styles from './CategoryDonut.module.css';

export interface CategoryDonutProps {
  slices: readonly CategorySlice[];
  /** Cuántas categorías listar en la leyenda. El resto se agrupa en "Otras". */
  maxLegendItems?: number;
}

/**
 * Dona de gasto por categoría, con leyenda de porcentajes. Porta la gráfica
 * del Inicio de v1 (`renderCategoryChart`, `app.js:342`).
 *
 * ── POR QUÉ SVG Y NO CANVAS (ADR-005) ─────────────────────────────────────
 * v1 la dibujaba a mano en un `<canvas>` y arrastró un bug real: el alto del
 * canvas se multiplicaba por el `devicePixelRatio` en cada redibujo
 * (180 → 540 → 1620 → …), así que las gráficas se deformaban al hacer scroll o
 * al cambiar de pestaña. Se corrigió cacheando el alto original en un WeakMap
 * (`app.js:334`), una solución frágil a un problema que con SVG no existe: el
 * navegador se encarga del escalado y no hay estado que recalcular.
 *
 * Es el ítem 40 del checklist de regresión, resuelto por construcción.
 */
export function CategoryDonut({ slices, maxLegendItems = 6 }: CategoryDonutProps) {
  const visible = slices.slice(0, maxLegendItems);
  const rest = slices.slice(maxLegendItems);
  const restTotal = rest.reduce((sum, slice) => sum + slice.total, 0);
  const restPercentage = rest.reduce((sum, slice) => sum + slice.percentage, 0);

  return (
    <div>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT.donut}>
          <PieChart>
            <Pie
              data={slices as CategorySlice[]}
              dataKey="total"
              nameKey="name"
              // El agujero es lo que la convierte en dona; sin él es un queso.
              innerRadius="55%"
              outerRadius="85%"
              // Empieza arriba y avanza en el sentido del reloj, como v1.
              startAngle={90}
              endAngle={-270}
              // Sin animación: en una lista que se refiltra al cambiar de
              // pestaña, la animación se reinicia constantemente y marea.
              isAnimationActive={false}
              stroke={CHART_COLORS.hole}
              strokeWidth={2}
            >
              {slices.map((slice) => (
                // El color es un DATO del usuario, no un token: va literal.
                <Cell key={slice.categoryId} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* La leyenda es HTML, no parte del SVG: así es texto real, seleccionable
          y legible por un lector de pantalla. La de v1 vivía dentro del canvas
          y no existía para nadie que no pudiera verla. */}
      <ul className={styles.legend}>
        {visible.map((slice) => (
          <li key={slice.categoryId} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: slice.color }} aria-hidden="true" />
            <Icon name={slice.icon} size="sm" className={styles.legendIcon} />
            <span className={styles.legendName}>{slice.name}</span>
            <span className={styles.legendValue}>
              {formatMoney(slice.total)} · {Math.round(slice.percentage)}%
            </span>
          </li>
        ))}

        {rest.length > 0 && (
          <li className={styles.legendItem}>
            <span className={styles.dotMuted} aria-hidden="true" />
            <span className={styles.legendName}>Otras {rest.length}</span>
            <span className={styles.legendValue}>
              {formatMoney(restTotal)} · {Math.round(restPercentage)}%
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
