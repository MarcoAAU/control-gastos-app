import { useEffect, useState } from 'react';

/**
 * Mantiene un componente montado mientras dura su animación de salida.
 *
 * Sin esto, `{open && <Sheet/>}` desmonta el nodo al instante y la animación
 * de cierre no llega a verse: la hoja desaparece de golpe. Es lo que hace
 * `AnimatePresence` de Framer Motion, en 30 líneas y sin 15 kB de bundle
 * (ADR-011).
 *
 * ⚠️ NO USA `requestAnimationFrame`.
 *
 * La versión anterior montaba el nodo con una clase y cambiaba a la definitiva
 * en un doble rAF para forzar la transición. Funciona, pero **rAF no se
 * dispara cuando la pestaña no está componiendo fotogramas** (segundo plano,
 * ventana oculta, WebView minimizado). En ese caso el overlay se quedaba
 * montado pero invisible — opacidad 0 o desplazado fuera de pantalla — sin
 * forma de recuperarse. Se detectó al automatizar pruebas con el panel del
 * navegador oculto, y es un fallo real aunque poco frecuente.
 *
 * La entrada la anima ahora el CSS con `animation` sobre el propio montaje,
 * que no depende de que haya fotogramas ni de temporizadores. Aquí sólo queda
 * lo que el CSS no puede hacer: retrasar el desmontaje.
 *
 * @param open       si el contenido debe estar visible
 * @param durationMs duración de la salida; debe coincidir con la del CSS
 */
export function usePresence(
  open: boolean,
  durationMs: number,
): { mounted: boolean; exiting: boolean } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs]);

  return { mounted, exiting: mounted && !open };
}
