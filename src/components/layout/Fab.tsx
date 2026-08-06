import { Icon } from '@/components/ui';
import styles from './AppShell.module.css';

export interface FabProps {
  label: string;
  icon?: string;
  onClick: () => void;
}

/**
 * Botón de acción flotante.
 *
 * En v1 estaba anclado con `transform: translateX(200px)` sobre un `right:50%`,
 * un truco que se descolocaba en cuanto la ventana no medía exactamente 480px.
 * Aquí se ancla con `max()` respecto al contenedor centrado: correcto en móvil
 * y en escritorio sin media queries.
 */
export function Fab({ label, icon = 'add', onClick }: FabProps) {
  return (
    <button type="button" className={styles.fab} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size="lg" />
    </button>
  );
}
