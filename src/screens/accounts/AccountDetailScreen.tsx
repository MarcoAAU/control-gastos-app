import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROUTES, SYSTEM_ACCOUNT_UNASSIGNED, SYSTEM_BANK_NONE } from '@/constants';
import { ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Sheet } from '@/components/ui';
import { AccountBalanceHeader } from '@/components/accounts/AccountBalanceHeader';
import { AccountForm, type AccountFormValues } from '@/components/accounts/AccountForm';
import { AdjustBalanceForm } from '@/components/accounts/AdjustBalanceForm';
import {
  InitialBalanceForm,
  type InitialBalanceValues,
} from '@/components/accounts/InitialBalanceForm';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { useAppStore } from '@/store';
import { useAccount, useAccountBalances, useBanks } from '@/store/hooks/useAccounts';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountDetailScreen.module.css';

type SheetState =
  | { kind: 'closed' }
  | { kind: 'adjust' }
  | { kind: 'edit' }
  | { kind: 'initialBalance' }
  | { kind: 'confirmArchive' };

const ADJUST_FORM = 'detail-adjust-form';
const EDIT_FORM = 'detail-edit-form';
const INITIAL_FORM = 'detail-initial-form';

/**
 * Detalle de una cuenta: su saldo desglosado, sus movimientos y sus acciones.
 *
 * ── LO QUE APORTA FRENTE A LA LISTA ───────────────────────────────────────
 * La lista responde "cuánto tengo"; esto responde "**por qué** tengo eso".
 * Con el saldo derivado, un número que el usuario no puede editar a mano
 * resulta desconcertante si no se explica de dónde sale — por eso la cabecera
 * muestra la operación completa.
 *
 * Aquí viven las dos operaciones que se parecen y no lo son: **Ajustar saldo**
 * (registra un movimiento, reversible) y **Cambiar saldo inicial** (reescribe
 * el pasado). Ver `InitialBalanceForm` para la comparación completa.
 */
