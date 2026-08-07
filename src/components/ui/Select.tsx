import { useId } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import styles from './Field.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange(value: string): void;
  options: readonly SelectOption[];
  /** Opción vacía inicial ("Todas las categorías"). */
  placeholder?: string | undefined;
  error?: string;
  help?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string | undefined;
}

/**
 * Desplegable sobre un `<select>` NATIVO.
 *
 * Decisión consciente frente a un desplegable propio: el nativo abre la rueda
 * de iOS y el diálogo a pantalla completa de Android, que son cómodos con una
 * mano y accesibles de fábrica. Un componente a medida se vería más "de
 * diseño" y sería peor de usar justo donde más se usa. Lo único que se
 * personaliza es la flecha, para que se vea igual en los tres sistemas.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  help,
  required = false,
  disabled = false,
  className,
}: SelectProps) {
  const selectId = useId();
  const messageId = `${selectId}-message`;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={cn(styles.control, error && styles.controlInvalid)}>
        <select
          id={selectId}
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || help ? messageId : undefined}
          aria-required={required || undefined}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size="sm" className={styles.selectChevron} />
      </div>

      {error ? (
        <span id={messageId} className={styles.error} role="alert">
          {error}
        </span>
      ) : help ? (
        <span id={messageId} className={styles.help}>
          {help}
        </span>
      ) : null}
    </div>
  );
}
