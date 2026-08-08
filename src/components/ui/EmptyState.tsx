import type { ReactNode } from 'react';
import { EmptyIllustration, type IllustrationKey } from './EmptyIllustration';
import { Icon } from './Icon';
import { cn } from '@/utils/cn';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Clave del registro de iconos. Se ignora si hay `illustration`. */
  icon?: string;
  /**
   * Dibujo para los vacíos que ocupan la pantalla entera.
   *
   * Es un conjunto CERRADO (`IllustrationKey`) y no una ruta ni un `ReactNode`
   * a propósito: así no puede colarse una imagen con colores fijos que se vea
   * mal en tema claro, y las cuatro ilustraciones siguen pareciendo de la
   * misma mano.
   */
  illustration?: IllustrationKey;
  title: string;
  /** Qué puede hacer el usuario a continuación. Opcional pero recomendado. */
  description?: string;
  /** Normalmente un `<Button>`. */
  action?: ReactNode;
  /** Versión reducida para listas cortas dentro de una tarjeta. */
  compact?: boolean;
  className?: string | undefined;
}

/**
 * El patrón es siempre el mismo: dibujo (o icono) + qué pasa + qué hacer.
 *
 * `compact` ignora la ilustración aunque se pase. No es un descuido: un dibujo
 * de 96 px dentro de una tarjeta de resumen desplaza el contenido real y
 * convierte "sin gastos esta semana" —una nota al margen— en el elemento más
 * llamativo de la pantalla.
 */
export function EmptyState({
  icon = 'empty',
  illustration,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const showIllustration = illustration !== undefined && !compact;

  return (
    <div className={cn(styles.root, compact && styles.compact, className)} role="status">
      {showIllustration ? (
        <EmptyIllustration name={illustration} />
      ) : (
        <span className={styles.iconWrap}>
          <Icon name={icon} size={compact ? 'lg' : 'xl'} />
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
