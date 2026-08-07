import { Button, Icon } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/utils/cn';
import styles from './AppShell.module.css';

/**
 * Avisos de arranque y de persistencia.
 *
 * Aquí aparecen los mensajes de la migración ("se descartó X", "se movió Y a
 * Sin asignar") y el aviso de que no se está pudiendo guardar.
 *
 * Es la contrapartida visible del trabajo de la Fase 4: de nada sirve que la
 * migración anote incidencias con detalle si el usuario nunca las ve. Y el
 * error de guardado es exactamente lo que faltaba en v1, donde un fallo de
 * escritura era invisible.
 */
export function StartupBanner() {
  const warnings = useAppStore((state) => state.startupWarnings);
  const dismiss = useAppStore((state) => state.dismissStartupWarnings);
  const persistenceError = useAppStore((state) => state.persistenceError);

  if (persistenceError) {
    return (
      <div className={cn(styles.banner, styles.bannerError)} role="alert">
        <Icon name="warning" size="md" />
        <div className={styles.bannerBody}>{persistenceError}</div>
      </div>
    );
  }

  if (warnings.length === 0) return null;

  return (
    <div className={styles.banner} role="status">
      <Icon name="info" size="md" />
      <div className={styles.bannerBody}>
        <strong>Se actualizó el formato de tus datos.</strong>
        <ul className={styles.bannerList}>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        <Button variant="text" size="sm" onClick={dismiss}>
          Entendido
        </Button>
      </div>
    </div>
  );
}
