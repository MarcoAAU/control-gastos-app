import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import styles from './Card.module.css';

export type CardVariant = 'filled' | 'outlined' | 'elevated';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

// Los nombres de clase de un CSS Module no coinciden con los valores de la
// prop (`sm` → `.padSm`), así que hace falta la tabla.
const PADDING_CLASS: Record<CardPadding, string | undefined> = {
  none: styles.padNone,
  sm: styles.padSm,
  md: styles.padMd,
  lg: styles.padLg,
};

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  /**
   * Convierte la tarjeta en un `<button>` real. Nunca usamos `<div onClick>`:
   * rompe el teclado y los lectores de pantalla, y era un problema real en v1
   * (las filas del historial eran divs pulsables).
   */
  onClick?: () => void;
  disabled?: boolean;
  className?: string | undefined;
  id?: string;
  'aria-label'?: string;
  children: ReactNode;
}

export function Card({
  variant = 'filled',
  padding = 'md',
  onClick,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
  children,
}: CardProps) {
  const classes = cn(styles.root, styles[variant], PADDING_CLASS[padding], className);

  if (onClick) {
    return (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        className={cn(classes, styles.interactive)}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }

  return (
    <div id={id} aria-label={ariaLabel} className={classes}>
      {children}
    </div>
  );
}
