import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 16.
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function TrackingScreen() {
  return (
    <>
      <TopBar title="Seguimiento" icon="nav-tracking" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-tracking"
            title="Seguimiento"
            description="Diario, semanal, mensual y anual, con comparativas. Disponible en la Fase 16."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
