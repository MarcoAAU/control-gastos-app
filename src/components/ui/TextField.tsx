import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import styles from './Field.module.css';

export interface TextFieldProps
  // Se excluye `prefix`: HTML ya define un atributo con ese nombre (una
  // URI de RDFa) tipado como string, y el nuestro es un nodo de React.
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'className' | 'value' | 'onChange' | 'prefix'
  > {
  label: string;
  value: string;
  onChange(value: string): void;
  /** Mensaje de error. Su presencia marca el campo como inválido. */
  error?: string;
  help?: string;
  required?: boolean;
  prefix?: ReactNode | undefined;
  suffix?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * Campo de texto.
 *
 * `onChange` entrega el VALOR, no el evento: las pantallas no deberían tener
 * que escribir `e.target.value` cincuenta veces, y así el componente puede
 * transformar la entrada (como hace `AmountField`) sin que nadie se entere.
 */
export function TextField({
  label,
  value,
  onChange,
  error,
  help,
  required = false,
  prefix,
  suffix,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={cn(styles.control, error && styles.controlInvalid)}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          id={inputId}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || help ? messageId : undefined}
          aria-required={required || undefined}
          {...rest}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
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
