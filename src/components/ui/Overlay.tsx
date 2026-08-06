import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBackButton } from '@/hooks/useBackButton';
import { useDragDismiss } from '@/hooks/useDragDismiss';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { usePresence } from '@/hooks/usePresence';
import { cn } from '@/utils/cn';
import { IconButton } from './IconButton';
import styles from './Overlay.module.css';

/** Debe coincidir con --motion-duration-medium de tokens.css. */
const EXIT_DURATION_MS = 250;

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  variant: 'sheet' | 'modal';
  title?: string;
  /** Oculta el botón de cerrar (diálogos que exigen elegir una opción). */
  hideClose?: boolean;
  /** Impide cerrar tocando fuera o con Escape. Para acciones destructivas. */
  dismissible?: boolean;
  children: ReactNode;
  /** Fila de botones fija al pie, fuera del área con scroll. */
  footer?: ReactNode;
}

/**
 * Base de todos los overlays. No se exporta en el barril: se usa a través de
 * `Sheet`, `Modal` y `ConfirmDialog`.
 *
 * Concentra en un solo sitio todo lo que v1 no tenía (auditoría §12 y Medio
 * #9) y que es fácil olvidar si cada modal se escribe a mano:
 *  · `role="dialog"` + `aria-modal` + título asociado
 *  · atrapado de foco y devolución al cerrar
 *  · cierre con Escape
 *  · el botón Atrás de Android cierra el overlay, NO la app
 *  · bloqueo del scroll de fondo
 *  · animación de salida real (el nodo sigue montado mientras dura)
 *  · arrastrar hacia abajo para cerrar, en las hojas
 */
export function Overlay({
  open,
  onClose,
  variant,
  title,
  hideClose = false,
  dismissible = true,
  children,
  footer,
}: OverlayProps) {
  const { mounted, state } = usePresence(open, EXIT_DURATION_MS);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const visible = state === 'entered';

  const isSheet = variant === 'sheet';
  const drag = useDragDismiss(onClose);

  useFocusTrap(panelRef, mounted && open);
  useBackButton(open, onClose);

  // Bloquea el scroll del fondo. Sin esto, deslizar sobre el velo mueve la
  // página de detrás y al cerrar el overlay el usuario aparece en otro sitio.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismissible, onClose]);

  if (!mounted) return null;

  const panelStyle =
    isSheet && drag.offsetY > 0 ? { transform: `translateY(${drag.offsetY}px)` } : undefined;

  return createPortal(
    <div
      className={cn(
        styles.scrim,
        isSheet ? styles.scrimSheet : styles.scrimModal,
        visible && styles.scrimVisible,
      )}
      onClick={dismissible ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(title ? { 'aria-labelledby': titleId } : {})}
        tabIndex={-1}
        className={cn(
          styles.panel,
          isSheet ? styles.panelSheet : styles.panelModal,
          visible && (isSheet ? styles.panelVisibleSheet : styles.panelVisibleModal),
          drag.dragging && styles.panelDragging,
        )}
        style={panelStyle}
        // Sin esto, tocar dentro del panel cerraría el overlay: el clic
        // burbujearía hasta el velo.
        onClick={(event) => event.stopPropagation()}
      >
        {isSheet && (
          <div className={styles.grabArea} {...drag.handlers}>
            <div className={styles.handle} aria-hidden="true" />
          </div>
        )}

        {(title || !hideClose) && (
          <div className={cn(styles.header, !isSheet && styles.modalHeader)}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {!hideClose && <IconButton icon="close" label="Cerrar" onClick={onClose} />}
          </div>
        )}

        <div className={styles.body} data-sheet-scroll>
          {children}
        </div>

        {footer && <div className={styles.actions}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
