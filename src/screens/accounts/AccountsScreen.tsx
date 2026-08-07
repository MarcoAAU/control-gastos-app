import { useMemo, useState } from 'react';
import { PALETTE, SYSTEM_ACCOUNT_UNASSIGNED, SYSTEM_BANK_NONE } from '@/constants';
import type { Account, Bank } from '@/models';
import { Fab, ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Sheet } from '@/components/ui';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountForm, type AccountFormValues } from '@/components/accounts/AccountForm';
import { AdjustBalanceForm } from '@/components/accounts/AdjustBalanceForm';
import { BankPicker } from '@/components/accounts/BankPicker';
import { useAppStore } from '@/store';
import { useAccountBalances, useAccounts, useBanks } from '@/store/hooks/useAccounts';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountsScreen.module.css';

/**
 * Qué hoja está abierta y en qué paso.
 *
 * ⚠️ SON DOS HOJAS, NO SIETE. Cada grupo de estados vive dentro de UNA hoja que
 * cambia de contenido, en vez de abrir una encima de otra. Encadenar overlays
 * resultó frágil (ver `useBackButton`) y en móvil apila velos sobre velos.
 * Es el mismo patrón que ya usa la pantalla de Movimientos.
 */
type SheetState =
  // Hoja "nueva cuenta": elegir banco → rellenar datos.
  | { kind: 'closed' }
  | { kind: 'pickBank' }
  | { kind: 'createAccount'; bank: Bank | null }
  // Hoja "cuenta": acciones → ajustar | editar | confirmar borrado.
  | { kind: 'actions'; account: Account }
  | { kind: 'adjust'; account: Account }
  | { kind: 'edit'; account: Account }
  | { kind: 'confirmDelete'; account: Account };

const CREATE_FORM_ID = 'account-create-form';
const EDIT_FORM_ID = 'account-edit-form';
const ADJUST_FORM_ID = 'account-adjust-form';

/**
 * Cuentas. Paridad con la vista de v1, sobre el modelo derivado.
 *
 * ── LO QUE HAY QUE ENTENDER DE ESTA PANTALLA ──────────────────────────────
 * Ningún saldo se lee de un campo guardado: todos salen de `useAccountBalances`,
 * que deriva del libro de movimientos. Por eso esta pantalla no puede
 * descuadrarse — no existe un segundo sitio donde el saldo pueda estar mal.
 *
 * En v1, `account.balance` era un campo que cada alta, edición y borrado de
 * movimiento tenía que acordarse de actualizar a mano (`app.js:171-173`). Un
 * solo olvido rompía la contabilidad para siempre y sin forma de detectarlo.
 */
