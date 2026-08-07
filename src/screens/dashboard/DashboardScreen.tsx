import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DASHBOARD_PERIODS,
  DEFAULT_PERIOD,
  PERIOD_PHRASES,
  ROUTES,
  type Period,
} from '@/constants';
import { Card, Icon, IconButton, Skeleton } from '@/components/ui';
import { Fab, ScreenContainer, TopBar } from '@/components/layout';
import { PeriodTabs } from '@/components/common/PeriodTabs';
import { accountDistribution } from '@/services/balance/accountDistribution';
import { buildBalanceTimeline } from '@/services/balance/buildBalanceTimeline';
import { averageDailySpend } from '@/services/metrics/averageDailySpend';
import { categoryBreakdown, dailySeries } from '@/services/metrics/categoryBreakdown';
import { largestExpense } from '@/services/metrics/largestExpense';
import { monthlySeries } from '@/services/metrics/monthlySeries';
import { periodTotals } from '@/services/metrics/periodTotals';
import { savingsRate } from '@/services/metrics/savingsRate';
import { topCategory } from '@/services/metrics/topCategory';
import {
  eachDayInRange,
  getPeriodRange,
  getRollingRange,
  lastMonths,
} from '@/services/periods/getPeriodRange';
import {
  useAccountBalances,
  useAccountLookup,
  useAccounts,
  useTotalBalance,
} from '@/store/hooks/useAccounts';
import { useCategories, useTransactions } from '@/store/hooks/useTransactions';
import { AccountsRow } from './sections/AccountsRow';
import { FinancialSummary } from './sections/FinancialSummary';
import { IndicatorGrid } from './sections/IndicatorGrid';
import { RecentTransactions } from './sections/RecentTransactions';
import styles from './DashboardScreen.module.css';

/**
 * Las gráficas se cargan aparte porque arrastran Recharts (~100 kB gz) y el
 * Inicio es la pantalla de arranque: sin esto, nadie vería su saldo hasta
 * haber descargado la librería de gráficos. Ver `sections/ChartsSection.tsx`.
 */
const ChartsSection = lazy(() => import('./sections/ChartsSection'));

/** Cuántos movimientos recientes mostrar. El mismo tope que v1. */
const RECENT_LIMIT = 6;

/** Días de la gráfica de tendencia. El mismo que v1. */
const TREND_DAYS = 14;

/**
 * Ventanas de las gráficas nuevas (Fase 15). Son constantes y no ajustes del
 * usuario a propósito: una app de gastos personales no necesita un selector de
 * ventana en el Inicio, necesita que el Inicio se lea de un vistazo.
 *
 * · 6 meses en la comparada — un año no cabe legible en 350 px de ancho.
 * · 30 días en la evolución del saldo — es el ciclo real de quien cobra
 *   mensualmente; con 365 días la variación del mes en curso desaparecería.
 */
const MONTHLY_COUNT = 6;
const BALANCE_DAYS = 30;

/**
 * Inicio. Paridad con v1 más la corrección de fondo del rótulo "Ingresos"
 * (ver `sections/FinancialSummary.tsx`, donde está explicada a fondo).
 *
 * ── CÓMO SE REPARTE EL TRABAJO ────────────────────────────────────────────
 * Esta pantalla NO calcula nada: elige un periodo, pide los números a
 * `services/` y los reparte entre secciones. Toda la aritmética vive en
 * funciones puras con tests, y por eso el bug de v1 no puede reaparecer aquí
 * por descuido: no hay dónde escribir una suma a mano.
 *
 * El saldo total viene de `services/balance` (STOCK) y los totales del periodo
 * de `services/metrics` (FLUJO). Son dos módulos separados por una regla de
 * ESLint, no por convención.
 */
