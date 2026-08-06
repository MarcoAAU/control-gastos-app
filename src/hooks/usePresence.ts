import { useEffect, useState } from 'react';

export type PresenceState = 'entering' | 'entered' | 'exiting';

/**
 * Mantiene un componente montado mientras dura su animación de salida.
 *
 * Sin esto, `{open && <Sheet/>}` desmonta el nodo al instante y la animación
 * de cierre no llega a verse: la hoja desaparece de golpe. Es lo que hace
 * `AnimatePresence` de Framer Motion, en 30 líneas y sin 15 kB de bundle
 * (ADR-011).
 *
 * @param open       si el contenido debe estar visible
 * @param durationMs duración de la salida; debe coincidir con la del CSS
 */
export function usePresence(
  open: boolean,
  durationMs: number,
): { mounted: boolean; state: PresenceState } {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<PresenceState>(open ? 'entered' : 'exiting');

  useEffect(() => {
    if (open) {
      setMounted(true);
      setState('entering');

      // Doble rAF: el primero deja que el nodo se pinte con la clase de
      // entrada, el segundo cambia a la clase final. Con uno solo el navegador
      // agrupa ambos estilos en el mismo fotograma y no hay transición.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setState('entered'));
      });
      return () => {
        cancelAnimationFrame(outer);
        if (inner) cancelAnimationFrame(inner);
      };
    }

    setState('exiting');
    const timer = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs]);

  return { mounted, state };
}
