import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 9.
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function HistoryScreen() {
  return (
    <>
      <TopBar title="Historial" icon="nav-history" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-history"
            title="Historial"
            description="Instantáneas guardadas de intervalos. Disponible en la Fase 9."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
