import { useMemo, useState } from 'react';
import type { TransactionFilters } from '@/models';
import { PERIODS, PERIOD_PHRASES, type Period } from '@/constants';
import { Button, Card, Icon } from '@/components/ui';
import { ScreenContainer, TopBar } from '@/components/layout';
import { CategoryRanking } from '@/components/common/CategoryRanking';
import { PeriodTabs } from '@/components/common/PeriodTabs';
import { FilterBar, FilterSheet } from '@/components/filters';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  categorySummaryToCsv,
  csvFileName,
  movementsToCsv,
} from '@/services/backup/exportCsv';
import { applyFilters, countActiveFilters } from '@/services/filters/applyFilters';
import { describeFilters, type ActiveFilterChip } from '@/services/filters/describeFilters';
import { searchTransactions } from '@/services/filters/searchTransactions';
import { categoryBreakdown } from '@/services/metrics/categoryBreakdown';
import { periodTotals } from '@/services/metrics/periodTotals';
import { getPeriodRange } from '@/services/periods/getPeriodRange';
import { useAppStore } from '@/store';
import { useAccountLookup, useAccounts } from '@/store/hooks/useAccounts';
import { useScopedFilters } from '@/store/hooks/useScopedFilters';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { downloadTextFile } from '@/utils/download';
import { formatDateShort } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './ReportsScreen.module.css';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Reportes: acotar, mirar, exportar.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── LA REGLA DE ESTA PANTALLA: NO TIENE MATEMÁTICA PROPIA ─────────────────
 * Todas las cifras salen de `services/metrics` y `services/periods`, las
 * mismas funciones que alimentan el Inicio y Seguimiento. Ni una suma escrita
 * aquí. Si Reportes calculara por su cuenta, tarde o temprano el informe y la
 * pantalla dirían cifras distintas y no habría manera de saber cuál creer —
 * que es exactamente el género de fallo que originó esta reescritura.
 *
 * Vale también para el CSV: `exportCsv` recibe el reparto ya hecho.
 *
 * ── LOS FILTROS SON SUYOS, NO LOS DE MOVIMIENTOS ──────────────────────────
 * Ambas pantallas guardan sus criterios en `uiSlice`, pero bajo ÁMBITOS
 * distintos. Acotar un informe para exportarlo no debe recortar en silencio la
 * lista de movimientos de la otra pestaña, ni al revés: un filtro que aparece
 * donde nadie lo puso es indistinguible de datos perdidos.
 *
 * La primera versión los llevaba en `useState` local, que también aislaba —
 * pero los perdía al tocar cualquier pestaña de la barra inferior, y montar un
 * informe con cuatro criterios cuesta bastante más que anotar un gasto. Con el
 * ámbito en el store se consiguen las dos cosas.
 *
 * Funciona sin tocar los componentes porque `FilterBar` y `FilterSheet` no
 * guardan estado: reciben `filters` y devuelven parches, así que sirven a
 * cualquier dueño (ADR-025).
 */
