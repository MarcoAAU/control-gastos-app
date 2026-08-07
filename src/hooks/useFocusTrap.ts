import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Encierra el foco del teclado dentro de un overlay abierto.
 *
 * Resuelve el hallazgo Medio #9 de la auditoría: en v1 los modales no
 * atrapaban el foco, así que tabulando se salía a los botones de detrás — que
 * seguían siendo pulsables aunque estuvieran visualmente tapados. Para quien
 * navega con teclado o lector de pantalla, el modal simplemente no existía.
 *
 * Al cerrar devuelve el foco al elemento que abrió el overlay, que es lo que
 * espera cualquiera: no perder el sitio.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Foco inicial en el propio contenedor y no en el primer botón: si el
    // primer control fuese "Eliminar", abrir la hoja lo dejaría pre-enfocado y
    // un Enter accidental borraría algo.
    container.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const current = document.activeElement;

      if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [ref, active]);
}
