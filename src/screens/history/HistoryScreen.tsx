import { useMemo, useState } from 'react';
import type { HistoryEntry } from '@/models';
import { Fab, ScreenActions, ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, EmptyState, Sheet, TextField } from '@/components/ui';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { StatTile } from '@/components/common/StatTile';
import { useAppStore } from '@/store';
import { useAccountLookup } from '@/store/hooks/useAccounts';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { formatDateShort, todayISO } from '@/utils/date';
import styles from './HistoryScreen.module.css';

type SheetState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'detail'; entry: HistoryEntry }
  | { kind: 'confirmDelete'; entry: HistoryEntry };

const FORM_ID = 'history-form';

/**
 * Historial guardado: fotos de un intervalo. Porta la sección `#historyList`
 * del Inicio de v1 y sus dos modales.
 *
 * ── LO QUE HAY QUE RESPETAR AQUÍ ──────────────────────────────────────────
 * Los totales se CONGELAN al guardar y no se recalculan nunca (`historySlice`).
 * Si se derivaran de los movimientos actuales, editar un gasto de hace un mes
 * cambiaría retroactivamente un historial ya guardado — que es justo el fallo
 * que el usuario reportó en v1 ("no se están guardando los valores"),
 * corregido allí en el commit 66c59af.
 *
 * ── UNA DIFERENCIA DE SIGNIFICADO CON v1 ──────────────────────────────────
 * En v1, el "Ingresos" que se congelaba era en realidad el saldo total de las
 * cuentas (`app.js:455`), no los ingresos del intervalo. Las entradas migradas
 * conservan ese número tal cual —un snapshot es un snapshot— pero se marcan
 * con `origin: 'legacy'` y la vista de detalle lo advierte, para que nadie
 * compare esas cifras antiguas con las nuevas como si midieran lo mismo.
 */