export default function DashboardScreen() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const navigate = useNavigate();

  const transactions = useTransactions();
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const accountById = useAccountLookup();
  const { categoryById } = useCategories();

  const range = useMemo(() => getPeriodRange(period), [period]);

  /**
   * STOCK. Se rotula "Saldo total" y nunca "Ingresos" (ADR-003).
   *
   * Sale del hook, que a su vez llama a `computeTotalBalance`. Antes esta
   * pantalla repetía la suma a mano aunque el hook ya existía — dos sitios
   * calculando el mismo número, que es exactamente la forma que tenía el
   * descuadre de v1 de colarse. Importa más desde la Fase 15: la línea de
   * "Evolución del saldo" termina en esta misma cifra, y si cada una la
   * calculara por su cuenta podrían acabar discrepando en la misma pantalla.
   */
  const totalBalance = useTotalBalance();

  // FLUJO del periodo. Los ajustes quedan excluidos dentro de `periodTotals`.
  const totals = useMemo(() => periodTotals(transactions, range), [transactions, range]);

  const inPeriod = useMemo(
    () => transactions.filter((tx) => tx.date >= range.from && tx.date <= range.to),
    [transactions, range],
  );

  const slices = useMemo(
    () => categoryBreakdown(transactions, categoryById, { range }),
    [transactions, categoryById, range],
  );

  const trend = useMemo(() => {
    const days = eachDayInRange(getRollingRange(TREND_DAYS));
    return dailySeries(transactions, days);
  }, [transactions]);

  // ── Indicadores del periodo (Fase 15). Los cinco son FLUJO. ──────────────
  const averageDaily = useMemo(() => averageDailySpend(totals.expense, range), [totals.expense, range]);
  const mainCategory = useMemo(() => topCategory(slices), [slices]);
  const biggestExpense = useMemo(() => largestExpense(inPeriod), [inPeriod]);
  const savings = useMemo(() => savingsRate(totals), [totals]);

  // ── Series de las gráficas nuevas ───────────────────────────────────────
  // La comparada y la de saldo NO dependen del periodo elegido: responden a
  // "cómo va la cosa en general", y reiniciarlas al tocar una pestaña haría
  // que dos gráficas contiguas hablaran de ventanas distintas sin avisar.
  const monthly = useMemo(
    () => monthlySeries(transactions, lastMonths(MONTHLY_COUNT)),
    [transactions],
  );

  // STOCK: el saldo día a día. Va en `services/balance`, no en metrics.
  const balanceSeries = useMemo(
    () => buildBalanceTimeline(accounts, transactions, eachDayInRange(getRollingRange(BALANCE_DAYS))),
    [accounts, transactions],
  );

  // STOCK: reparto del saldo actual entre cuentas.
  const distribution = useMemo(
    () => accountDistribution(accounts, balances),
    [accounts, balances],
  );

  // `useTransactions` ya los devuelve del más reciente al más antiguo, así que
  // aquí sólo hay que filtrar y cortar. Los ajustes no son "movimientos" para
  // el usuario: mostrarlos aquí llenaría el Inicio de contabilidad interna.
  const recent = useMemo(
    () => inPeriod.filter((tx) => !tx.isAdjustment).slice(0, RECENT_LIMIT),
    [inPeriod],
  );

  // Para la prosa se usa la FRASE y no el rótulo de la pestaña: 'Sin gastos en
  // semana' es castellano roto. Ver PERIOD_PHRASES.
  const periodPhrase = PERIOD_PHRASES[period];
  const isEmpty = accounts.length === 0 && transactions.length === 0;

  return (
    <>
      <TopBar
        title="Mis Gastos"
        actions={
          <>
            <RefreshButton />
            <IconButton
              icon="nav-settings"
              label="Ajustes"
              onClick={() => navigate(ROUTES.settings)}
            />
          </>
        }
      />

      <ScreenContainer>
        {isEmpty ? (
          <Card className={styles.welcome}>
            <h2 className={styles.welcomeTitle}>Empieza por una cuenta</h2>
            <p className={styles.welcomeText}>
              Crea una cuenta con el saldo que tienes ahora y empieza a registrar tus movimientos.
              La app no inventa saldos ni movimientos: todo lo que veas lo habrás escrito tú.
            </p>
            <Link to={ROUTES.accounts} className={styles.welcomeLink}>
              Ir a Cuentas
              <Icon name="chevron-right" size="sm" />
            </Link>
          </Card>
        ) : (
          <>
            <PeriodTabs value={period} onChange={setPeriod} periods={DASHBOARD_PERIODS} />

            <FinancialSummary
              totalBalance={totalBalance}
              totals={totals}
              periodPhrase={periodPhrase}
            />

            <IndicatorGrid
              totals={totals}
              averageDaily={averageDaily}
              topCategory={mainCategory}
              largestExpense={biggestExpense}
              savingsRate={savings}
              periodPhrase={periodPhrase}
            />

            <AccountsRow accounts={accounts} balances={balances} />

            {/* El hueco se reserva con la misma altura que ocuparán las
                gráficas: así al llegar el chunk nada salta de sitio. */}
            <Suspense fallback={<Skeleton variant="rect" height={280} count={3} />}>
              <ChartsSection
                slices={slices}
                trend={trend}
                trendDays={TREND_DAYS}
                expenseTotal={totals.expense}
                periodPhrase={periodPhrase}
                monthly={monthly}
                monthlyCount={MONTHLY_COUNT}
                balanceSeries={balanceSeries}
                balanceDays={BALANCE_DAYS}
                distribution={distribution}
              />
            </Suspense>

            <RecentTransactions
              transactions={recent}
              categoryById={categoryById}
              accountById={accountById}
              periodPhrase={periodPhrase}
            />

            <Link to={ROUTES.history} className={styles.historyLink}>
              <Icon name="nav-history" size="md" />
              <span className={styles.historyText}>
                <span className={styles.historyTitle}>Historial guardado</span>
                <span className={styles.historyHint}>Guarda una foto de un periodo</span>
              </span>
              <Icon name="chevron-right" size="sm" />
            </Link>
          </>
        )}
      </ScreenContainer>

      {/* El `+` del Inicio, como en v1: anotar un gasto es lo que más se hace y
          no debería costar dos toques. Lleva a Movimientos con el formulario ya
          abierto, en vez de duplicar aquí el formulario y su validación — dos
          copias del mismo formulario acaban divergiendo. */}
      {!isEmpty && (
        <Fab
          label="Agregar movimiento"
          onClick={() => navigate(ROUTES.transactions, { state: { openCreate: true } })}
        />
      )}
    </>
  );
}

/**
 * Recarga forzando la actualización. Porta `#btnRefresh` de v1.
 *
 * Borra las cachés SÓLO si hay conexión: sin red, esas cachés son la única
 * copia desde la que la app puede arrancar, y borrarlas dejaría al usuario con
 * una pantalla en blanco hasta recuperar cobertura. Es la misma precaución que
 * ya tenía v1 (`app.js:831`) y merece conservarse tal cual.
 */
function RefreshButton() {
  async function handleRefresh(): Promise<void> {
    if (navigator.onLine && 'caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Da igual por qué falló: recargar sigue siendo lo correcto.
      }
    }
    window.location.reload();
  }

  return <IconButton icon="refresh" label="Recargar" onClick={handleRefresh} />;
}
