import { Chip } from '@/components/ui';
import type { ActiveFilterChip } from '@/services/filters/describeFilters';
import styles from './ActiveFilterChips.module.css';

export interface ActiveFilterChipsProps {
  chips: readonly ActiveFilterChip[];
  onRemove(chip: ActiveFilterChip): void;
  onClearAll(): void;
}

/**
 * Fila de criterios activos.
 *
 * El componente no decide NADA: recibe las fichas ya descritas por
 * `describeFilters` y sólo las pinta. Toda la lógica de qué se muestra y qué
 * quita cada X está en `services/filters`, donde se puede testear sin React.
 *
 * "Limpiar" aparece a partir de DOS criterios. Con uno solo, su propia X ya
 * hace lo mismo y un segundo control que hace lo mismo sólo añade ruido.
 */
export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={styles.row} role="group" aria-label="Filtros activos">
      {chips.map((chip) => (
        <Chip key={chip.id} label={chip.label} onRemove={() => onRemove(chip)} />
      ))}

      {chips.length > 1 && (
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          Limpiar
        </button>
      )}
    </div>
  );
}
