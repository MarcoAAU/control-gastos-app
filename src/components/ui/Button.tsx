import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from '@/utils/cn';
import styles from './Button.module.css';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'dangerText';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Clave de icono a la izquierda del texto. */
  iconStart?: string;
  /** Clave de icono a la derecha del texto. */
  iconEnd?: string;
  /** Muestra un spinner y bloquea el botón sin que cambie de tamaño. */
  loading?: boolean;
  children: ReactNode;
}

/**
 * Botón base de la app. Ningún otro componente debe estilar un `<button>` a
 * mano: las seis variantes cubren todos los usos de v1 (primary-btn,
 * secondary-btn, link-btn, danger-btn, tx-action-btn).
 *
 * `type="button"` por defecto — es deliberado. El default del HTML es
 * "submit", que dentro de un <form> dispara envíos accidentales; ese fallo es
 * de los más difíciles de diagnosticar después.
 */
export function Button({
  variant = 'filled',
  size = 'md',
  fullWidth = false,
  iconStart,
  iconEnd,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'lg' ? 'lg' : 'sm';

  return (
    <button
      type={type}
      className={cn(
        styles.root,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={cn(styles.label, loading && styles.labelLoading)}>
        {iconStart && <Icon name={iconStart} size={iconSize} />}
        {children}
        {iconEnd && <Icon name={iconEnd} size={iconSize} />}
      </span>
    </button>
  );
}