export default function HistoryScreen() {
  const history = useAppStore((state) => state.history);
  const transactions = useTransactions();
  const saveHistoryEntry = useAppStore((state) => state.saveHistoryEntry);
  const deleteHistoryEntry = useAppStore((state) => state.deleteHistoryEntry);
  const showToast = useAppStore((state) => state.showToast);

  const { categoryById } = useCategories();
  const accountById = useAccountLookup();

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [error, setError] = useState<string | undefined>(undefined);

  const sorted = useMemo(
    () => history.slice().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)),
    [history],
  );

  const selected =
    sheet.kind === 'detail' || sheet.kind === 'confirmDelete' ? sheet.entry : null;

  function openCreate(): void {
    setName('');
    setStartDate(todayISO());
    setEndDate(todayISO());
    setError(undefined);
    setSheet({ kind: 'create' });
  }

  function handleSave(event: React.FormEvent): void {
    event.preventDefault();

    if (!name.trim()) {
      setError('Ponle un nombre para reconocerlo después.');
      return;
    }
    if (startDate > endDate) {
      // Misma validación que v1: sin ella el rango no selecciona nada y el
      // historial se guarda vacío sin explicar por qué.
      setError('La fecha "Desde" debe ser anterior o igual a "Hasta".');
      return;
    }

    const matching = transactions.filter((tx) => tx.date >= startDate && tx.date <= endDate);
    saveHistoryEntry({ name, startDate, endDate, transactions: matching });

    setSheet({ kind: 'closed' });
    showToast(
      `Historial "${name.trim()}" guardado (${matching.length} ${
        matching.length === 1 ? 'movimiento' : 'movimientos'
      })`,
      'success',
    );
  }

  function handleDelete(): void {
    if (sheet.kind !== 'confirmDelete') return;
    deleteHistoryEntry(sheet.entry.id);
    setSheet({ kind: 'closed' });
    showToast('Historial eliminado. Tus movimientos no se han tocado.', 'success');
  }

  return (
    <>
      <TopBar title="Historial" icon="nav-history" actions={<ScreenActions />} />

      <ScreenContainer>
        {sorted.length === 0 ? (
          <Card padding="none">
            <EmptyState
              illustration="history"
              title="Aún no has guardado historial"
              description="Guarda una foto de un periodo —una quincena, un mes— con sus totales congelados. Aunque después edites esos movimientos, la foto no cambia."
              action={
                <Button variant="tonal" onClick={openCreate}>
                  Guardar un periodo
                </Button>
              }
            />
          </Card>
        ) : (
          <div className={styles.list}>
            {sorted.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={styles.item}
                onClick={() => setSheet({ kind: 'detail', entry })}
              >
                <span className={styles.itemInfo}>
                  <span className={styles.itemName}>{entry.name}</span>
                  <span className={styles.itemRange}>
                    {formatDateShort(entry.startDate)} → {formatDateShort(entry.endDate)}
                  </span>
                </span>
                <span className={styles.itemCount}>
                  {entry.transactions.length} mov.
                </span>
              </button>
            ))}
          </div>
        )}
      </ScreenContainer>

      <Fab label="Guardar periodo" onClick={openCreate} />

      {/* Guardar un periodo nuevo. */}
      <Sheet
        open={sheet.kind === 'create'}
        onClose={() => setSheet({ kind: 'closed' })}
        title="Guardar periodo"
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID}>
              Guardar
            </Button>
          </>
        }
      >
        <form id={FORM_ID} className={styles.form} onSubmit={handleSave} noValidate>
          <TextField
            label="Nombre"
            value={name}
            onChange={setName}
            placeholder="p. ej. Quincena de agosto"
            maxLength={60}
            required
            autoFocus
            {...(error && !error.includes('Desde') ? { error } : {})}
          />
          <TextField
            label="Desde"
            type="date"
            value={startDate}
            onChange={setStartDate}
            required
          />
          <TextField
            label="Hasta"
            type="date"
            value={endDate}
            onChange={setEndDate}
            required
            {...(error && error.includes('Desde') ? { error } : {})}
          />
          <p className={styles.formHint}>
            Se copiarán los movimientos del rango y sus totales quedarán congelados. Editar o
            borrar un movimiento después no cambiará esta foto.
          </p>
        </form>
      </Sheet>

      {/* Detalle, con el borrado como paso interno (nunca dos overlays). */}
      <Sheet
        open={selected !== null}
        onClose={() => setSheet({ kind: 'closed' })}
        title={sheet.kind === 'confirmDelete' ? '¿Eliminar este historial?' : (selected?.name ?? '')}
        footer={
          selected ? (
            sheet.kind === 'confirmDelete' ? (
              <>
                <Button
                  variant="tonal"
                  onClick={() => setSheet({ kind: 'detail', entry: selected })}
                >
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Eliminar
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                onClick={() => setSheet({ kind: 'confirmDelete', entry: selected })}
              >
                Eliminar historial
              </Button>
            )
          ) : undefined
        }
      >
        {selected && sheet.kind === 'confirmDelete' && (
          <p className={styles.confirmText}>
            Se eliminará la foto guardada de <strong>{selected.name}</strong>.{' '}
            <strong>Tus movimientos no se tocan</strong>: sólo desaparece este resumen.
          </p>
        )}

        {selected && sheet.kind === 'detail' && (
          <>
            <p className={styles.detailRange}>
              {formatDateShort(selected.startDate)} → {formatDateShort(selected.endDate)} ·{' '}
              {selected.transactions.length} movimientos
            </p>

            <div className={styles.totals}>
              <StatTile label="Ingresos" value={selected.totals.income} tone="income" />
              <StatTile label="Gastos" value={selected.totals.expense} tone="expense" />
              <StatTile label="Balance" value={selected.totals.balance} signed />
            </div>

            {selected.origin === 'legacy' && (
              // Sin este aviso, el usuario compararía un "Ingresos" que era un
              // saldo con otro que sí son ingresos, y concluiría que la app
              // perdió dinero.
              <p className={styles.legacyNotice}>
                Este historial se guardó con la versión anterior de la app, donde
                «Ingresos» mostraba en realidad el <strong>saldo total de tus cuentas</strong>, no
                los ingresos del periodo. La cifra se conserva tal como se guardó; no la compares
                con la de los historiales nuevos.
              </p>
            )}

            {selected.transactions.length === 0 ? (
              <p className={styles.confirmText}>No había movimientos en este rango.</p>
            ) : (
              <div className={styles.detailList}>
                {selected.transactions
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      category={categoryById.get(transaction.categoryId)}
                      account={accountById.get(transaction.accountId)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
