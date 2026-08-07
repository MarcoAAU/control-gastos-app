import { useState } from 'react';
import type { Account } from '@/models';
import { AmountField, Icon, TextField } from '@/components/ui';
import { solveAdjustment } from '@/services/balance/solveAdjustment';
import { todayISO } from '@/utils/date';
import { formatMoney, parseAmountInput, toAmountInputValue } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AdjustBalanceForm.module.css';

export interface AdjustBalanceValues {
  targetBalance: number;
  date: string;
  notes: string;
}

export interface AdjustBalanceFormProps {
  formId: string;
  account: Account;
  /** Saldo derivado actual. Lo calcula la pantalla, no este componente. */
  currentBalance: number;
  onSubmit: (values: AdjustBalanceValues) => void;
}

/**
 * "Ajustar saldo": cuadrar la cuenta con lo que dice el banco de verdad.
 *
 * ── LO QUE ESTA PANTALLA HACE DISTINTO A v1 ───────────────────────────────
 * En v1 esto era un campo que se sobrescribía (`acc.balance = newBalance`) sin
 * dejar rastro. Aquí se registra un movimiento fechado y reversible (ADR-004),
 * y —esto es lo importante— **se le dice al usuario exactamente qué se va a
 * registrar antes de que confirme**. Que el dinero cambie sin explicación es
 * justo lo que hace desconfiar de una app de gastos.
 *
 * La previsión sale de `solveAdjustment`, la MISMA función que usa el store al
 * guardar: el importe anunciado y el registrado no pueden diferir.
 */
export function AdjustBalanceForm({
  formId,
  account,
  currentBalance,
  onSubmit,
}: AdjustBalanceFormProps) {
  const [target, setTarget] = useState(toAmountInputValue(currentBalance));
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const parsed = parseAmountInput(target, true);
  // Sin número escrito todavía no hay nada que previsualizar; se compara contra
  // sí mismo para que el plan salga "no hace falta ajuste".
  const plan = solveAdjustment(currentBalance, parsed ?? currentBalance);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (parsed === null) {
      setError('Escribe el saldo que tiene la cuenta ahora mismo.');
      return;
    }
    setError(undefined);
    onSubmit({ targetBalance: parsed, date, notes });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.current}>
        <span className={styles.currentLabel}>Saldo según tus movimientos</span>
        <span className={styles.currentValue}>{formatMoney(currentBalance)}</span>
        <span className={styles.currentHint}>{account.name}</span>
      </div>

      <AmountField
        label="¿Cuánto tienes en realidad?"
        value={target}
        onChange={setTarget}
        allowNegative
        autoFocus
        {...(error ? { error } : {})}
      />

      {/* La previsión es el corazón de esta pantalla: sin ella el usuario ve
          cambiar su saldo y no sabe por qué. */}
      <div
        className={cn(
          styles.preview,
          plan.needed && (plan.direction === 'income' ? styles.previewUp : styles.previewDown),
        )}
        // El importe cambia mientras se teclea; sin esto un lector de pantalla
        // no anunciaría la previsión.
        aria-live="polite"
      >
        <Icon name={plan.needed ? (plan.direction === 'income' ? 'up' : 'down') : 'check'} size="sm" />
        <span>
          {plan.needed ? (
            <>
              Se registrará un ajuste de <strong>{formatMoney(plan.amount)}</strong>{' '}
              {plan.direction === 'income' ? 'a favor' : 'en contra'}. No cuenta como ingreso ni
              como gasto. Para deshacerlo, bórralo desde Movimientos filtrando por la categoría
              «Ajuste de saldo».
            </>
          ) : (
            'La cuenta ya cuadra: no se registrará ningún movimiento.'
          )}
        </span>
      </div>

      <TextField
        label="Fecha del ajuste"
        type="date"
        value={date}
        onChange={setDate}
        required
        help="Normalmente hoy. Cámbiala si estás cuadrando un saldo de otra fecha."
      />

      <TextField
        label="Nota"
        value={notes}
        onChange={setNotes}
        placeholder="Opcional — p. ej. Comisión que no había anotado"
        maxLength={120}
      />
    </form>
  );
}
