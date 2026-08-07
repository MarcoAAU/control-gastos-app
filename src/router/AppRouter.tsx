import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { AppShell } from '@/components/layout';
import {
  AccountDetailScreen,
  AccountsScreen,
  CategoriesScreen,
  DashboardScreen,
  HistoryScreen,
  KitchenSinkScreen,
  ReportsScreen,
  SettingsScreen,
  TrackingScreen,
  TransactionsScreen,
} from './LazyRoutes';

/**
 * Enrutado de la aplicación.
 *
 * ── POR QUÉ AHORA SÍ HACE FALTA UN ROUTER (ADR-007) ───────────────────────
 * v1 cambiaba de vista poniendo y quitando la clase `.hidden`, con la pestaña
 * activa guardada en una variable. Consecuencias reales:
 *  · el botón Atrás de Android CERRABA la aplicación,
 *  · recargar siempre volvía al Inicio,
 *  · no existían enlaces profundos ni a una cuenta ni a un historial.
 * Con historial real, Atrás navega, recargar conserva el sitio y una URL
 * identifica una pantalla.
 *
 * ── POR QUÉ HashRouter Y NO BrowserRouter ─────────────────────────────────
 * GitHub Pages no tiene reescritura de rutas: entrar directo a
 * `/control-gastos-app/cuentas` devolvería un 404 real. Con hash
 * (`.../#/cuentas`) el servidor siempre sirve `index.html`, y además el
 * Service Worker y el APK TWA siguen funcionando sin configuración extra.
 *
 * ── LO QUE NO ES UNA RUTA ─────────────────────────────────────────────────
 * Los modales y las hojas NO son rutas: son estado de `uiSlice`. Convertirlos
 * en rutas obligaría a serializar en la URL el formulario a medio rellenar, y
 * un enlace compartido abriría un formulario vacío en un estado sin sentido.
 * El botón Atrás igualmente los cierra, vía `useBackButton`.
 */
export function AppRouter() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path={ROUTES.dashboard} element={<DashboardScreen />} />
          <Route path={ROUTES.transactions} element={<TransactionsScreen />} />
          <Route path={ROUTES.accounts} element={<AccountsScreen />} />
          <Route path={ROUTES.accountDetail} element={<AccountDetailScreen />} />
          <Route path={ROUTES.tracking} element={<TrackingScreen />} />
          <Route path={ROUTES.reports} element={<ReportsScreen />} />
          <Route path={ROUTES.categories} element={<CategoriesScreen />} />
          <Route path={ROUTES.history} element={<HistoryScreen />} />
          <Route path={ROUTES.historyDetail} element={<HistoryScreen />} />
          <Route path={ROUTES.settings} element={<SettingsScreen />} />
          {KitchenSinkScreen && (
            <Route path="/__kitchensink" element={<KitchenSinkScreen />} />
          )}
          {/* Una ruta desconocida (un enlace viejo, un hash mal copiado) lleva
              al Inicio en vez de a una pantalla en blanco. */}
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
