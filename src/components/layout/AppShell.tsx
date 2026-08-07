import { Suspense, type ReactNode } from 'react';
import { Skeleton, ToastHost } from '@/components/ui';
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
 */
export function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <main className={styles.main}>
      <StartupBanner />
      {children}
    </main>
  );
}
