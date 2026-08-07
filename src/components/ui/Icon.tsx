import { resolveIcon } from '@/constants/icons';
import { cn } from '@/utils/cn';
import styles from './Icon.module.css';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export interface IconProps {
  /** Clave del registro (`'cat-comida'`) o un emoji heredado de v1 (`'🍔'`). */
  name: string;
  size?: IconSize;
  /** Color explícito. Por defecto hereda `currentColor` del contenedor. */
  color?: string;
  /**
   * Texto alternativo. Si se omite, el icono se marca como decorativo
   * (`aria-hidden`) — que es lo correcto cuando va acompañado de una etiqueta
   * visible, el caso mayoritario.
   */
  label?: string;
  className?: string | undefined;
}

/**
 * Icono con doble resolución: SVG del registro, o texto literal si la clave no
 * existe. Ese fallback es lo que permite mostrar los emojis que el usuario ya
 * tiene guardados sin migrar ni un solo dato (ADR-011).
 */
export function Icon({ name, size = 'md', color, label, className }: IconProps) {
  const px = SIZE_PX[size];
  const Glyph = resolveIcon(name);
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true };

  if (Glyph) {
    return (
      <Glyph
        size={px}
        strokeWidth={2}
        className={cn(styles.root, className)}
        {...(color ? { color } : {})}
        {...a11y}
      />
    );
  }

  return (
    <span
      className={cn(styles.root, styles.emoji, className)}
      style={{ fontSize: px, width: px, height: px, ...(color ? { color } : {}) }}
      {...a11y}
    >
      {name}
    </span>
  );
}
