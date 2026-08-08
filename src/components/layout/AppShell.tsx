import { Suspense, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Skeleton, ToastHost } from '@/components/ui';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { cn } from '@/utils/cn';
import { BottomNav } from './BottomNav';
import { StartupBanner } from './StartupBanner';
import styles from './AppShell.module.css';

/**
 * Armazón común de todas las pantallas: barra superior (la pone cada
 * pantalla), contenido, navegación inferior y avisos.
 *
 * La barra inferior vive AQUÍ y no dentro de cada pantalla: así no se
 * desmonta al navegar, la píldora del indicador puede animarse entre pestañas
 * y no parpadea en cada cambio de ruta.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      <BottomNav />
      <ToastHost />
    </div>
  );
}

/**
 * Esqueleto mientras carga el chunk de una pantalla.
 *
 * Es una silueta de la pantalla, no un spinner: mantiene la altura y evita que
 * el contenido salte al llegar. En una red lenta un spinner centrado se
 * percibe como más lento aunque tarde lo mismo.
 */
export function RouteFallback() {
  return (
    <main className={styles.main} aria-busy="true" aria-label="Cargando">
      <Skeleton variant="rect" height={44} />
      <div style={{ height: 'var(--space-4)' }} />
      <Skeleton variant="rect" height={96} />
      <div style={{ height: 'var(--space-3)' }} />
      <Skeleton variant="rect" height={72} count={3} />
    </main>
  );
}

/**
 * Contenedor del contenido de una pantalla. Aplica los márgenes y el hueco
 * inferior para que la barra fija no tape el último elemento de una lista —
 * un detalle que en v1 había que recordar en cada vista.
 *
 * ── POR QUÉ LA TRANSICIÓN VIVE AQUÍ Y NO ALREDEDOR DE `<Routes>` ──────────
 * Lo natural sería envolver todo el enrutado, pero la animación usa
 * `transform`, y un elemento transformado se convierte en el bloque contenedor
 * de sus descendientes `position: fixed`. El FAB es fixed: envolviendo la
 * pantalla entera, durante los 200 ms de la animación se anclaría al fondo del
 * CONTENIDO —que en una lista larga está muy por debajo de la pantalla— y
 * volvería de un salto al terminar.
 *
 * Animando sólo `<main>`, el FAB y la barra superior quedan fuera: no se
 * mueven. Que la cabecera se quede quieta mientras el contenido entra es
 * además lo que hace una app nativa.
 *
 * ── EL SALTO AL PRINCIPIO NO ES UN EXTRA ──────────────────────────────────
 * Sin él, ir de una lista de movimientos con scroll a una pantalla corta deja
 * la ventana desplazada y la nueva pantalla aparece en blanco. Se omite al
 * volver con Atrás (`POP`): ahí el usuario espera reencontrar el sitio donde
 * estaba, no el principio.
 */
export function ScreenContainer({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { pathname } = location;
  const navigationType = useNavigationType();
  const swipe = useSwipeNavigation();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  /**
   * La entrada se anima según de dónde viene.
   *
   * La dirección viaja en el estado de la navegación, no en una variable de
   * módulo: así el botón Atrás y el historial la conservan, y no hay estado
   * global que pueda quedarse desfasado si dos navegaciones se pisan.
   *
   * Sin esto, deslizar hacia la izquierda haría entrar la pantalla desde
   * ABAJO —la animación por defecto—, que contradice al dedo. Al tocar la
   * barra inferior no hay dirección y se mantiene la entrada vertical, que es
   * lo que corresponde a un salto sin lateralidad.
   */
  const direction = (location.state as { swipe?: number } | null)?.swipe;

  return (
    // `key` reinicia la animación de entrada al cambiar de ruta. Hace falta
    // porque dos rutas pueden compartir componente (historial y su detalle):
    // sin remontar, React reutilizaría el nodo y la animación no volvería a
    // dispararse.
    <main
      key={pathname}
      className={cn(
        styles.main,
        direction === 1 ? styles.enterFromRight : direction === -1 ? styles.enterFromLeft : styles.enter,
      )}
      {...swipe}
    >
      <StartupBanner />
      {children}
    </main>
  );
}
