import { useEffect, useRef } from 'react';

/**
 * Hace que el botón Atrás de Android cierre el overlay en vez de la app.
 *
 * ── EL PROBLEMA REAL ──────────────────────────────────────────────────────
 * En v1 (hallazgo de la auditoría §12) los modales eran divs que se mostraban
 * y ocultaban sin tocar el historial. Con un modal abierto, el botón Atrás del
 * teléfono **cerraba la aplicación entera** — el usuario perdía lo que estaba
 * escribiendo. Es de los fallos que peor se sienten en una PWA instalada,
 * porque una app nativa nunca se comporta así.
 *
 * ── LA SOLUCIÓN ───────────────────────────────────────────────────────────
 * Al abrir un overlay se empuja una entrada al historial. Atrás consume esa
 * entrada, dispara `popstate` y aquí se cierra el overlay: la app no se va a
 * ninguna parte. Si el overlay se cierra por otra vía (la X, tocar fuera), se
 * retira esa entrada para no dejar basura en el historial.
 *
 * Se usa `pushState` con la MISMA url: el hash no cambia, así que el router no
 * navega. El overlay es estado de interfaz, no una ruta (ADR-007).
 */
export function useBackButton(active: boolean, onBack: () => void): void {
  // Ref para que cambiar el callback no vuelva a empujar una entrada.
  const callbackRef = useRef(onBack);
  callbackRef.current = onBack;

  useEffect(() => {
    if (!active) return;

    const marker = { __overlay: true };
    window.history.pushState(marker, '');
    let consumed = false;

    const handlePopState = (): void => {
      consumed = true;
      callbackRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Si el cierre NO vino del botón Atrás, la entrada sigue ahí y hay que
      // retirarla; si no, el usuario tendría que pulsar Atrás dos veces para
      // salir de la pantalla.
      if (!consumed) window.history.back();
    };
  }, [active]);
}
