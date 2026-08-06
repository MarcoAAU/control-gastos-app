/**
 * Rutas de la aplicación.
 *
 * Centralizadas para que ningún `<Link>` lleve una cadena escrita a mano: un
 * error de tecleo en una ruta no lo detecta el compilador, sólo el usuario.
 *
 * Se sirven con `HashRouter` (ADR-007): GitHub Pages no tiene fallback de SPA,
 * y el hash mantiene funcionando el APK TWA y el Service Worker sin
 * configuración de servidor.
 */
export const ROUTES = {
  dashboard: '/',
  transactions: '/movimientos',
  accounts: '/cuentas',
  accountDetail: '/cuentas/:accountId',
  tracking: '/seguimiento',
  reports: '/reportes',
  categories: '/categorias',
  history: '/historial',
  historyDetail: '/historial/:entryId',
  settings: '/ajustes',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Construye una ruta con parámetros: `buildPath(ROUTES.accountDetail, { accountId })`. */
export function buildPath(pattern: string, params: Record<string, string>): string {
  return pattern.replace(/:([A-Za-z]+)/g, (match, key: string) => params[key] ?? match);
}

/**
 * Pestañas de la barra inferior, en orden.
 *
 * Cinco es el máximo usable en móvil; Categorías e Historial se alcanzan desde
 * Ajustes y desde el Inicio respectivamente, como en v1.
 */
export const BOTTOM_NAV_ITEMS = [
  { route: ROUTES.dashboard, label: 'Inicio', icon: 'nav-dashboard' },
  { route: ROUTES.transactions, label: 'Movimientos', icon: 'nav-transactions' },
  { route: ROUTES.accounts, label: 'Cuentas', icon: 'nav-accounts' },
  { route: ROUTES.tracking, label: 'Seguimiento', icon: 'nav-tracking' },
  { route: ROUTES.reports, label: 'Reportes', icon: 'nav-reports' },
] as const;
