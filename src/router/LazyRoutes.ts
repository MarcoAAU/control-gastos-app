import { lazy } from 'react';

/**
 * Carga diferida de las pantallas.
 *
 * MOTIVO CONCRETO, no dogma: Reportes y el Inicio rediseñado usarán Recharts,
 * que pesa ~95 kB gz. Si se importara de forma estática, alguien que sólo
 * quiere anotar un gasto pagaría esos 95 kB al abrir la app. Con `lazy()`,
 * Recharts vive en su propio chunk y sólo lo descarga quien entra a una
 * pantalla con gráficos.
 *
 * Las pantallas ligeras también van aquí por coherencia: el coste de un chunk
 * extra es despreciable y el presupuesto de carga inicial (≤100 kB gz) se
 * mantiene aunque la app crezca.
 *
 * `AppShell` envuelve las rutas en un `<Suspense>` con un esqueleto.
 */
export const DashboardScreen = lazy(() => import('@/screens/dashboard/DashboardScreen'));
export const TransactionsScreen = lazy(() => import('@/screens/transactions/TransactionsScreen'));
export const AccountsScreen = lazy(() => import('@/screens/accounts/AccountsScreen'));
export const TrackingScreen = lazy(() => import('@/screens/tracking/TrackingScreen'));
export const ReportsScreen = lazy(() => import('@/screens/reports/ReportsScreen'));
export const CategoriesScreen = lazy(() => import('@/screens/categories/CategoriesScreen'));
export const HistoryScreen = lazy(() => import('@/screens/history/HistoryScreen'));
export const SettingsScreen = lazy(() => import('@/screens/settings/SettingsScreen'));

/**
 * Catálogo de componentes, sólo en desarrollo.
 *
 * Vite sustituye `import.meta.env.DEV` por `false` al compilar, la condición
 * se pliega y Rollup elimina la importación dinámica entera: no se emite
 * ningún chunk suyo en producción (verificado en el reporte de build).
 */
export const KitchenSinkScreen = import.meta.env.DEV
  ? lazy(() => import('@/screens/kitchensink/KitchenSinkScreen'))
  : null;
