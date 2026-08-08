import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { IconButton } from '@/components/ui';
import { useAppStore } from '@/store';
import { refreshFromStorage } from '@/store/refresh';
import { cn } from '@/utils/cn';
import styles from './AppShell.module.css';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Las dos acciones que acompañan a TODA pestaña principal.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Antes, refrescar y entrar en Ajustes sólo existían en el Inicio, y el botón
 * de refrescar estaba escrito DENTRO de `DashboardScreen`. Repetirlo en siete
 * pantallas habría dejado siete copias que se desincronizan a la primera
 * corrección; por eso es un componente y se pasa entero como
 * `<TopBar actions={<ScreenActions />} />`.
 *
 * Al vivir en la barra superior, la posición, el tamaño, los iconos y el
 * comportamiento son idénticos en todas las pantallas sin que ninguna tenga
 * que acordarse de nada.
 */
export function ScreenActions() {
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh(): Promise<void> {
    // Dos toques seguidos no lanzan dos lecturas: la segunda encontraría el
    // estado a medio reemplazar por la primera.
    if (refreshing) return;
    setRefreshing(true);

    const outcome = await refreshFromStorage();

    if (outcome === 'error') {
      showToast('No se pudieron releer los datos. Lo que ves sigue siendo válido.', 'error');
    } else if (outcome === 'ok') {
      showToast('Datos actualizados.', 'success');
    }

    setRefreshing(false);
  }

  return (
    <>
      <IconButton
        icon="refresh"
        label="Actualizar datos"
        onClick={handleRefresh}
        disabled={refreshing}
        // El icono gira mientras dura la lectura. En un dispositivo rápido casi
        // no se ve, y está bien: lo que no puede pasar es que el usuario toque
        // y no ocurra nada visible.
        className={cn(refreshing && styles.refreshing)}
      />
      <IconButton
        icon="nav-settings"
        label="Ajustes"
        onClick={() => navigate(ROUTES.settings)}
      />
    </>
  );
}
