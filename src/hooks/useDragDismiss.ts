import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** Píxeles arrastrados a partir de los cuales se cierra al soltar. */
const DISMISS_THRESHOLD_PX = 100;

/**
 * Arrastrar hacia abajo para cerrar una hoja inferior.
 *
 * Es el gesto que la gente espera de una bottom sheet en móvil; sin él hay que
 * apuntar a una X pequeña en la esquina. v1 no lo tenía.
 *
 * Detalles que importan:
 * · Sólo permite arrastrar hacia ABAJO (`Math.max(0, …)`). Hacia arriba la
 *   hoja se quedaría flotando separada del borde inferior.
 * · Ignora el gesto si empieza sobre contenido con scroll ya desplazado: si
 *   no, deslizar para leer una lista larga cerraría la hoja sin querer.
 * · Usa Pointer Events, que cubren dedo, ratón y lápiz con un solo código.
 */
export function useDragDismiss(onDismiss: () => void): {
  offsetY: number;
  dragging: boolean;
  handlers: {
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
    onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
    onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
    onPointerCancel(event: ReactPointerEvent<HTMLElement>): void;
  };
} {
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const scroller = (event.target as HTMLElement).closest('[data-sheet-scroll]');
    if (scroller && scroller.scrollTop > 0) return;

    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setOffsetY(Math.max(0, event.clientY - startY.current));
    },
    [dragging],
  );

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const travelled = Math.max(0, event.clientY - startY.current);
      setOffsetY(0);
      if (travelled > DISMISS_THRESHOLD_PX) onDismiss();
    },
    [dragging, onDismiss],
  );

  return {
    offsetY,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
