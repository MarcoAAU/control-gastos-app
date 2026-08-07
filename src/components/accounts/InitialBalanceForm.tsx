import { useState } from 'react';
import type { Account } from '@/models';
import { AmountField, Icon, TextField } from '@/components/ui';
import { formatMoney, parseAmountInput, toAmountInputValue } from '@/utils/money';
import styles from './InitialBalanceForm.module.css';

export interface InitialBalanceValues {
  initialBalance: number;
  initialBalanceDate: string;
}

export interface InitialBalanceFormProps {
  formId: string;
  account: Account;
  /** Saldo derivado actual, para poder anticipar el efecto del cambio. */
  currentBalance: number;
  onSubmit: (values: InitialBalanceValues) => void;
}

/**
 * Cambiar el SALDO INICIAL. La operación destructiva de esta pantalla.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  NO CONFUNDIR CON "AJUSTAR SALDO". SON COSAS DISTINTAS Y ES CRÍTICO.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * | | Ajustar saldo | Cambiar saldo inicial |
 * |---|---|---|
 * | Qué hace | Registra un movimiento fechado hoy | Reescribe el punto de partida |
 * | El pasado | Intacto | **Cambia retroactivamente** |
 * | Reversible | Sí: borras el movimiento | No: hay que volver a escribir el valor anterior |
 * | Deja rastro | Sí, en el historial | No |
 * | Informes anteriores | No cambian | **Cambian todos** |
 *
 * "Ajustar saldo" es lo que quiere el usuario el 95% de las veces: la cuenta
 * no cuadra HOY y hay que cuadrarla. Cambiar el saldo inicial sólo tiene
 * sentido si el punto de partida estaba mal desde el principio — por ejemplo,
 * si al crear la cuenta se tecleó una cifra equivocada.
 *
 * Por eso este formulario anuncia el efecto exacto sobre el saldo actual antes
 * de confirmar, y dice explícitamente que el pasado cambia. Un campo de
 * importe sin esa explicación sería una trampa: parece igual de inocuo que el
 * ajuste y hace algo muy distinto.
 */
export function InitialBalanceForm({
  formId,
  account,
  currentBalance,
  onSubmit,
}: InitialBalanceFormProps) {
  const [amount, setAmount] = useState(toAmountInputValue(account.initialBalance));
  const [date, setDate] = useState(account.initialBalanceDate);
  const [error, setError] = useState<string | undefined>(undefined);

  const parsed = parseAmountInput(amount, true);
  // El saldo actual se mueve exactamente lo mismo que el inicial: los
  // movimientos que hay encima no cambian.
  const delta = parsed === null ? 0 : parsed - account.initialBalance;
  const projected = currentBalance + delta;
  const changes = delta !== 0;

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (parsed === null) {
      setError('Escribe el saldo con el que arrancaba la cuenta.');
      return;
    }
    setError(undefined);
    onSubmit({ initialBalance: parsed, initialBalanceDate: date });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.warning}>
        <Icon name="warning" size="sm" />
        <span>
          Esto <strong>reescribe el pasado</strong>: cambiarán todos los informes y el saldo de
          cualquier fecha anterior. Si sólo quieres cuadrar la cuenta con lo que dice tu banco
          hoy, cierra esto y usa <strong>Ajustar saldo</strong>.
        </span>
      </div>

      <AmountField
        label="Saldo inicial"
        value={amount}
        onChange={setAmount}
        allowNegative
        autoFocus
        help="Lo que había en la cuenta antes del primer movimiento registrado."
        {...(error ? { error } : {})}
      />

      <TextField
        label="Fecha del saldo inicial"
        type="date"
        value={date}
        onChange={setDate}
        required
      />

      <div className={styles.preview} aria-live="polite">
        {changes ? (
          <>
            <span className={styles.previewLabel}>El saldo actual pasará de</span>
            <span className={styles.previewValues}>
              <span className={styles.previewFrom}>{formatMoney(currentBalance)}</span>
              <Icon name="chevron-right" size="sm" />
              <span className={styles.previewTo}>{formatMoney(projected)}</span>
            </span>
          </>
        ) : (
          <span className={styles.previewLabel}>
            Sin cambios: es el mismo saldo inicial que ya tenía.
          </span>
        )}
      </div>
    </form>
  );
}
