import type { Category } from '@/models';
import { Icon } from '@/components/ui';
import { cn } from '@/utils/cn';
import styles from './CategoryItem.module.css';

export interface CategoryItemProps {
  category: Category;
  /** Cuántos movimientos la usan. Decide el texto del borrado. */
  usageCount: number;
  /** Cuántas subcategorías activas tiene. */
  subcategoryCount: number;
  onPress: (category: Category) => void;
}

const KIND_LABEL: Record<Category['kind'], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  both: 'Ambos',
};

/**
 * Una fila de categoría.
 *
 * Muestra el número de movimientos que la usan porque es el dato que decide
 * si borrarla es inocuo o no. Sin él, el usuario archiva "Comida" creyendo que
 * está vacía y descubre después que ha reclasificado 200 gastos.
 */
export function CategoryItem({
  category,
  usageCount,
  subcategoryCount,
  onPress,
}: CategoryItemProps) {
  const meta = [
    KIND_LABEL[category.kind],
    `${usageCount} ${usageCount === 1 ? 'movimiento' : 'movimientos'}`,
    subcategoryCount > 0
      ? `${subcategoryCount} ${subcategoryCount === 1 ? 'subcategoría' : 'subcategorías'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={cn(styles.item, category.isSystem && styles.system)}
      onClick={() => onPress(category)}
      aria-label={`${category.name}, ${meta}`}
    >
      <span
        className={styles.icon}
        style={{ background: `${category.color}22`, color: category.color }}
      >
        <Icon name={category.icon} size="md" />
      </span>

      <span className={styles.info}>
        <span className={styles.name}>
          {category.name}
          {category.isSystem && <span className={styles.badge}>del sistema</span>}
        </span>
        <span className={styles.meta}>{meta}</span>
      </span>

      <Icon name="chevron-right" size="sm" className={styles.chevron} />
    </button>
  );
}
