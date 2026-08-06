import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 9.
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function SettingsScreen() {
  return (
    <>
      <TopBar title="Ajustes" icon="nav-settings" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-settings"
            title="Ajustes"
            description="Respaldos, tema y preferencias. Disponible en la Fase 9."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
