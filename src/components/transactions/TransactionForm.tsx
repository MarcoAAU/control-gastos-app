import { useMemo, useState } from 'react';
import type { Account, Category, ID, Transaction, TransactionType } from '@/models';
import { AmountField, Icon, Select, TextField } from '@/components/ui';
import type { TransactionDraft } from '@/store/slices/transactionsSlice';
import { todayISO } from '@/utils/date';
import { parseAmountInput, toAmountInputValue } from '@/utils/money';
import { cn } from '@/utils/cn';
import { TypeToggle } from './TypeToggle';
import styles from './TransactionForm.module.css';

export interface TransactionFormProps {
  /** Movimiento a editar; ausente = alta. */
  transaction?: Transaction | undefined;
  accounts: readonly Account[];
  categories: readonly Category[];
  /** Cuenta preseleccionada al dar de alta. */
  defaultAccountId?: ID | undefined;
  onSubmit(draft: TransactionDraft): void;
  /** Se llama tras `onSubmit`; el formulario no cierra nada por su cuenta. */
  formId: string;
}

interface FormErrors {
  amount?: string;
  account?: string;
  category?: string;
  date?: string;
}

/**
 * Formulario de alta y edición.
 *
 * ⚠️ NO TOCA NINGÚN SALDO. Entrega un `TransactionDraft` al store y ya está.
 * En v1 el equivalente sumaba y restaba a mano en `account.balance`
 * (`app.js:770-795`), con una rama distinta para alta y para edición, y ahí
 * era donde se descuadraba la contabilidad. Aquí el saldo se deriva.
 *
 * Los campos `time`, `subcategoryId` y `notes` existen en el modelo desde la
 * Fase 3 pero no aparecen todavía en la interfaz: llegan en la Fase 13. Se
 * rellenan con valores por defecto para que ningún movimiento quede a medias.
 */
export function TransactionForm({
  transaction,
  accounts,
  categories,
  defaultAccountId,
  onSubmit,
  formId,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(toAmountInputValue(transaction?.amount));
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '',
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Categorías ofrecidas al usuario.
   *
   * Dos filtros, cada uno por su motivo:
   * · Por TIPO — ofrecer "Salario" al anotar un gasto sólo genera
   *   clasificaciones equivocadas. Las de `'both'` aparecen en ambos casos.
   * · Sin las de SISTEMA — "Ajuste de saldo" la crea únicamente
   *   `adjustAccountBalance` (ADR-004), y "Sin categoría" es el destino de los
   *   movimientos huérfanos al migrar. Si el usuario pudiera elegirlas a mano,
   *   sus movimientos reales se mezclarían con la contabilidad interna y los
   *   totales de la app dejarían de significar lo que dicen.
   *   Siguen apareciendo en los FILTROS: ahí sí sirven, para encontrar los
   *   movimientos que quedaron sin clasificar y arreglarlos.
   */
  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.isSystem && (c.kind === type || c.kind === 'both')),
    [categories, type],
  );

  function handleTypeChange(next: TransactionType): void {
    setType(next);
    // Si la categoría elegida no aplica al nuevo tipo, se limpia en vez de
    // quedar seleccionada de forma invisible.
    const stillValid = categories.some(
      (c) => c.id === categoryId && (c.kind === next || c.kind === 'both'),
    );
    if (!stillValid) setCategoryId('');
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();

    const parsedAmount = parseAmountInput(amount);
    const nextErrors: FormErrors = {};

    if (parsedAmount === null || parsedAmount <= 0) {
      nextErrors.amount = 'Escribe un importe mayor que cero.';
    }
    if (!accountId) nextErrors.account = 'Elige una cuenta.';
    if (!categoryId) nextErrors.category = 'Elige una categoría.';
    if (!date) nextErrors.date = 'Elige una fecha.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      type,
      amount: parsedAmount!,
      date,
      accountId,
      categoryId,
      description,
      // Se conservan al editar; en el alta quedan con su valor por defecto.
      time: transaction?.time ?? '00:00',
      subcategoryId: transaction?.subcategoryId ?? null,
      notes: transaction?.notes ?? '',
    });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <TypeToggle value={type} onChange={handleTypeChange} />

      <AmountField
        label="Importe"
        value={amount}
        onChange={setAmount}
        tone={type === 'income' ? 'income' : 'expense'}
        autoFocus={!transaction}
        {...(errors.amount ? { error: errors.amount } : {})}
      />

      <div>
        <div className={styles.groupLabel}>Categoría</div>
        <div className={styles.categoryGrid} role="radiogroup" aria-label="Categoría">
          {visibleCategories.map((category) => {
            const active = category.id === categoryId;
            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={cn(styles.categoryOption, active && styles.categoryOptionActive)}
                // El color de la categoría lo elige el usuario: es un dato, no
                // un token, y por eso se aplica inline.
                style={active ? { color: category.color, background: `${category.color}1f` } : undefined}
                onClick={() => setCategoryId(category.id)}
              >
                <Icon name={category.icon} size="md" />
                <span className={styles.categoryName}>{category.name}</span>
              </button>
            );
          })}
        </div>
        {errors.category && <div className={styles.fieldError}>{errors.category}</div>}
      </div>

      <Select
        label="Cuenta"
        value={accountId}
        onChange={setAccountId}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        placeholder={accounts.length === 0 ? 'No hay cuentas' : undefined}
        required
        {...(errors.account ? { error: errors.account } : {})}
      />

      <TextField
        label="Fecha"
        type="date"
        value={date}
        onChange={setDate}
        required
        {...(errors.date ? { error: errors.date } : {})}
      />

      <TextField
        label="Descripción"
        value={description}
        onChange={setDescription}
        placeholder="Opcional — p. ej. Mercado del mes"
        maxLength={120}
      />
    </form>
  );
}
