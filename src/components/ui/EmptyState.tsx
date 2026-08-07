import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from '@/utils/cn';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Clave del registro de iconos. */
  icon?: string;
  title: string;
  /** Qué puede hacer el usuario a continuación. Opcional pero recomendado. */
  description?: string;
  /** Normalmente un `<Button>`. */
  action?: ReactNode;
  /** Versión reducida para listas cortas dentro de una tarjeta. */
  compact?: boolean;
  className?: string | undefined;
}

export function EmptyState({
  icon = 'empty',
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.root, compact && styles.compact, className)} role="status">
      <span className={styles.iconWrap}>
        <Icon name={icon} size={compact ? 'lg' : 'xl'} />
      </span>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
