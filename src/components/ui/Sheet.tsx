import type { ReactNode } from 'react';
import { Overlay } from './Overlay';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
}

/**
 * Hoja inferior. El contenedor por defecto de formularios y detalles en móvil:
 * aparece desde abajo, al alcance del pulgar, sin tapar el contexto.
 *
 * Sustituye a los `.modal-sheet` de v1, con lo que a aquéllos les faltaba:
 * arrastre para cerrar, atrapado de foco y botón Atrás que cierra la hoja en
 * vez de la aplicación.
 */
export function Sheet({ open, onClose, title, children, footer, dismissible }: SheetProps) {
  return (
    <Overlay
      variant="sheet"
      open={open}
      onClose={onClose}
      {...(title !== undefined ? { title } : {})}
      {...(dismissible !== undefined ? { dismissible } : {})}
      {...(footer !== undefined ? { footer } : {})}
    >
      {children}
    </Overlay>
  );
}
