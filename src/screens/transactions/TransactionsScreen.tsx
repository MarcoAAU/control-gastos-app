import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Transaction } from '@/models';
import { ScreenContainer, TopBar, Fab } from '@/components/layout';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Select,
  Sheet,
} from '@/components/ui';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { SYSTEM_CATEGORY_ADJUSTMENT } from '@/constants';
import { applyFilters } from '@/services/filters/applyFilters';
import { periodTotals } from '@/services/metrics/periodTotals';
import { useAppStore } from '@/store';
import { useAccountLookup, useAccounts } from '@/store/hooks/useAccounts';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { formatDateTime } from '@/utils/date';
import { formatMoney, formatSignedMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './TransactionsScreen.module.css';

/** Qué hoja está abierta. Estado local: no vale la pena en el store. */
type SheetState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; transaction: Transaction }
  | { kind: 'actions'; transaction: Transaction }
  // La confirmación es un PASO DENTRO de la misma hoja, no un diálogo encima:
  // encadenar dos overlays es frágil (ver useBackButton) y en móvil apila dos
  // velos sobre el contenido.
  | { kind: 'confirmDelete'; transaction: Transaction };

const FORM_ID = 'transaction-form';

/**
 * Movimientos. Paridad con la vista de v1, sobre el modelo nuevo.
 *
 * Lo que cambia respecto a v1 y por qué:
 * · Tocar una fila abre una hoja de acciones, en vez de mostrar dos enlaces de
 *   11px ("Editar"/"Eliminar") en cada fila. Objetivos así de pequeños en una
 *   lista densa provocan pulsaciones erróneas, y una de ellas borra.
 * · Borrar pide confirmación en un paso dentro de la misma hoja, NUNCA con
 *   `window.confirm()` (nota 2 del checklist: las PWA instaladas en iOS lo
 *   deshabilitan en silencio y el borrado no hacía nada).
 * · Nada aquí toca un saldo: se deriva del libro.
 */