export default function AccountDetailScreen() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const account = useAccount(accountId);
  const balances = useAccountBalances();
  const { byId: bankById } = useBanks();
  const transactions = useTransactions();
  const { categoryById } = useCategories();

  const updateAccount = useAppStore((state) => state.updateAccount);
  const archiveAccount = useAppStore((state) => state.archiveAccount);
  const addBank = useAppStore((state) => state.addBank);
  const adjustAccountBalance = useAppStore((state) => state.adjustAccountBalance);
  const showToast = useAppStore((state) => state.showToast);

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });

  const movements = useMemo(
    () => (account ? transactions.filter((tx) => tx.accountId === account.id) : []),
    [transactions, account],
  );

  /** Desglose que explica el saldo. Los ajustes van aparte (ADR-004). */
  const breakdown = useMemo(() => {
    let income = 0;
    let expense = 0;
    let adjustments = 0;
    for (const tx of movements) {
      if (tx.isAdjustment) {
        adjustments += tx.type === 'income' ? tx.amount : -tx.amount;
      } else if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    }
    return { income, expense, adjustments };
  }, [movements]);

  if (!account) {
    return (
      <>
        <TopBar title="Cuenta" icon="nav-accounts" />
        <ScreenContainer>
          <Card padding="none">
            <EmptyState
              icon="warning"
              title="Esta cuenta ya no existe"
              description="Puede que la hayas desconectado desde otro sitio."
              action={
                <Button variant="tonal" onClick={() => navigate(ROUTES.accounts)}>
                  Volver a Cuentas
                </Button>
              }
            />
          </Card>
        </ScreenContainer>
      </>
    );
  }

  const balance = balances.get(account.id) ?? account.initialBalance;
  const isSystem = account.id === SYSTEM_ACCOUNT_UNASSIGNED;

  function handleAdjust(values: { targetBalance: number; date: string; notes: string }): void {
    const id = adjustAccountBalance({
      accountId: account!.id,
      currentBalance: balance,
      targetBalance: values.targetBalance,
      date: values.date,
      notes: values.notes,
    });
    setSheet({ kind: 'closed' });

    if (id === null) {
      showToast('La cuenta ya cuadraba: no se registró nada.', 'info');
      return;
    }
    showToast(
      `Se registró un ajuste de ${formatMoney(Math.abs(values.targetBalance - balance))} para cuadrar el saldo.`,
      'success',
    );
  }

  function handleEdit(values: AccountFormValues): void {
    const bankId = values.bankName ? addBank({ name: values.bankName }) : SYSTEM_BANK_NONE;
    updateAccount(account!.id, {
      name: values.name,
      bankId: bankId || SYSTEM_BANK_NONE,
      type: values.type,
      includeInTotals: values.includeInTotals,
    });
    setSheet({ kind: 'closed' });
    showToast('Cuenta actualizada', 'success');
  }

  function handleInitialBalance(values: InitialBalanceValues): void {
    const previous = account!.initialBalance;
    updateAccount(account!.id, {
      initialBalance: values.initialBalance,
      initialBalanceDate: values.initialBalanceDate,
    });
    setSheet({ kind: 'closed' });

    if (values.initialBalance === previous) {
      showToast('El saldo inicial no cambió.', 'info');
      return;
    }
    // Se nombra el efecto real, no la operación: al usuario le importa en qué
    // quedó su saldo, no que se haya escrito un campo.
    showToast(
      `Saldo inicial actualizado. El saldo actual pasó a ${formatMoney(
        balance + (values.initialBalance - previous),
      )}.`,
      'success',
    );
  }

  function handleArchive(): void {
    archiveAccount(account!.id);
    showToast('Cuenta desconectada. Sus movimientos se conservan.', 'success');
    navigate(ROUTES.accounts);
  }

  return (
    <>
      <TopBar title="Cuenta" icon="nav-accounts" />

      <ScreenContainer>
        <Link to={ROUTES.accounts} className={styles.back}>
          <Icon name="chevron-left" size="sm" />
          Todas las cuentas
        </Link>

        <AccountBalanceHeader
          account={account}
          bank={bankById.get(account.bankId)}
          balance={balance}
          income={breakdown.income}
          expense={breakdown.expense}
          adjustments={breakdown.adjustments}
        />

        {isSystem ? (
          <Card className={styles.systemNote}>
            Esta cuenta la creó la migración para no perder movimientos cuya cuenta original ya no
            existía. Puedes reasignar esos movimientos a una cuenta real y luego desconectarla.
          </Card>
        ) : (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionRow}
              onClick={() => setSheet({ kind: 'adjust' })}
            >
              <Icon name="cat-ajuste" size="md" />
              <span className={styles.actionText}>
                <span className={styles.actionTitle}>Ajustar saldo</span>
                <span className={styles.actionHint}>
                  Cuadra la cuenta con lo que dice tu banco hoy. Reversible.
                </span>
              </span>
            </button>

            <button
              type="button"
              className={styles.actionRow}
              onClick={() => setSheet({ kind: 'edit' })}
            >
              <Icon name="edit" size="md" />
              <span className={styles.actionText}>
                <span className={styles.actionTitle}>Editar cuenta</span>
                <span className={styles.actionHint}>Nombre, banco, tipo</span>
              </span>
            </button>

            <button
              type="button"
              className={styles.actionRow}
              onClick={() => setSheet({ kind: 'initialBalance' })}
            >
              <Icon name="warning" size="md" />
              <span className={styles.actionText}>
                <span className={styles.actionTitle}>Cambiar saldo inicial</span>
                <span className={styles.actionHint}>
                  Corrige el punto de partida. Reescribe el pasado.
                </span>
              </span>
            </button>

            <button
              type="button"
              className={cn(styles.actionRow, styles.actionDanger)}
              onClick={() => setSheet({ kind: 'confirmArchive' })}
            >
              <Icon name="delete" size="md" />
              <span className={styles.actionText}>
                <span className={styles.actionTitle}>Desconectar cuenta</span>
                <span className={styles.actionHint}>Sus movimientos se conservan</span>
              </span>
            </button>
          </div>
        )}

        <h2 className={styles.listTitle}>
          Movimientos
          <span className={styles.listCount}>{movements.length}</span>
        </h2>

        {movements.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon="nav-transactions"
              title="Sin movimientos"
              description="Cuando registres ingresos o gastos en esta cuenta, aparecerán aquí."
            />
          </Card>
        ) : (
          <div className={styles.list}>
            {movements.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                category={categoryById.get(transaction.categoryId)}
                account={account}
              />
            ))}
          </div>
        )}
      </ScreenContainer>

      {/* Una sola hoja que cambia de contenido: nunca dos overlays apilados. */}
      <Sheet
        open={sheet.kind !== 'closed'}
        onClose={() => setSheet({ kind: 'closed' })}
        title={
          sheet.kind === 'adjust'
            ? 'Ajustar saldo'
            : sheet.kind === 'edit'
              ? 'Editar cuenta'
              : sheet.kind === 'initialBalance'
                ? 'Cambiar saldo inicial'
                : '¿Desconectar la cuenta?'
        }
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            {sheet.kind === 'adjust' && (
              <Button type="submit" form={ADJUST_FORM}>
                Registrar ajuste
              </Button>
            )}
            {sheet.kind === 'edit' && (
              <Button type="submit" form={EDIT_FORM}>
                Guardar cambios
              </Button>
            )}
            {sheet.kind === 'initialBalance' && (
              <Button variant="danger" type="submit" form={INITIAL_FORM}>
                Reescribir
              </Button>
            )}
            {sheet.kind === 'confirmArchive' && (
              <Button variant="danger" onClick={handleArchive}>
                Desconectar
              </Button>
            )}
          </>
        }
      >
        {sheet.kind === 'adjust' && (
          <AdjustBalanceForm
            formId={ADJUST_FORM}
            account={account}
            currentBalance={balance}
            onSubmit={handleAdjust}
          />
        )}

        {sheet.kind === 'edit' && (
          <AccountForm
            formId={EDIT_FORM}
            account={account}
            bank={bankById.get(account.bankId) ?? null}
            onSubmit={handleEdit}
          />
        )}

        {sheet.kind === 'initialBalance' && (
          <InitialBalanceForm
            formId={INITIAL_FORM}
            account={account}
            currentBalance={balance}
            onSubmit={handleInitialBalance}
          />
        )}

        {sheet.kind === 'confirmArchive' && (
          <p className={styles.confirmText}>
            <strong>{account.name}</strong> dejará de aparecer y su saldo saldrá del total.{' '}
            <strong>Sus {movements.length} movimientos se conservan</strong> y seguirás viéndolos
            en la lista.
          </p>
        )}
      </Sheet>
    </>
  );
}
