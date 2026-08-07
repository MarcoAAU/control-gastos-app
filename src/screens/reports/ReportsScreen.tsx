import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 17.
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function ReportsScreen() {
  return (
    <>
      <TopBar title="Reportes" icon="nav-reports" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-reports"
            title="Reportes"
            description="Reportes interactivos y exportación. Disponible en la Fase 17."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