export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Ámbito propio: acotar un informe no recorta la lista de Movimientos, y
  // los criterios sobreviven a un salto a otra pestaña de la barra inferior.
  const { filters, search, patchFilters, clearFilters, setSearch } = useScopedFilters('reports');

  const transactions = useTransactions();
  const accounts = useAccounts();
  const accountById = useAccountLookup();
  const { categories, subcategories, categoryById, subcategoryById } = useCategories();
  const showToast = useAppStore((state) => state.showToast);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const debouncedSearch = useDebouncedValue(search, 200);

  const searchContext = useMemo(
    () => ({ categoryById, subcategoryById, accountById }),
    [categoryById, subcategoryById, accountById],
  );

  /**
   * El periodo se combina con los filtros como un criterio más.
   *
   * Se escribe en `dateFrom`/`dateTo` sólo si el usuario no puso fechas
   * propias: si eligió un rango a mano en la hoja, mandan las suyas. Al revés
   * —el periodo pisando la elección explícita— el selector de fechas parecería
   * roto.
   */
  const effectiveFilters = useMemo<TransactionFilters>(() => {
    const hasOwnDates = filters.dateFrom !== undefined || filters.dateTo !== undefined;
    return hasOwnDates ? filters : { ...filters, dateFrom: range.from, dateTo: range.to };
  }, [filters, range]);

  const matchingFilters = useMemo(
    () => applyFilters(transactions, effectiveFilters, searchContext),
    [transactions, effectiveFilters, searchContext],
  );

  const visible = useMemo(
    () =>
      debouncedSearch === ''
        ? matchingFilters
        : searchTransactions(matchingFilters, debouncedSearch, searchContext),
    [matchingFilters, debouncedSearch, searchContext],
  );

  // Los totales son los de LO QUE SE VE. Un informe cuyos totales no
  // correspondan a sus filas no es un informe.
  const totals = useMemo(() => periodTotals(visible), [visible]);

  const slices = useMemo(
    () => categoryBreakdown(visible, categoryById),
    [visible, categoryById],
  );

  const activeCount = countActiveFilters(filters);
  const chips = useMemo(
    () => describeFilters(filters, { accountById, categoryById, subcategoryById }),
    [filters, accountById, categoryById, subcategoryById],
  );

  function handleRemoveChip(chip: ActiveFilterChip): void {
    patchFilters(chip.patch);
  }

  function clearAll(): void {
    clearFilters();
    setSearch('');
  }

  function exportMovements(): void {
    if (visible.length === 0) {
      // Descargar un archivo con sólo la cabecera parece que la exportación
      // falló. Mejor decir por qué está vacío.
      showToast('No hay movimientos que exportar con estos criterios.', 'error');
      return;
    }
    downloadTextFile(
      movementsToCsv(visible, { accountById, categoryById, subcategoryById }),
      csvFileName('movimientos'),
      'text/csv',
    );
    showToast(`${visible.length} movimientos exportados.`, 'success');
  }

  function exportSummary(): void {
    if (slices.length === 0) {
      showToast('No hay gastos que resumir con estos criterios.', 'error');
      return;
    }
    downloadTextFile(categorySummaryToCsv(slices), csvFileName('resumen'), 'text/csv');
    showToast('Resumen por categoría exportado.', 'success');
  }

  const usaFechasPropias = filters.dateFrom !== undefined || filters.dateTo !== undefined;

  return (
    <>
      <TopBar title="Reportes" icon="nav-reports" />

      <ScreenContainer>
        <PeriodTabs value={period} onChange={setPeriod} periods={PERIODS} />

        <p className={styles.range}>
          {usaFechasPropias ? (
            // Si el usuario puso fechas, el periodo de arriba ya no manda y
            // hay que decirlo: si no, las pestañas parecerían no hacer nada.
            <>
              Fechas propias del filtro
              <span className={styles.rangeHint}> · las pestañas no se aplican</span>
            </>
          ) : (
            <>
              {formatDateShort(range.from)}
              {range.from !== range.to && <> – {formatDateShort(range.to)}</>}
            </>
          )}
        </p>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchHint={
            search === '' ? undefined : `${visible.length} de ${matchingFilters.length}`
          }
          activeCount={activeCount}
          chips={chips}
          onOpenFilters={() => setSheetOpen(true)}
          onRemoveChip={handleRemoveChip}
          onClearAll={clearFilters}
        />

        <Card className={styles.totals}>
          <div className={styles.totalsGrid}>
            <div>
              <span className={styles.totalLabel}>Ingresos</span>
              <span className={cn(styles.totalValue, styles.income)}>
                {formatMoney(totals.income)}
              </span>
            </div>
            <div>
              <span className={styles.totalLabel}>Gastos</span>
              <span className={cn(styles.totalValue, styles.expense)}>
                {formatMoney(totals.expense)}
              </span>
            </div>
            <div>
              <span className={styles.totalLabel}>Balance</span>
              <span className={cn(styles.totalValue, totals.net < 0 && styles.expense)}>
                {formatMoney(totals.net)}
              </span>
            </div>
          </div>
          <p className={styles.totalsCaption}>
            {totals.count} {totals.count === 1 ? 'movimiento' : 'movimientos'} en el informe. Los
            ajustes de saldo no se cuentan.
          </p>
        </Card>

        <div className={styles.ranking}>
          <CategoryRanking
            slices={slices}
            total={totals.expense}
            periodPhrase={PERIOD_PHRASES[period]}
          />
        </div>

        <Card>
          <h3 className={styles.exportTitle}>Exportar</h3>
          <p className={styles.exportHint}>
            Se descargan los movimientos que ves ahora, con los filtros aplicados. El archivo se
            abre directamente en Excel.
          </p>
          <div className={styles.exportActions}>
            <Button variant="tonal" onClick={exportMovements}>
              <Icon name="export" size="sm" />
              Movimientos
            </Button>
            <Button variant="tonal" onClick={exportSummary}>
              <Icon name="export" size="sm" />
              Resumen
            </Button>
          </div>
        </Card>

        {(activeCount > 0 || search !== '') && (
          <button type="button" className={styles.clearAll} onClick={clearAll}>
            Quitar filtros y búsqueda
          </button>
        )}
      </ScreenContainer>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onPatch={patchFilters}
        onClearAll={clearFilters}
        accounts={accounts}
        categories={categories}
        subcategories={subcategories}
        resultCount={visible.length}
      />
    </>
  );
}
