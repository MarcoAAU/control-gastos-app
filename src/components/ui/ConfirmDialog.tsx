import { Button } from './Button';
import { Modal } from './Modal';
import styles from './Overlay.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta la confirmación en rojo. Para borrados y acciones irreversibles. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación dentro de la app.
 *
 * ⚠️ NUNCA USAR `window.confirm()`. Las PWA instaladas en iOS Safari lo
 * deshabilitan en silencio: el usuario tocaba "Eliminar" y no pasaba nada.
 * Fue un fallo real y reportado de v1 ("no puedo eliminar cuentas
 * conectadas"), corregido en el commit `8421858`. Está anotado como nota 2 del
 * checklist de regresión precisamente para que v2 no vuelva a caer ahí.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      hideClose
      footer={
        <>
          {/* Cancelar va primero: es la salida segura y la que debe quedar
              bajo el pulgar por defecto. */}
          <Button variant="tonal" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'filled'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={styles.description}>{message}</p>
    </Modal>
  );
}
