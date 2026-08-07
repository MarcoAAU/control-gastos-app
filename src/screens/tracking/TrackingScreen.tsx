import { lazy, Suspense, useMemo, useState } from 'react';
import {
  PERIODS,
  PERIOD_COMPARISON_LABELS,
  PERIOD_PHRASES,
  type Period,
} from '@/constants';
import { Card, EmptyState, Skeleton } from '@/components/ui';
import { ScreenContainer, TopBar } from '@/components/layout';
import { PeriodTabs } from '@/components/common/PeriodTabs';
import { TransactionList } from '@/components/transactions/TransactionList';
import { categoryBreakdown, dailySeries } from '@/services/metrics/categoryBreakdown';
import { comparePeriods } from '@/services/metrics/comparePeriods';
import { monthlySeries } from '@/services/metrics/monthlySeries';
import { eachDayInRange } from '@/services/periods/getPeriodRange';
import { getPreviousPeriodRange } from '@/services/periods/getPreviousPeriodRange';
import { useAccountLookup } from '@/store/hooks/useAccounts';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { formatDateShort } from '@/utils/date';
import { CategoryRanking } from './sections/CategoryRanking';
import { PeriodSummary } from './sections/PeriodSummary';
import styles from './TrackingScreen.module.css';

const TrackingCharts = lazy(() => import('./sections/TrackingCharts'));

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Seguimiento: el mismo periodo, comparado consigo mismo.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── UNA PANTALLA, NO CUATRO PESTAÑAS-COMPONENTE ───────────────────────────
 * El plan preveía `DailyTab`, `WeeklyTab`, `MonthlyTab` y `YearlyTab`. Serían
 * cuatro archivos idénticos salvo en una línea —qué se agrupa— y por tanto
 * cuatro sitios donde arreglar cada fallo y tres oportunidades de olvidarse.
 * Lo que de verdad cambia con el periodo es el BUCKET de la serie, así que eso
 * es lo único parametrizado.
 *
 * ── LO QUE NO TIENE LA VISTA DIARIA, Y POR QUÉ ────────────────────────────
 * Un día no tiene serie que dibujar: una gráfica de una sola barra no informa
 * de nada, sólo ocupa. En su lugar el día muestra sus movimientos, que es lo
 * que se quiere ver al mirar un día concreto. Semana y mes se agrupan por día;
 * el año, por mes.
 *
 * ── TODO ES FLUJO ─────────────────────────────────────────────────────────
 * Ni una cifra de esta pantalla es un saldo. Seguimiento responde a "qué pasó
 * durante el periodo"; "cuánto tengo" se responde en Inicio y en Cuentas
 * (ADR-003).
 */
export default function TrackingScreen() {
  const [period, setPeriod] = useState<Period>('month');

  const transactions = useTransactions();
  const accountById = useAccountLookup();
  const { categoryById } = useCategories();

  const ranges = useMemo(() => getPreviousPeriodRange(period), [period]);

  const comparison = useMemo(
    () => comparePeriods(transactions, ranges.current, ranges.previous),
    [transactions, ranges],
  );

  const slices = useMemo(
    () => categoryBreakdown(transactions, categoryById, { range: ranges.current }),
    [transactions, categoryById, ranges],
  );

  /**
   * La serie del periodo.
   *
   * Se recorta el rango diario hasta HOY en los periodos en curso: dibujar los
   * veinticuatro días que faltan del mes como barras a cero sugiere que no se
   * gastó nada en ellos, cuando lo cierto es que aún no han ocurrido.
   */
  const daily = useMemo(() => {
    if (period === 'day' || period === 'year') return [];
    const to = ranges.current.to < todayOf(ranges) ? ranges.current.to : todayOf(ranges);
    return dailySeries(transactions, eachDayInRange({ from: ranges.current.from, to }));
  }, [period, transactions, ranges]);

  const monthly = useMemo(() => {
    if (period !== 'year') return [];
    const months = monthKeysOfYear(ranges.current.from.slice(0, 4));
    return monthlySeries(transactions, months);
  }, [period, transactions, ranges]);

  const dayMovements = useMemo(() => {
    if (period !== 'day') return [];
    return transactions.filter(
      (tx) => !tx.isAdjustment && tx.date >= ranges.current.from && tx.date <= ranges.current.to,
    );
  }, [period, transactions, ranges]);

  const periodPhrase = PERIOD_PHRASES[period];
  const comparisonLabel = PERIOD_COMPARISON_LABELS[period];
  const chartTitle = period === 'year' ? 'Mes a mes' : 'Día a día';

  return (
    <>
      <TopBar title="Seguimiento" icon="nav-tracking" />

      <ScreenContainer>
        <PeriodTabs value={period} onChange={setPeriod} periods={PERIODS} />

        {/**
         * El rango exacto, siempre a la vista, y cuántos días llevas.
         *
         * El periodo actual se muestra COMPLETO (1–31 de agosto) porque eso es
         * lo que suman sus cifras, igual que en el Inicio: si las dos
         * pantallas definieran "este mes" de forma distinta, sus totales no
         * cuadrarían. Pero la comparación de abajo usa sólo los días
         * transcurridos, así que sin decir cuántos son quedaba un "3 – 9 ago"
         * junto a un "comparado con 27 – 31 jul" y la resta no salía.
         */}
        <p className={styles.range}>
          {formatDateShort(ranges.current.from)}
          {ranges.current.from !== ranges.current.to && (
            <> – {formatDateShort(ranges.current.to)}</>
          )}
          {ranges.isPartial && (
            // El `{' '}` explícito: JSX come el espacio al final de una línea
            // antes de una expresión, y sin él salía "31 ago 2026· 7 días".
            <>
              {' '}
              <span className={styles.elapsed}>
                · {ranges.elapsedDays} {ranges.elapsedDays === 1 ? 'día' : 'días'} transcurridos
              </span>
            </>
          )}
        </p>

        <PeriodSummary
          comparison={comparison}
          ranges={ranges}
          comparisonLabel={comparisonLabel}
        />

        {period === 'day' ? (
          dayMovements.length > 0 ? (
            <div className={styles.section}>
              <TransactionList
                transactions={dayMovements}
                categoryById={categoryById}
                accountById={accountById}
                grouped={false}
              />
            </div>
          ) : (
            <Card padding="none" className={styles.section}>
              <EmptyState
                icon="nav-transactions"
                title={`Sin movimientos ${periodPhrase}`}
                description="Los movimientos que registres hoy aparecerán aquí."
              />
            </Card>
          )
        ) : (
          <div className={styles.section}>
            <Suspense fallback={<Skeleton variant="rect" height={240} />}>
              <TrackingCharts daily={daily} monthly={monthly} title={chartTitle} />
            </Suspense>
          </div>
        )}

        <CategoryRanking
          slices={slices}
          total={comparison.current.expense}
          periodPhrase={periodPhrase}
        />
      </ScreenContainer>
    </>
  );
}

/**
 * Hoy, deducido de los rangos ya calculados.
 *
 * `getPreviousPeriodRange` ya resolvió cuántos días llevan transcurridos; de
 * ahí sale la fecha de hoy sin volver a leer el reloj. Consultarlo otra vez
 * abriría la puerta a que la serie y la comparación usaran días distintos si
 * el render cae justo en un cambio de día.
 */
function todayOf(ranges: { current: { from: string }; elapsedDays: number }): string {
  const start = new Date(`${ranges.current.from}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() + Math.max(0, ranges.elapsedDays - 1));
  return start.toISOString().slice(0, 10);
}

/** Las doce claves `'yyyy-MM'` de un año. */
function monthKeysOfYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}
