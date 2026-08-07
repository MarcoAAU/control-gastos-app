import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS } from '@/constants';
import { Icon } from '@/components/ui';
import { cn } from '@/utils/cn';
import styles from './AppShell.module.css';

/**
 * Barra de navegación inferior.
 *
 * Usa `NavLink` y no botones con estado propio: así la pestaña activa la
 * decide la URL, no una variable. Es lo que permite que el botón Atrás, un
 * enlace profundo o recargar la página lleven al sitio correcto — nada de eso
 * funcionaba en v1, donde la vista activa era una variable en memoria.
 */
export function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="Navegación principal">
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.route}
          to={item.route}
          // `end` sólo en Inicio: sin él, "/" quedaría activo en todas las
          // rutas porque todas empiezan por "/".
          end={item.route === '/'}
          className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}
        >
          <span className={styles.navIndicator} aria-hidden="true" />
          <Icon name={item.icon} size="md" className={styles.navIcon} />
          <span className={styles.navLabel}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
