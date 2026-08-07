import { useId } from 'react';
import { PALETTE } from '@/constants';
import { cn } from '@/utils/cn';
import styles from './ColorPicker.module.css';

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  /** Colores ofrecidos. Por defecto la paleta de la app. */
  colors?: readonly string[];
  className?: string | undefined;
}

/**
 * Elegir un color de una paleta cerrada.
 *
 * ── POR QUÉ UNA PALETA Y NO `<input type="color">` ────────────────────────
 * El selector nativo deja elegir los 16 millones de colores, incluidos los que
 * hacen ilegible el texto encima o desaparecen contra el fondo oscuro. Una
 * paleta de 16 colores comprobados garantiza que cualquier elección se vea
 * bien, y además hace que la app tenga aspecto coherente en vez de un arcoíris
 * accidental.
 *
 * Es un `radiogroup` real: se recorre con las flechas y un lector de pantalla
 * anuncia el color por su posición.
 */
export function ColorPicker({ label, value, onChange, colors = PALETTE, className }: ColorPickerProps) {
  const groupId = useId();

  return (
    <div className={cn(styles.field, className)}>
      <span className={styles.label} id={groupId}>
        {label}
      </span>

      <div className={styles.grid} role="radiogroup" aria-labelledby={groupId}>
        {colors.map((color, index) => {
          const active = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={active}
              // El color no tiene nombre legible; la posición sí sirve para
              // referirse a él sin verlo.
              aria-label={`Color ${index + 1}`}
              className={cn(styles.swatch, active && styles.swatchActive)}
              style={{ background: color }}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>
    </div>
  );
}
