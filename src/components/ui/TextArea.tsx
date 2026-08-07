import { useId } from 'react';
import { cn } from '@/utils/cn';
import styles from './Field.module.css';

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  error?: string;
  maxLength?: number;
  /** Filas visibles antes de hacer scroll. */
  rows?: number;
  className?: string | undefined;
}

/**
 * Texto de varias líneas. Existe para las observaciones de un movimiento.
 *
 * ── POR QUÉ UN COMPONENTE Y NO `<TextField multiline>` ────────────────────
 * `TextField` envuelve un `<input>`, y un `<input>` no puede tener saltos de
 * línea: no es un ajuste de estilo, es otro elemento. Añadirle una prop
 * `multiline` obligaría a bifurcar su render entero y a tipar props que sólo
 * valen para una de las dos ramas.
 *
 * Comparte `Field.module.css` con el resto de campos: la etiqueta, el borde de
 * error y el mensaje se ven idénticos sin duplicar una línea de CSS.
 */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  maxLength,
  rows = 3,
  className,
}: TextAreaProps) {
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>

      <div className={cn(styles.control, styles.controlMultiline, error && styles.controlInvalid)}>
        <textarea
          id={fieldId}
          className={cn(styles.input, styles.textarea)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || help ? messageId : undefined}
        />
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
