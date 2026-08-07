import type { Change } from '@/services/metrics/comparePeriods';
import { Icon } from '@/components/ui';
import { cn } from '@/utils/cn';
import styles from './ComparisonBadge.module.css';

export interface ComparisonBadgeProps {
  change: Change;
  /**
   * Qué significa subir en ESTA métrica.
   *
   * · `'more-is-better'` — ingresos, balance, ahorro.
   * · `'less-is-better'` — gastos.
   * · `'neutral'` — número de movimientos: ni bueno ni malo.
   */
  polarity: 'more-is-better' | 'less-is-better' | 'neutral';
  /** Texto para lectores de pantalla: "vs. mismos días del mes pasado". */
  label: string;
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Variación respecto al periodo anterior.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── EL JUICIO VIVE AQUÍ, NO EN LA ARITMÉTICA ──────────────────────────────
 * `comparePeriods` devuelve la dirección desnuda (`up`/`down`/`flat`) sin
 * opinar. La opinión —verde o rojo— es de este componente, porque depende de
 * QUÉ sube: un +20% en ingresos es una buena noticia y un +20% en gastos es la
 * contraria. Si el color se decidiera en el servicio, la aritmética tendría
 * que saber qué es un "gasto", y bastaría reutilizarla para otra métrica para
 * que los colores salieran al revés sin que nada fallara.
 *
 * ── LA FLECHA APUNTA A LA REALIDAD, EL COLOR LA CALIFICA ──────────────────
 * Son dos informaciones distintas y se codifican por separado a propósito: la
 * flecha dice si el número subió o bajó, el color dice si eso conviene. Gastar
 * un 30% menos sale con flecha ABAJO y en VERDE. Fundirlos —flecha arriba
 * siempre que "va bien"— haría que el gesto contradijera la cifra que tiene al
 * lado.
 *
 * ── SIN DATO ANTERIOR SE DICE, NO SE INVENTA ──────────────────────────────
 * Con `percentage: null` (el periodo anterior fue cero, lo normal el primer
 * mes de uso) se pinta «—» en gris. Nunca "+100%" ni "∞": ambos afirmarían
 * algo sobre una comparación que no existe.
 */
export function ComparisonBadge({ change, polarity, label }: ComparisonBadgeProps) {
  const { percentage, direction } = change;

  if (percentage === null) {
    return (
      <span className={cn(styles.badge, styles.unknown)} title={`Sin datos comparables. ${label}`}>
        — <span className={styles.srOnly}>Sin datos del periodo anterior</span>
      </span>
    );
  }

  const good =
    polarity === 'neutral' || direction === 'flat'
      ? null
      : polarity === 'more-is-better'
        ? direction === 'up'
        : direction === 'down';

  const rounded = Math.round(Math.abs(percentage));

  return (
    <span
      className={cn(
        styles.badge,
        good === true && styles.good,
        good === false && styles.bad,
        good === null && styles.neutral,
      )}
    >
      {direction !== 'flat' && (
        <Icon name={direction === 'up' ? 'up' : 'down'} size="sm" className={styles.arrow} />
      )}
      {/* El signo va en la flecha, no repetido en el número: "↑ 23%" se lee de
          un vistazo, "↑ +23%" hace leer dos veces lo mismo. */}
      {rounded}%<span className={styles.srOnly}> {label}</span>
    </span>
  );
}
