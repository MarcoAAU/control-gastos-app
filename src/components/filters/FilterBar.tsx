import { Icon } from '@/components/ui';
import type { ActiveFilterChip } from '@/services/filters/describeFilters';
import { cn } from '@/utils/cn';
import { ActiveFilterChips } from './ActiveFilterChips';
import { SearchField } from './SearchField';
import styles from './FilterBar.module.css';

export interface FilterBarProps {
  search: string;
  onSearchChange(value: string): void;
  searchHint?: string | undefined;
  /** Ejes con criterio puesto. Va en la insignia del botón. */
  activeCount: number;
  chips: readonly ActiveFilterChip[];
  onOpenFilters(): void;
  onRemoveChip(chip: ActiveFilterChip): void;
  onClearAll(): void;
}

/**
 * Barra de búsqueda + acceso a los filtros + criterios activos.
 *
 * ── POR QUÉ EL BOTÓN LLEVA UNA INSIGNIA CON EL NÚMERO ─────────────────────
 * Los filtros viven dentro de una hoja, así que una vez cerrada no queda nada
 * en pantalla que diga que la lista está recortada. Ese es el fallo clásico de
 * los filtros en móvil: el usuario ve menos movimientos de los que tiene,
 * concluye que se borraron, y no tiene forma de saber por qué. La insignia y
 * las fichas de abajo son las dos señales que lo impiden — la insignia dice
 * *cuántos* criterios hay, las fichas dicen *cuáles*.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchHint,
  activeCount,
  chips,
  onOpenFilters,
  onRemoveChip,
  onClearAll,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <SearchField value={search} onChange={onSearchChange} resultHint={searchHint} />

        <button
          type="button"
          className={cn(styles.filterButton, activeCount > 0 && styles.filterButtonActive)}
          onClick={onOpenFilters}
          aria-label={
            activeCount === 0
              ? 'Abrir filtros'
              : `Abrir filtros, ${activeCount} ${activeCount === 1 ? 'filtro activo' : 'filtros activos'}`
          }
        >
          <Icon name="filter-advanced" size="md" />
          {activeCount > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <ActiveFilterChips chips={chips} onRemove={onRemoveChip} onClearAll={onClearAll} />
    </div>
  );
}
