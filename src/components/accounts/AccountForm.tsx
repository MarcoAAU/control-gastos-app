import { useState } from 'react';
import { ACCOUNT_TYPE_META, DEFAULT_ACCOUNT_TYPE } from '@/constants';
import type { Account, AccountType, Bank } from '@/models';
import { AmountField, Select, TextField } from '@/components/ui';
import { todayISO } from '@/utils/date';
import { parseAmountInput } from '@/utils/money';
import styles from './AccountForm.module.css';

/** Lo que el formulario entrega. La pantalla decide si crea o actualiza. */
export interface AccountFormValues {
  name: string;
  /** Nombre del banco. Vacío = sin banco. La pantalla lo resuelve a un id. */
  bankName: string;
  type: AccountType;
  includeInTotals: boolean;
  /** Sólo al crear: el saldo que la cuenta tiene HOY. */
  initialBalance: number;
  initialBalanceDate: string;
}

export interface AccountFormProps {
  formId: string;
  /** Cuenta a editar; ausente = alta. */
  account?: Account | undefined;
  /** Banco elegido en el paso anterior; `null` si el usuario eligió "Otro". */
  bank?: Bank | null;
  onSubmit: (values: AccountFormValues) => void;
}

const TYPE_OPTIONS = (Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((type) => ({
  value: type,
  label: ACCOUNT_TYPE_META[type].label,
}));

interface FormErrors {
  name?: string;
  balance?: string;
}

/**
 * Alta y edición de una cuenta.
 *
 * ── EL SALDO SÓLO SE PIDE AL CREAR, Y ES DELIBERADO ───────────────────────
 * Al dar de alta una cuenta no hay movimientos todavía, así que "cuánto tienes
 * ahora" y "saldo inicial" son el mismo número y preguntarlo es natural.
 *
 * Al EDITAR ya no: la cuenta tiene historial, y tocar el saldo inicial
 * reescribiría el pasado — cambiaría retroactivamente todos los informes y la
 * curva de evolución. Para cuadrar una cuenta existente está "Ajustar saldo",
 * que registra un movimiento fechado y reversible (ADR-004). Cambiar el saldo
 * inicial es otra operación distinta, con su propia advertencia, y llega en la
 * Fase 12.
 *
 * v1 tampoco dejaba editarlo aquí, así que esto no quita nada: sólo explica
 * por qué el campo desaparece.
 *
 * ⚠️ NUNCA se genera un saldo automático. v1 lo hacía al conectar un banco y
 * el usuario lo reportó como error (ítem 18 del checklist).
 */
export function AccountForm({ formId, account, bank, onSubmit }: AccountFormProps) {
  const isEditing = account !== undefined;

  const [name, setName] = useState(account?.name ?? bank?.name ?? '');
  const [bankName, setBankName] = useState(bank?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? DEFAULT_ACCOUNT_TYPE);
  const [includeInTotals, setIncludeInTotals] = useState(account?.includeInTotals ?? true);
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Con un banco ya elegido, su nombre es un dato, no algo que reescribir aquí;
  // el campo libre sólo aparece cuando el usuario eligió "Otro".
  const bankIsFixed = bank != null;

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Ponle un nombre a la cuenta.';

    // Al crear, el saldo es obligatorio pero PUEDE ser 0 o negativo: una
    // tarjeta de crédito arranca en negativo y una cuenta vacía en cero.
    // Por eso se valida "que haya un número", no "que sea mayor que cero".
    const parsed = parseAmountInput(balance, true);
    if (!isEditing && parsed === null) {
      nextErrors.balance = 'Escribe cuánto tienes en esta cuenta ahora mismo.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      bankName: bankIsFixed ? bank.name : bankName.trim(),
      type,
      includeInTotals,
      initialBalance: parsed ?? 0,
      initialBalanceDate: account?.initialBalanceDate ?? todayISO(),
    });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      {bankIsFixed && (
        <div className={styles.bankBadge}>
          <span
            className={styles.bankDot}
            style={{ background: bank.color }}
            aria-hidden="true"
          />
          {bank.name}
        </div>
      )}

      <TextField
        label="Nombre de la cuenta"
        value={name}
        onChange={setName}
        placeholder="p. ej. Cuenta principal"
        maxLength={60}
        required
        autoFocus={!isEditing}
        {...(errors.name ? { error: errors.name } : {})}
      />

      {!bankIsFixed && (
        <TextField
          label="Banco"
          value={bankName}
          onChange={setBankName}
          placeholder="Opcional — p. ej. Bancolombia"
          maxLength={40}
          help="Se guardará para poder elegirlo en otras cuentas."
        />
      )}

      <Select
        label="Tipo de cuenta"
        value={type}
        onChange={(value) => setType(value as AccountType)}
        options={TYPE_OPTIONS}
        required
      />

      {isEditing ? (
        <p className={styles.note}>
          El saldo no se edita aquí: se calcula a partir de tus movimientos. Para cuadrarlo con lo
          que dice tu banco, usa <strong>Ajustar saldo</strong>.
        </p>
      ) : (
        <AmountField
          label="¿Cuánto tienes en esta cuenta ahora?"
          value={balance}
          onChange={setBalance}
          allowNegative
          help="Escribe el saldo real. A partir de aquí se actualiza solo con cada movimiento."
          {...(errors.balance ? { error: errors.balance } : {})}
        />
      )}

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={includeInTotals}
          onChange={(event) => setIncludeInTotals(event.target.checked)}
        />
        <span>
          <span className={styles.checkboxLabel}>Sumar al saldo total</span>
          <span className={styles.checkboxHint}>
            Desactívalo en tarjetas de crédito: su deuda restaría de lo que realmente tienes.
          </span>
        </span>
      </label>
    </form>
  );
}
