import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import styles from './Chip.module.css';

export interface ChipProps {
  label: string;
  /** Estado marcado. Convierte la ficha en un interruptor. */
  selected?: boolean;
  onClick?(): void;
  /**
   * Si se pasa, la ficha muestra una X y **toda ella** quita el criterio.
   * Excluyente con `selected`: una ficha o se marca o se quita, no ambas.
   */
  onRemove?(): void;
  icon?: string | undefined;
  /** Color propio del dato (una categoría del usuario), no un token. */
  color?: string | undefined;
  className?: string | undefined;
}

/**
 * Ficha (chip) de filtro.
 *
 * ── POR QUÉ FICHAS Y NO UN `<select multiple>` ────────────────────────────
 * El desplegable múltiple nativo es inusable en móvil: exige pulsación
 * sostenida o Ctrl+clic para marcar varias opciones, no muestra lo elegido sin
 * desplegarlo, y en Android abre una lista que tapa la pantalla. Con fichas,
 * lo seleccionado está a la vista y marcar/desmarcar es una pulsación.
 *
 * ── ACCESIBILIDAD ─────────────────────────────────────────────────────────
 * `aria-pressed` en vez de `role="checkbox"`: es un botón que conmuta, y los
 * lectores de pantalla lo anuncian como "activado/desactivado" sin necesitar
 * un grupo con nombre. La X de quitar no es un botón dentro de otro botón
 * —anidar botones es HTML inválido y los lectores lo leen mal—: la ficha
 * entera es el botón y la X es decorativa, lo que además da un objetivo táctil
 * grande en vez de un icono de 12 px.
 */
export function Chip({
  label,
  selected = false,
  onClick,
  onRemove,
  icon,
  color,
  className,
}: ChipProps) {
  const removable = onRemove !== undefined;

  return (
    <button
      type="button"
      className={cn(
        styles.chip,
        selected && styles.chipSelected,
        removable && styles.chipRemovable,
        className,
      )}
      onClick={removable ? onRemove : onClick}
      aria-pressed={removable ? undefined : selected}
      aria-label={removable ? `Quitar filtro ${label}` : undefined}
      style={selected && color ? { borderColor: color, color, background: `${color}1f` } : undefined}
    >
      {selected && !removable && <Icon name="check" size="sm" className={styles.leading} />}
      {icon && !selected && <Icon name={icon} size="sm" className={styles.leading} />}
      <span className={styles.label}>{label}</span>
      {/* `Icon` ya se marca como decorativo si no se le da `label`. */}
      {removable && <Icon name="close" size="sm" className={styles.trailing} />}
    </button>
  );
}
