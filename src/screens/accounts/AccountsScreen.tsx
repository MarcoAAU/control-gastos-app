import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath, PALETTE, ROUTES, SYSTEM_BANK_NONE, SYSTEM_IDS } from '@/constants';
import type { Bank } from '@/models';
import { Fab, ScreenActions, ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Sheet, TextField } from '@/components/ui';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountForm, type AccountFormValues } from '@/components/accounts/AccountForm';
import { BankPicker } from '@/components/accounts/BankPicker';
import { useAppStore } from '@/store';
import { useAccountBalances, useAccounts, useBanks } from '@/store/hooks/useAccounts';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountsScreen.module.css';

/**
 * Qué hoja está abierta.
 *
 * ⚠️ AQUÍ YA NO HAY ACCIONES SOBRE UNA CUENTA. Tocar una tarjeta navega a su
 * detalle (Fase 12), que es donde viven ajustar, editar, cambiar saldo inicial
 * y desconectar. Antes esas acciones estaban también en esta pantalla: dos
 * sitios con las mismas operaciones significan dos confirmaciones que hay que
 * mantener sincronizadas, y tarde o temprano divergen.
 */
type SheetState =
  | { kind: 'closed' }
  | { kind: 'pickBank' }
  | { kind: 'createAccount'; bank: Bank | null }
  | { kind: 'banks' }
  | { kind: 'renameBank'; bank: Bank };

const CREATE_FORM_ID = 'account-create-form';

/**
 * Cuentas: el saldo total y la lista.
 *
 * Ningún saldo se lee de un campo guardado: todos salen de
 * `useAccountBalances`, que deriva del libro de movimientos. En v1
 * `account.balance` era un campo que cada alta, edición y borrado de
 * movimiento tenía que acordarse de actualizar a mano (`app.js:171-173`); un
 * solo olvido rompía la contabilidad sin forma de detectarlo.
 */
export default function AccountsScreen() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const { banks, byId: bankById } = useBanks();

  const addAccount = useAppStore((state) => state.addAccount);
  const addBank = useAppStore((state) => state.addBank);
  const updateBank = useAppStore((state) => state.updateBank);
  const showToast = useAppStore((state) => state.showToast);

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });
  const [bankName, setBankName] = useState('');

  /**
   * ⚠️ Se rotula "Saldo total" y NUNCA "Ingresos". Ésa fue la confusión de v1:
   * `app.js:221` sumaba los saldos y lo mostraba bajo "Ingresos", así que cada
   * gasto lo hacía bajar (ADR-003).
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

  /** Cuántas cuentas usa cada banco: decide si renombrarlo es inocuo. */
  const usageByBank = useMemo(() => {
    const counts = new Map<string, number>();
    for (const account of accounts) {
      counts.set(account.bankId, (counts.get(account.bankId) ?? 0) + 1);
    }
    return counts;
  }, [accounts]);

  function handleCreate(values: AccountFormValues): void {
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

  function handleRenameBank(event: React.FormEvent): void {
    event.preventDefault();
    if (sheet.kind !== 'renameBank') return;
    const name = bankName.trim();
    if (!name) return;

    updateBank(sheet.bank.id, { name });
    setSheet({ kind: 'banks' });
    // Renombrar el banco cambia el rótulo de todas sus cuentas a la vez: es lo
    // que v1 no podía hacer, porque el nombre vivía copiado dentro de cada una.
    showToast('Banco renombrado en todas sus cuentas.', 'success');
  }

  const createSheetOpen = sheet.kind === 'pickBank' || sheet.kind === 'createAccount';
  const banksSheetOpen = sheet.kind === 'banks' || sheet.kind === 'renameBank';

  return (
    <>
      <TopBar title="Cuentas" icon="nav-accounts" actions={<ScreenActions />} />

      <ScreenContainer>
        {accounts.length > 0 && (
          <Card className={styles.totalCard}>
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
              illustration="accounts"
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
          <>
            <div className={styles.list}>
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  balance={balances.get(account.id) ?? account.initialBalance}
                  bank={bankById.get(account.bankId)}
                  onPress={(selected) =>
                    navigate(buildPath(ROUTES.accountDetail, { accountId: selected.id }))
                  }
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.banksRow}
              onClick={() => setSheet({ kind: 'banks' })}
            >
              <Icon name="bank" size="md" />
              <span className={styles.banksText}>
                <span className={styles.banksTitle}>Bancos</span>
                <span className={styles.banksHint}>
                  {pickableBanks.length} guardados · renombra el tuyo
                </span>
              </span>
              <Icon name="chevron-right" size="sm" />
            </button>
          </>
        )}
      </ScreenContainer>

      <Fab label="Conectar banco" onClick={() => setSheet({ kind: 'pickBank' })} />

      {/* ── HOJA 1: nueva cuenta (elegir banco → datos) ────────────────── */}
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

      {/* ── HOJA 2: gestión de bancos ──────────────────────────────────── */}
      <Sheet
        open={banksSheetOpen}
        onClose={() => setSheet({ kind: 'closed' })}
        title={sheet.kind === 'renameBank' ? 'Renombrar banco' : 'Bancos'}
        footer={
          sheet.kind === 'renameBank' ? (
            <>
              <Button variant="tonal" onClick={() => setSheet({ kind: 'banks' })}>
                Cancelar
              </Button>
              <Button type="submit" form="bank-form">
                Guardar
              </Button>
            </>
          ) : undefined
        }
      >
        {sheet.kind === 'banks' && (
          <>
            <p className={styles.banksIntro}>
              El nombre vive en el banco, no copiado dentro de cada cuenta: al renombrarlo cambia
              en todas a la vez.
            </p>
            <div className={styles.bankList}>
              {pickableBanks.map((bank) => {
                const used = usageByBank.get(bank.id) ?? 0;
                const locked = SYSTEM_IDS.includes(bank.id);
                return (
                  <div key={bank.id} className={styles.bankItem}>
                    <span
                      className={styles.bankDot}
                      style={{ background: bank.color }}
                      aria-hidden="true"
                    />
                    <span className={styles.bankInfo}>
                      <span className={styles.bankName}>{bank.name}</span>
                      <span className={styles.bankMeta}>
                        {bank.isBuiltIn ? 'De la app' : 'Tuyo'} ·{' '}
                        {used === 0 ? 'sin cuentas' : `${used} ${used === 1 ? 'cuenta' : 'cuentas'}`}
                      </span>
                    </span>
                    {!locked && (
                      <button
                        type="button"
                        className={styles.bankAction}
                        aria-label={`Renombrar ${bank.name}`}
                        onClick={() => {
                          setBankName(bank.name);
                          setSheet({ kind: 'renameBank', bank });
                        }}
                      >
                        <Icon name="edit" size="sm" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {sheet.kind === 'renameBank' && (
          <form id="bank-form" className={styles.bankForm} onSubmit={handleRenameBank} noValidate>
            <TextField
              label="Nombre del banco"
              value={bankName}
              onChange={setBankName}
              maxLength={40}
              required
              autoFocus
            />
            <p className={styles.bankFormHint}>
              {(() => {
                const used = usageByBank.get(sheet.bank.id) ?? 0;
                if (used === 0) return 'Ninguna cuenta lo usa todavía.';
                return (
                  <>
                    Cambiará en {used === 1 ? 'la' : 'las'} <strong>{used}</strong>{' '}
                    {used === 1 ? 'cuenta que lo usa' : 'cuentas que lo usan'}.
                  </>
                );
              })()}
            </p>
          </form>
        )}
      </Sheet>
    </>
  );
}
