import type { ReactNode } from 'react';
import { Overlay } from './Overlay';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
  dismissible?: boolean;
}

/**
 * Diálogo centrado, para mensajes cortos que exigen una decisión.
 *
 * Cuándo usar cuál: si el usuario tiene que RELLENAR algo, hoja (`Sheet`); si
 * tiene que DECIDIR algo, diálogo (`Modal`). Centrado interrumpe más, y para
 * una decisión eso es justamente lo que se busca.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  hideClose,
  dismissible,
}: ModalProps) {
  return (
    <Overlay
      variant="modal"
      open={open}
      onClose={onClose}
      {...(title !== undefined ? { title } : {})}
      {...(hideClose !== undefined ? { hideClose } : {})}
      {...(dismissible !== undefined ? { dismissible } : {})}
      {...(footer !== undefined ? { footer } : {})}
    >
      {children}
    </Overlay>
  );
}
