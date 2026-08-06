import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 8 (paridad) y Fase 12 (gestor completo).
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function AccountsScreen() {
  return (
    <>
      <TopBar title="Cuentas" icon="nav-accounts" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-accounts"
            title="Cuentas"
            description="Cuentas, bancos y ajuste de saldo. Disponible en la Fase 8 (paridad) y Fase 12 (gestor completo)."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
