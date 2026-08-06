import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { Toast } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import styles from './ToastHost.module.css';

/** Un aviso debe durar lo suficiente para leerlo sin llegar a estorbar. */
const AUTO_DISMISS_MS = 3500;
const ERROR_DISMISS_MS = 6000;

const ICON: Record<Toast['kind'], string> = {
  info: 'info',
  success: 'check',
  error: 'warning',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    // Los errores duran más: casi siempre piden una acción del usuario
    // (exportar una copia, liberar espacio) y 3,5s no dan para leerlos.
    const delay = toast.kind === 'error' ? ERROR_DISMISS_MS : AUTO_DISMISS_MS;
    const timer = setTimeout(() => dismissToast(toast.id), delay);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, dismissToast]);

  return (
    <div
      className={cn(styles.toast, styles[toast.kind])}
      // 'assertive' interrumpe la lectura en curso; se reserva para errores.
      role={toast.kind === 'error' ? 'alert' : 'status'}
      aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
    >
      <Icon
        name={ICON[toast.kind]}
        size="sm"
        className={
          toast.kind === 'error'
            ? styles.iconError
            : toast.kind === 'success'
              ? styles.iconSuccess
              : styles.iconInfo
        }
      />
      <span className={styles.message}>{toast.message}</span>
      <IconButton
        icon="close"
        label="Descartar aviso"
        size="sm"
        onClick={() => dismissToast(toast.id)}
      />
    </div>
  );
}

/**
 * Contenedor de avisos. Se monta una sola vez en el shell.
 *
 * Los toasts viven en `uiSlice`, así que cualquier acción del store puede
 * lanzar uno con `showToast(...)` sin pasar callbacks por el árbol de
 * componentes. En v1 esto era una función global que manipulaba el DOM.
 */
export function ToastHost() {
  const toasts = useAppStore((state) => state.toasts);
  if (toasts.length === 0) return null;

  return createPortal(
    <div className={styles.host}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