export default function AccountsScreen() {
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const { banks, byId: bankById } = useBanks();

  const addAccount = useAppStore((state) => state.addAccount);
  const updateAccount = useAppStore((state) => state.updateAccount);
  const archiveAccount = useAppStore((state) => state.archiveAccount);
  const addBank = useAppStore((state) => state.addBank);
  const adjustAccountBalance = useAppStore((state) => state.adjustAccountBalance);
  const showToast = useAppStore((state) => state.showToast);

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });

  /**
   * Total que se muestra arriba.
   *
   * ⚠️ SE ROTULA "Saldo total" Y NUNCA "Ingresos". Ésa fue exactamente la
   * confusión de v1: `app.js:221` sumaba los saldos de las cuentas y lo
   * mostraba bajo la etiqueta "Ingresos", así que cada gasto la hacía bajar y
   * parecía que los gastos se comían los ingresos (ADR-003).
   */
  const total = useMemo(() => {
    let sum = 0;
    for (const account of accounts) {
      if (account.includeInTotals) sum += balances.get(account.id) ?? 0;
    }
    return sum;
  }, [accounts, balances]);

  /** Bancos ofrecidos al conectar: sin el comodín interno "Sin banco". */
  const pickableBanks = useMemo(
    () => banks.filter((bank) => bank.id !== SYSTEM_BANK_NONE),
    [banks],
  );

  const selected =
    sheet.kind === 'actions' ||
    sheet.kind === 'adjust' ||
    sheet.kind === 'edit' ||
    sheet.kind === 'confirmDelete'
      ? sheet.account
      : null;

  const accountSheetOpen = selected !== null;
  const createSheetOpen = sheet.kind === 'pickBank' || sheet.kind === 'createAccount';

  function handleCreate(values: AccountFormValues): void {
    // El banco se resuelve a una entidad reutilizable. `addBank` es idempotente:
    // escribir dos veces "Bancolombia" no crea dos bancos.
    const bankId = values.bankName ? addBank({ name: values.bankName }) : SYSTEM_BANK_NONE;

    addAccount({
      name: values.name,
      bankId: bankId || SYSTEM_BANK_NONE,
      type: values.type,
      color: bankById.get(bankId)?.color ?? PALETTE[accounts.length % PALETTE.length]!,
      includeInTotals: values.includeInTotals,
      initialBalance: values.initialBalance,
      initialBalanceDate: values.initialBalanceDate,
    });

    setSheet({ kind: 'closed' });
    showToast('Cuenta agregada', 'success');
  }

  function handleEdit(values: AccountFormValues): void {
    if (sheet.kind !== 'edit') return;
    const bankId = values.bankName ? addBank({ name: values.bankName }) : SYSTEM_BANK_NONE;

    updateAccount(sheet.account.id, {
      name: values.name,
      bankId: bankId || SYSTEM_BANK_NONE,
      type: values.type,
      includeInTotals: values.includeInTotals,
    });

    setSheet({ kind: 'closed' });
    showToast('Cuenta actualizada', 'success');
  }

  function handleAdjust(values: {
    targetBalance: number;
    date: string;
    notes: string;
  }): void {
    if (sheet.kind !== 'adjust') return;
    const account = sheet.account;
    const currentBalance = balances.get(account.id) ?? account.initialBalance;

    const id = adjustAccountBalance({
      accountId: account.id,
      currentBalance,
      targetBalance: values.targetBalance,
      date: values.date,
      notes: values.notes,
    });

    setSheet({ kind: 'closed' });

    if (id === null) {
      showToast('La cuenta ya cuadraba: no se registró nada.', 'info');
      return;
    }
    // El mensaje dice QUÉ se hizo, no sólo que se hizo. En v1 el saldo cambiaba
    // sin explicación y no había forma de saber por qué.
    const delta = values.targetBalance - currentBalance;
    showToast(
      `Se registró un ajuste de ${formatMoney(Math.abs(delta))} para cuadrar el saldo.`,
      'success',
    );
  }

  function handleDelete(): void {
    if (sheet.kind !== 'confirmDelete') return;
    // Borrado LÓGICO. Un borrado físico dejaría sus movimientos apuntando a una
    // cuenta inexistente; así el historial sigue siendo legible y consistente.
    archiveAccount(sheet.account.id);
    setSheet({ kind: 'closed' });
    showToast('Cuenta desconectada. Sus movimientos se conservan.', 'success');
  }

  return (
    <>
      <TopBar title="Cuentas" icon="nav-accounts" />

      <ScreenContainer>
        {accounts.length > 0 && (
          <Card className={styles.totalCard}>
            {/* La etiqueta es literal y deliberada: ver el comentario de `total`. */}
            <span className={styles.totalLabel}>Saldo total</span>
            <span className={cn(styles.totalValue, total < 0 && styles.totalNegative)}>
              {formatMoney(total)}
            </span>
            <span className={styles.totalHint}>
              Calculado a partir de tus movimientos, no de un valor guardado.
            </span>
          </Card>
        )}

        {accounts.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon="nav-accounts"
              title="No tienes cuentas conectadas"
              description="Agrega tu primera cuenta para empezar a registrar movimientos. Tú decides el saldo: la app no inventa ninguno."
              action={
                <Button variant="tonal" onClick={() => setSheet({ kind: 'pickBank' })}>
                  Conectar banco
                </Button>
              }
            />
          </Card>
        ) : (
          <div className={styles.list}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                balance={balances.get(account.id) ?? account.initialBalance}
                bank={bankById.get(account.bankId)}
                onPress={(selectedAccount) =>
                  setSheet({ kind: 'actions', account: selectedAccount })
                }
              />
            ))}
          </div>
        )}
      </ScreenContainer>

      <Fab label="Conectar banco" onClick={() => setSheet({ kind: 'pickBank' })} />

      {/* ── HOJA 1: nueva cuenta (elegir banco → datos) ────────────────────
          Un solo overlay que cambia de paso. v1 abría un modal encima de otro. */}
      <Sheet
        open={createSheetOpen}
        onClose={() => setSheet({ kind: 'closed' })}
        title={sheet.kind === 'createAccount' ? 'Nueva cuenta' : 'Conectar banco'}
        footer={
          sheet.kind === 'createAccount' ? (
            <>
              <Button variant="tonal" onClick={() => setSheet({ kind: 'pickBank' })}>
                Atrás
              </Button>
              <Button type="submit" form={CREATE_FORM_ID}>
                Agregar cuenta
              </Button>
            </>
          ) : undefined
        }
      >
        {sheet.kind === 'pickBank' && (
          <BankPicker
            banks={pickableBanks}
            onSelect={(bank) => setSheet({ kind: 'createAccount', bank })}
          />
        )}
        {sheet.kind === 'createAccount' && (
          <AccountForm
            key={sheet.bank?.id ?? 'other'}
            formId={CREATE_FORM_ID}
            bank={sheet.bank}
            onSubmit={handleCreate}
          />
        )}
      </Sheet>

      {/* ── HOJA 2: una cuenta (acciones → ajustar | editar | borrar) ────── */}
      <Sheet
        open={accountSheetOpen}
        onClose={() => setSheet({ kind: 'closed' })}
        title={
          sheet.kind === 'adjust'
            ? 'Ajustar saldo'
            : sheet.kind === 'edit'
              ? 'Editar cuenta'
              : sheet.kind === 'confirmDelete'
                ? '¿Desconectar la cuenta?'
                : (selected?.name ?? 'Cuenta')
        }
        footer={
          selected && sheet.kind !== 'actions' ? (
            <>
              {/* Volver, nunca cerrar: cancelar un paso no debe perder el contexto. */}
              <Button
                variant="tonal"
                onClick={() => setSheet({ kind: 'actions', account: selected })}
              >
                {sheet.kind === 'confirmDelete' ? 'Cancelar' : 'Atrás'}
              </Button>
              {sheet.kind === 'adjust' && (
                <Button type="submit" form={ADJUST_FORM_ID}>
                  Registrar ajuste
                </Button>
              )}
              {sheet.kind === 'edit' && (
                <Button type="submit" form={EDIT_FORM_ID}>
                  Guardar cambios
                </Button>
              )}
              {sheet.kind === 'confirmDelete' && (
                <Button variant="danger" onClick={handleDelete}>
                  Desconectar
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selected && sheet.kind === 'actions' && (
          <>
            <div className={styles.detail}>
              <span className={styles.detailBalance}>
                {formatMoney(balances.get(selected.id) ?? selected.initialBalance)}
              </span>
              <span className={styles.detailMeta}>
                {bankById.get(selected.bankId)?.name ?? 'Sin banco'}
              </span>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionRow}
                onClick={() => setSheet({ kind: 'adjust', account: selected })}
              >
                <Icon name="cat-ajuste" size="md" />
                Ajustar saldo
              </button>
              <button
                type="button"
                className={styles.actionRow}
                onClick={() => setSheet({ kind: 'edit', account: selected })}
              >
                <Icon name="edit" size="md" />
                Editar cuenta
              </button>
              <button
                type="button"
                className={cn(styles.actionRow, styles.actionDanger)}
                onClick={() => setSheet({ kind: 'confirmDelete', account: selected })}
                // La cuenta técnica que recoge los movimientos huérfanos de la
                // migración no se puede desconectar: dejaría de haber dónde
                // ponerlos.
                disabled={selected.id === SYSTEM_ACCOUNT_UNASSIGNED}
              >
                <Icon name="delete" size="md" />
                Desconectar cuenta
              </button>
            </div>
          </>
        )}

        {selected && sheet.kind === 'adjust' && (
          <AdjustBalanceForm
            key={selected.id}
            formId={ADJUST_FORM_ID}
            account={selected}
            currentBalance={balances.get(selected.id) ?? selected.initialBalance}
            onSubmit={handleAdjust}
          />
        )}

        {selected && sheet.kind === 'edit' && (
          <AccountForm
            key={selected.id}
            formId={EDIT_FORM_ID}
            account={selected}
            bank={bankById.get(selected.bankId) ?? null}
            onSubmit={handleEdit}
          />
        )}

        {selected && sheet.kind === 'confirmDelete' && (
          <p className={styles.confirmText}>
            <strong>{selected.name}</strong> dejará de aparecer y su saldo saldrá del total.{' '}
            <strong>Sus movimientos se conservan</strong> y seguirás viéndolos en la lista.
          </p>
        )}
      </Sheet>
    </>
  );
}