export default function TransactionsScreen() {
  const transactions = useTransactions();
  const accounts = useAccounts();
  const { categories, subcategories, categoryById, subcategoryById } = useCategories();

  const addTransaction = useAppStore((state) => state.addTransaction);
  const updateTransaction = useAppStore((state) => state.updateTransaction);
  const deleteTransaction = useAppStore((state) => state.deleteTransaction);
  const duplicateTransaction = useAppStore((state) => state.duplicateTransaction);
  const showToast = useAppStore((state) => state.showToast);

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  // El `+` del Inicio navega aquí pidiendo que se abra el formulario.
  const location = useLocation();
  const navigate = useNavigate();
  const openCreateRequested = (location.state as { openCreate?: boolean } | null)?.openCreate;

  useEffect(() => {
    if (!openCreateRequested) return;
    setSheet({ kind: 'create' });
    // Se consume la intención de inmediato: si se quedara en el historial,
    // volver atrás a esta pantalla reabriría el formulario solo.
    navigate(location.pathname, { replace: true, state: null });
  }, [openCreateRequested, navigate, location.pathname]);

  // Para RESOLVER nombres se usan todas las cuentas (incluidas las
  // desconectadas), y para OFRECER opciones sólo las activas: un movimiento de
  // una cuenta desconectada debe seguir diciendo de cuál era, pero esa cuenta
  // ya no debe poder elegirse en el formulario ni en el filtro.
  const accountById = useAccountLookup();

  const visible = useMemo(
    () =>
      applyFilters(
        transactions,
        {
          ...(categoryFilter ? { categoryIds: [categoryFilter] } : {}),
          ...(accountFilter ? { accountIds: [accountFilter] } : {}),
          // Los ajustes se ocultan por defecto —son contabilidad interna— pero
          // filtrar POR la categoría "Ajuste de saldo" sólo puede significar
          // que el usuario quiere verlos. Sin esta línea quedarían registrados
          // e invisibles: imposibles de revisar y, sobre todo, de borrar, que
          // es lo que los hace reversibles (ADR-004).
          includeAdjustments: categoryFilter === SYSTEM_CATEGORY_ADJUSTMENT,
        },
        { categoryById },
      ),
    [transactions, categoryFilter, accountFilter, categoryById],
  );

  // Totales de lo que se está VIENDO, no de todo el libro: si hay un filtro
  // puesto, un total global sería engañoso.
  //
  // Se usa `periodTotals` en vez de sumar aquí a mano para que los ajustes
  // queden fuera también cuando están a la vista: un ajuste al alza no es un
  // ingreso, y contarlo aquí sería reproducir en pequeño el error de v1.
  const totals = useMemo(() => periodTotals(visible), [visible]);

  const editing = sheet.kind === 'edit' ? sheet.transaction : undefined;
  const selected =
    sheet.kind === 'actions' || sheet.kind === 'confirmDelete' ? sheet.transaction : null;
  const confirming = sheet.kind === 'confirmDelete';

  function handleSubmit(draft: Parameters<typeof addTransaction>[0]): void {
    if (editing) {
      updateTransaction(editing.id, draft);
      showToast(draft.type === 'income' ? 'Ingreso actualizado' : 'Gasto actualizado', 'success');
    } else {
      addTransaction(draft);
      showToast(draft.type === 'income' ? 'Ingreso guardado' : 'Gasto guardado', 'success');
    }
    setSheet({ kind: 'closed' });
  }

  function handleDuplicate(transaction: Transaction): void {
    duplicateTransaction(transaction.id);
    setSheet({ kind: 'closed' });
    showToast('Movimiento duplicado', 'success');
  }

  function confirmDelete(): void {
    if (sheet.kind !== 'confirmDelete') return;
    deleteTransaction(sheet.transaction.id);
    setSheet({ kind: 'closed' });
    showToast('Movimiento eliminado', 'success');
  }

  const noAccounts = accounts.length === 0;

  return (
    <>
      <TopBar title="Movimientos" icon="nav-transactions" />

      <ScreenContainer>
        {transactions.length > 0 && (
          <div className={styles.filters}>
            <Select
              label="Categoría"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Todas"
            />
            <Select
              label="Cuenta"
              value={accountFilter}
              onChange={setAccountFilter}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Todas"
            />
          </div>
        )}

        {visible.length > 0 && (
          <div className={styles.summary}>
            <span>
              {visible.length} {visible.length === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <span className={styles.summaryValue}>
              {formatMoney(totals.income)} · {formatMoney(-totals.expense)}
            </span>
          </div>
        )}

        {visible.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon="nav-transactions"
              title={
                transactions.length === 0
                  ? 'Todavía no hay movimientos'
                  : 'Ningún movimiento con esos filtros'
              }
              description={
                transactions.length === 0
                  ? noAccounts
                    ? 'Crea primero una cuenta en la pestaña Cuentas y podrás registrar tus ingresos y gastos.'
                    : 'Registra tu primer ingreso o gasto con el botón +.'
                  : 'Prueba a quitar alguno de los filtros.'
              }
              action={
                transactions.length > 0 ? (
                  <Button
                    variant="tonal"
                    onClick={() => {
                      setCategoryFilter('');
                      setAccountFilter('');
                    }}
                  >
                    Quitar filtros
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <TransactionList
            transactions={visible}
            categoryById={categoryById}
            accountById={accountById}
            onPress={(transaction) => setSheet({ kind: 'actions', transaction })}
          />
        )}
      </ScreenContainer>

      <Fab
        label="Agregar movimiento"
        onClick={() => {
          if (noAccounts) {
            // Un formulario sin cuenta que elegir no se puede completar: mejor
            // decirlo que dejar al usuario rellenar y fallar al guardar.
            showToast('Crea primero una cuenta para poder registrar movimientos.', 'error');
            return;
          }
          setSheet({ kind: 'create' });
        }}
      />

      {/* Alta y edición comparten formulario. `key` fuerza a React a montar uno
          nuevo al cambiar de movimiento: sin él, el estado del formulario
          anterior se quedaría dentro. */}
      <Sheet
        open={sheet.kind === 'create' || sheet.kind === 'edit'}
        onClose={() => setSheet({ kind: 'closed' })}
        title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID}>
              {editing ? 'Guardar cambios' : 'Guardar'}
            </Button>
          </>
        }
      >
        <TransactionForm
          key={editing?.id ?? 'new'}
          formId={FORM_ID}
          transaction={editing}
          accounts={accounts}
          categories={categories}
          subcategories={subcategories}
          onSubmit={handleSubmit}
        />
      </Sheet>

      {/* Hoja de acciones. La confirmación de borrado es un PASO INTERNO, no
          un diálogo encima: encadenar dos overlays resultó frágil (la
          confirmación se cancelaba sola por una carrera con el historial del
          navegador) y en móvil apila dos velos. Ver la nota de useBackButton. */}
      <Sheet
        open={sheet.kind === 'actions' || confirming}
        onClose={() => setSheet({ kind: 'closed' })}
        title={confirming ? '¿Eliminar el movimiento?' : 'Movimiento'}
        footer={
          confirming ? (
            <>
              {/* Cancelar primero: es la salida segura. */}
              <Button
                variant="tonal"
                onClick={() =>
                  selected ? setSheet({ kind: 'actions', transaction: selected }) : undefined
                }
              >
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Eliminar
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <>
            <div className={styles.detail}>
              <span
                className={cn(
                  styles.detailAmount,
                  selected.type === 'income' && styles.detailIncome,
                )}
              >
                {formatSignedMoney(selected.amount, selected.type)}
              </span>
              <span className={styles.detailMeta}>
                {selected.description || categoryById.get(selected.categoryId)?.name}
              </span>
              <span className={styles.detailMeta}>
                {categoryById.get(selected.categoryId)?.name ?? 'Sin categoría'}
                {/* La subcategoría cuelga de la categoría, así que se muestra
                    pegada a ella y no como un dato suelto más. */}
                {selected.subcategoryId && (
                  <> › {subcategoryById.get(selected.subcategoryId)?.name}</>
                )}{' '}
                · {accountById.get(selected.accountId)?.name ?? '—'}
              </span>
              <span className={styles.detailMeta}>
                {formatDateTime(selected.date, selected.time)}
              </span>
            </div>

            {/* Las observaciones sólo aparecen si las hay: un bloque vacío
                rotulado "Observaciones" es ruido en una hoja pequeña. */}
            {selected.notes && !confirming && (
              <p className={styles.detailNotes}>{selected.notes}</p>
            )}

            {confirming ? (
              <p className={styles.confirmText}>
                Se eliminará este movimiento y el saldo de la cuenta se recalculará solo. Esta
                acción no se puede deshacer.
              </p>
            ) : (
              <div className={styles.actionsSheet}>
                <button
                  type="button"
                  className={styles.actionRow}
                  onClick={() => setSheet({ kind: 'edit', transaction: selected })}
                >
                  <Icon name="edit" size="md" />
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.actionRow}
                  onClick={() => handleDuplicate(selected)}
                >
                  <Icon name="duplicate" size="md" />
                  Duplicar
                </button>
                <button
                  type="button"
                  className={cn(styles.actionRow, styles.actionDanger)}
                  onClick={() => setSheet({ kind: 'confirmDelete', transaction: selected })}
                >
                  <Icon name="delete" size="md" />
                  Eliminar
                </button>
              </div>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
