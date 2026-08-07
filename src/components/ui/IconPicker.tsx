import { useId } from 'react';
import { PICKABLE_ICONS } from '@/constants';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import styles from './IconPicker.module.css';

export interface IconPickerProps {
  label: string;
  value: string;
  onChange: (icon: string) => void;
  /** Color con el que previsualizar el icono elegido. */
  accent?: string;
  className?: string | undefined;
}

/**
 * Elegir el icono de una categoría o una cuenta.
 *
 * ── EL CASO QUE NO SE PUEDE ROMPER: LOS EMOJIS HEREDADOS ──────────────────
 * Las categorías y cuentas migradas de v1 guardan un EMOJI en `icon`
 * (`'🏦'`, `'🍔'`), no una clave del registro. `<Icon>` los renderiza tal cual
 * gracias a su fallback a texto (ADR-011), así que siguen viéndose bien sin
 * migrar un solo dato.
 *
 * Aquí eso obliga a una decisión: si el valor actual es un emoji, se muestra
 * como una opción MÁS al principio de la lista y aparece seleccionada. Si no,
 * el usuario abriría el selector, no vería marcada ninguna opción, y al elegir
 * cualquiera perdería su emoji sin haber pedido cambiarlo.
 */
export function IconPicker({ label, value, onChange, accent, className }: IconPickerProps) {
  const groupId = useId();

  // Un valor que no está en la lista ofrecida es casi siempre un emoji de v1.
  // Se antepone para que el usuario lo vea, lo conserve o lo cambie a
  // propósito — nunca por accidente.
  const isLegacy = value !== '' && !PICKABLE_ICONS.includes(value as never);
  const options = isLegacy ? [value, ...PICKABLE_ICONS] : PICKABLE_ICONS;

  return (
    <div className={cn(styles.field, className)}>
      <span className={styles.label} id={groupId}>
        {label}
      </span>

      <div className={styles.grid} role="radiogroup" aria-labelledby={groupId}>
        {options.map((icon) => {
          const active = icon === value;
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={icon}
              className={cn(styles.option, active && styles.optionActive)}
              style={active && accent ? { color: accent, borderColor: accent } : undefined}
              onClick={() => onChange(icon)}
            >
              <Icon name={icon} size="md" />
            </button>
          );
        })}
      </div>

      {isLegacy && (
        <span className={styles.legacyHint}>
          El primero es el icono que ya tenías. Si eliges otro, lo reemplazas.
        </span>
      )}
    </div>
  );
}
