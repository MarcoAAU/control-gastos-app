import type { CategorySlice } from '@/services/metrics/categoryBreakdown';
import { Card, EmptyState, Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import styles from './CategoryRanking.module.css';

export interface CategoryRankingProps {
  slices: readonly CategorySlice[];
  /** Gasto total del periodo. Denominador visible del ranking. */
  total: number;
  periodPhrase: string;
}

/**
 * En qué se fue el dinero, de mayor a menor, con barra proporcional.
 *
 * ── POR QUÉ AQUÍ NO HAY UNA DONA ──────────────────────────────────────────
 * El Inicio ya tiene una, y responde a la pregunta "¿cómo se reparte?". Ésta
 * responde a otra: "¿cuánto exactamente, y en qué orden?". Una lista ordenada
 * con la cifra al lado se lee de arriba abajo y permite comparar el tercero
 * con el cuarto — cosa que en una dona exige medir ángulos. Además no arrastra
 * la librería de gráficos, así que esta sección pinta con la pantalla en vez
 * de esperar al chunk diferido.
 *
 * Se muestran TODAS las categorías con gasto, sin recortar a las seis
 * primeras: aquí el usuario viene expresamente a revisar, y esconderle la cola
 * le obligaría a irse a Reportes para ver el resto.
 */
export function CategoryRanking({ slices, total, periodPhrase }: CategoryRankingProps) {
  if (slices.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon="nav-categories"
          title={`Sin gastos ${periodPhrase}`}
          description="Cuando registres gastos, aquí verás en qué se te va el dinero, ordenado de mayor a menor."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.header}>
        <h2 className={styles.title}>En qué se fue</h2>
        <span className={styles.total}>{formatMoney(total)}</span>
      </div>

      <ul className={styles.list}>
        {slices.map((slice) => (
          <li key={slice.categoryId} className={styles.row}>
            <div className={styles.head}>
              <Icon name={slice.icon} size="sm" color={slice.color} />
              <span className={styles.name}>{slice.name}</span>
              <span className={styles.amount}>{formatMoney(slice.total)}</span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.bar}
                // El color de la categoría es un dato del usuario, no un token.
                style={{ width: `${slice.percentage}%`, background: slice.color }}
              />
            </div>
            <span className={styles.share}>{Math.round(slice.percentage)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
