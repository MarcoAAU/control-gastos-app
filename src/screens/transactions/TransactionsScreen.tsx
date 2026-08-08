import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ActiveFilterChip } from '@/services/filters/describeFilters';
import type { Transaction } from '@/models';
import { ScreenContainer, TopBar, Fab } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Sheet } from '@/components/ui';
import { FilterBar, FilterSheet } from '@/components/filters';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { applyFilters, countActiveFilters } from '@/services/filters/applyFilters';
import { describeFilters } from '@/services/filters/describeFilters';
import { searchTransactions } from '@/services/filters/searchTransactions';
import { periodTotals } from '@/services/metrics/periodTotals';
import { useAppStore } from '@/store';
import { useAccountLookup, useAccounts } from '@/store/hooks/useAccounts';
import { useScopedFilters } from '@/store/hooks/useScopedFilters';
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
  | { kind: 'filters' }
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

  /**
   * Los criterios viven en el STORE, no en `useState` local.
   *
   * Tres componentes distintos —la barra, la hoja y las fichas de criterio
   * activo— leen y escriben los mismos filtros. Con estado local habría que
   * bajarlo por props a través de todos ellos, y cada uno tendría su propia
   * oportunidad de quedarse desincronizado. Con una sola fuente, quitar una
   * ficha y desmarcar su casilla en la hoja son literalmente la misma
   * escritura.
   *
   * ⚠️ Y NO SE PERSISTE (`uiSlice` está fuera de lo que se guarda). Reabrir la
   * app con un filtro puesto de la sesión anterior enseñaría una lista
   * recortada sin que nada explique por qué: la lectura obvia es "perdí mis
   * movimientos".
   *
   * El ámbito `'transactions'` los separa de los de Reportes: filtrar aquí no
   * debe recortar un informe de la otra pestaña, ni al revés.
   */
  const { filters, search, patchFilters, clearFilters, setSearch } =
    useScopedFilters('transactions');

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

  /**
   * El texto se pinta al instante; el FILTRADO espera 200 ms de reposo.
   *
   * Sin esto, cada pulsación recorrería todos los movimientos construyendo el
   * texto de búsqueda de cada uno. Con el retraso, escribir "aeropuerto"
   * dispara un recorrido en vez de diez, y el campo nunca va a tirones porque
   * lo que se retrasa es el resultado, no la letra. Ver `useDebouncedValue`.
   */
  const debouncedSearch = useDebouncedValue(search, 200);

  const searchContext = useMemo(
    () => ({ categoryById, subcategoryById, accountById }),
    [categoryById, subcategoryById, accountById],
  );

  /**
   * Se filtra en DOS pasos, y no de una vez, por dos motivos.
   *
   * 1. El número. La pista del buscador dice "3 de 12", y ese 12 tiene que ser
   *    *lo que había antes de escribir*, no el total del libro. Con el total,
   *    buscando dentro de un filtro de agosto salía "1 de 17" mientras la
   *    lista sin buscar decía 16 — y el 17 incluía un ajuste de saldo que el
   *    usuario no puede ver en ninguna circunstancia. Dos cifras que no cuadran
   *    y una de ellas imposible de verificar.
   *
   * 2. El coste. Los criterios cambian con un toque; el texto, con cada tecla.
   *    Al separarlos, teclear sólo repite la búsqueda sobre la lista ya
   *    recortada, que suele ser una fracción del total.
   */
  const matchingFilters = useMemo(
    () => applyFilters(transactions, filters, searchContext),
    [transactions, filters, searchContext],
  );

  const visible = useMemo(
    () =>
      debouncedSearch === ''
        ? matchingFilters
        : searchTransactions(matchingFilters, debouncedSearch, searchContext),
    [matchingFilters, debouncedSearch, searchContext],
  );

  // La insignia y las fichas describen los criterios de la HOJA, no la
  // búsqueda: el texto ya está a la vista dentro de su cuadro, y repetirlo en
  // una ficha sería decir dos veces lo mismo ocupando media fila.
  const activeCount = countActiveFilters(filters);
  const chips = useMemo(
    () => describeFilters(filters, { accountById, categoryById, subcategoryById }),
    [filters, accountById, categoryById, subcategoryById],
  );

  const filtering = activeCount > 0 || search !== '';

  function handleRemoveChip(chip: ActiveFilterChip): void {
    patchFilters(chip.patch);
  }

  function handleClearEverything(): void {
    clearFilters();
    setSearch('');
  }

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
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            // El recuento sólo aparece mientras se busca. Fuera de ahí ya lo
            // dice la línea de resumen, y decirlo dos veces es ruido.
            searchHint={
              search === '' ? undefined : `${visible.length} de ${matchingFilters.length}`
            }
            activeCount={activeCount}
            chips={chips}
            onOpenFilters={() => setSheet({ kind: 'filters' })}
            onRemoveChip={handleRemoveChip}
            onClearAll={clearFilters}
          />
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
              // La lista vacía significa dos cosas muy distintas: "todavía no
              // hay nada" o "hay cosas, pero las estás escondiendo". El dibujo
              // lo dice antes de leer el texto.
              illustration={transactions.length === 0 ? 'movements' : 'search'}
              title={
                transactions.length === 0
                  ? 'Todavía no hay movimientos'
                  : search !== ''
                    ? `Nada coincide con «${search}»`
                    : 'Ningún movimiento con esos filtros'
              }
              description={
                transactions.length === 0
                  ? noAccounts
                    ? 'Crea primero una cuenta en la pestaña Cuentas y podrás registrar tus ingresos y gastos.'
                    : 'Registra tu primer ingreso o gasto con el botón +.'
                  : // Se dice cuántos movimientos hay en total: es la prueba de
                    // que no se ha perdido nada, sólo está oculto tras un
                    // criterio. Es justo la duda que provoca una lista vacía.
                    `Tienes ${transactions.length} ${transactions.length === 1 ? 'movimiento' : 'movimientos'} guardados. Prueba a quitar algún criterio.`
              }
              action={
                filtering ? (
                  <Button variant="tonal" onClick={handleClearEverything}>
                    Quitar filtros y búsqueda
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

      <FilterSheet
        open={sheet.kind === 'filters'}
        onClose={() => setSheet({ kind: 'closed' })}
        filters={filters}
        onPatch={patchFilters}
        onClearAll={clearFilters}
        accounts={accounts}
        categories={categories}
        subcategories={subcategories}
        resultCount={visible.length}
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
