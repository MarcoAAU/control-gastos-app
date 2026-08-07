import { useId } from 'react';
import { CURRENCY_SYMBOL } from '@/constants';
import { formatAmountInput } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './Field.module.css';

export interface AmountFieldProps {
  label: string;
  /** Texto ya formateado (`"1.250.000"`). El estado lo lleva el formulario. */
  value: string;
  onChange(value: string): void;
  error?: string;
  help?: string;
  allowNegative?: boolean;
  /** Colorea la cifra: verde ingreso, rojo gasto. */
  tone?: 'income' | 'expense' | 'neutral';
  autoFocus?: boolean;
  className?: string | undefined;
}

/**
 * Campo de importe con separadores de miles EN VIVO.
 *
 * ⚠️ ES `type="text"`, NO `type="number"`, y es deliberado: un input numérico
 * no puede mostrar "1.000.000" mientras se escribe — el navegador rechaza el
 * punto. Era una queja explícita del usuario en v1 (*"cuando estoy ingresando
 * los valores no puedo ver los separadores de millares"*) y así se resolvió
 * allí; se conserva la misma solución.
 *
 * `inputMode="numeric"` hace que en móvil salga el teclado numérico, que es lo
 * único que se pierde al no usar `type="number"`.
 */
export function AmountField({
  label,
  value,
  onChange,
  error,
  help,
  allowNegative = false,
  tone = 'neutral',
  autoFocus = false,
  className,
}: AmountFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>

      <div className={cn(styles.control, error && styles.controlInvalid)}>
        <span className={cn(styles.prefix, styles.amountPrefix)} aria-hidden="true">
          {CURRENCY_SYMBOL}
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          // El navegador propondría importes escritos en otros formularios.
          className={cn(
            styles.input,
            styles.amountInput,
            tone === 'income' && styles.amountIncome,
            tone === 'expense' && styles.amountExpense,
          )}
          placeholder="0"
          value={value}
          // Se reformatea en cada pulsación: así el usuario ve "1.250.000"
          // mientras teclea, no al terminar.
          onChange={(event) => onChange(formatAmountInput(event.target.value, allowNegative))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || help ? messageId : undefined}
          autoFocus={autoFocus}
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
