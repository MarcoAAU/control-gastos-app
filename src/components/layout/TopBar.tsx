import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import styles from './AppShell.module.css';

export interface TopBarProps {
  title: string;
  /** Icono decorativo a la izquierda del título. */
  icon?: string;
  /** Botones de acción a la derecha (refrescar, ajustes…). */
  actions?: ReactNode;
}

export function TopBar({ title, icon, actions }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarTitle}>
        {icon && <Icon name={icon} size="lg" />}
        <h1>{title}</h1>
      </div>
      {actions && <div className={styles.topbarActions}>{actions}</div>}
    </header>
  );
}
