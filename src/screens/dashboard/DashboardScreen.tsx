import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 9 (paridad) y Fase 15 (rediseño).
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function DashboardScreen() {
  return (
    <>
      <TopBar title="Inicio" icon="nav-dashboard" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-dashboard"
            title="Inicio"
            description="Resumen financiero, indicadores y gráficos. Disponible en la Fase 9 (paridad) y Fase 15 (rediseño)."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
