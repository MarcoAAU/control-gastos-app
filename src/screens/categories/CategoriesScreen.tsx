import { ScreenContainer, TopBar } from '@/components/layout';
import { Card, EmptyState } from '@/components/ui';

/**
 * Marcador de posición. La pantalla real llega en la Fase 11.
 *
 * Existe desde la Fase 6 para que la navegación, el historial del
 * navegador y el botón Atrás sean reales y verificables antes de tener
 * contenido — no un maquetado que luego haya que recablear.
 */
export default function CategoriesScreen() {
  return (
    <>
      <TopBar title="Categorías" icon="nav-categories" />
      <ScreenContainer>
        <Card padding="none">
          <EmptyState
            icon="nav-categories"
            title="Categorías"
            description="Categorías y subcategorías del usuario. Disponible en la Fase 11."
          />
        </Card>
      </ScreenContainer>
    </>
  );
}
