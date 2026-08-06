import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { cn } from '@/utils/cn';
import styles from './IconButton.module.css';

export type IconButtonVariant = 'standard' | 'tonal' | 'filled' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Clave del registro de iconos o emoji literal. */
  icon: string;
  /**
   * Obligatorio: un botón sin texto es invisible para un lector de pantalla.
   * Se exige por tipo, no por convención — así no se puede olvidar.
   */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export function IconButton({
  icon,
  label,
  variant = 'standard',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  const glyphSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.root, styles[variant], styles[size], className)}
      {...rest}
    >
      <Icon name={icon} size={glyphSize} className={styles.glyph} />
    </button>
  );
}
