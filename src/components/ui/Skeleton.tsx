import { cn } from '@/utils/cn';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  /** Número de líneas (sólo tiene sentido con `variant="text"`). */
  count?: number;
  className?: string | undefined;
}

/**
 * Placeholder animado. Se marca `aria-hidden` a propósito: un lector de
 * pantalla no debe anunciar cajas vacías. El contenedor que carga es quien
 * expone `aria-busy`.
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
}: SkeletonProps) {
  const style = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  if (count === 1) {
    return (
      <span
        className={cn(styles.root, styles[variant], className)}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={cn(styles.group, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cn(styles.root, styles[variant])} style={style} />
      ))}
    </span>
  );
}
