import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 7 (paridad) y Fase 13 (campos nuevos).
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function TransactionsScreen() {
  return (
    <>
      <TopBar title="Movimientos" icon="nav-transactions" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-transactions"
            title="Movimientos"
            description="Alta, edición, duplicado y filtros de movimientos. Disponible en la Fase 7 (paridad) y Fase 13 (campos nuevos)."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
