import { Suspense, lazy } from 'react';
import { Button, Card, EmptyState } from '@/components/ui';

/**
 * Punto de entrada de la aplicación.
 *
 * Estructura definitiva (a partir de la Fase 6): providers + router. Hasta
 * entonces muestra el catálogo de primitivos en desarrollo.
 *
 * `import.meta.env.DEV` es una constante que Vite sustituye por `false` al
 * compilar para producción. La condición se pliega y Rollup elimina la
 * importación dinámica entera: el kitchensink NO llega al bundle publicado
 * (verificado en el reporte de build — no se emite ningún chunk suyo).
 */
const KitchenSink = import.meta.env.DEV
  ? lazy(() => import('@/screens/kitchensink/KitchenSinkScreen'))
  : null;

export default function App() {
  if (KitchenSink) {
    return (
      <Suspense fallback={null}>
        <KitchenSink />
      </Suspense>
    );
  }

  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <Card variant="elevated">
        <EmptyState
          icon="nav-dashboard"
          title="Mis Gastos"
          description="Andamiaje v2 — React + Vite + TypeScript. Las pantallas llegan en la Fase 6."
          action={<Button disabled>Próximamente</Button>}
        />
      </Card>
    </main>
  );
}
