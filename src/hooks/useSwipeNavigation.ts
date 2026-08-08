import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS } from '@/constants';

/** Recorrido horizontal mínimo para que cuente como gesto, no como toque. */
const MIN_DISTANCE_PX = 60;

/**
 * Cuánto más horizontal que vertical tiene que ser.
 *
 * Con 2 el gesto tiene que ir a menos de ~27° de la horizontal. Es lo que
 * separa "deslizar de lado" de "desplazar la lista con la mano un poco
 * torcida", que es el falso positivo que arruina este tipo de navegación.
 */
const HORIZONTAL_RATIO = 2;

/** Más lento que esto ya no es un gesto de navegación: es arrastrar mirando. */
const MAX_DURATION_MS = 700;

/** Rutas que participan, en el orden de la barra inferior. */
const TAB_ROUTES: readonly string[] = BOTTOM_NAV_ITEMS.map((item) => item.route);

/**
 * Elementos donde el gesto NO debe empezar.
 *
 * Un deslizamiento que arranca sobre un control es, casi siempre, un intento de
 * usar ese control: mover un campo de texto para colocar el cursor, elegir en
 * un selector, o pulsar un botón con el dedo un poco tembloroso.
 */
const INTERACTIVE = 'button, a, input, select, textarea, [contenteditable], [role="dialog"]';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Deslizar de lado para cambiar de pestaña.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── LA DECISIÓN QUE HACE QUE ESTO NO ROMPA NADA: ES PASIVO ────────────────
 * No llama a `preventDefault()`, no llama a `setPointerCapture()` y no toca
 * `touch-action`. Sólo APUNTA dónde empezó el dedo y mira dónde acabó.
 *
 * Es lo que garantiza que el scroll vertical, las listas, los formularios y
 * cualquier otro gesto sigan comportándose exactamente igual que antes: el
 * navegador nunca se entera de que esto existe. Un swipe que captura el
 * puntero "para poder animar el arrastre" es justo el que acaba comiéndose el
 * scroll de una lista larga.
 *
 * El precio es que no hay arrastre en vivo, sólo el resultado al soltar. Vale
 * la pena: lo otro se paga con el scroll, que se usa cien veces más.
 *
 * ── LAS CUATRO CONDICIONES ────────────────────────────────────────────────
 * 1. Recorrido horizontal ≥ 60 px — un toque tembloroso no navega.
 * 2. |dx| > 2·|dy| — claramente horizontal, no un scroll torcido.
 * 3. Menos de 700 ms — un gesto, no un arrastre pensativo.
 * 4. El mismo puntero de principio a fin.
 *
 * ── DÓNDE NO EMPIEZA ──────────────────────────────────────────────────────
 * · Sobre controles (ver `INTERACTIVE`).
 * · Dentro de algo que se desplaza en horizontal por su cuenta —una gráfica,
 *   una fila de fichas—: ahí el gesto ya significa otra cosa.
 * · Con una hoja abierta. En la práctica el velo lo impide porque cubre el
 *   contenido, pero la comprobación es de una línea y no depende de eso.
 *
 * ── NO DA LA VUELTA AL LLEGAR AL FINAL ────────────────────────────────────
 * Deslizar hacia la izquierda en Reportes (la última) no salta a Inicio. Saltar
 * de un extremo al otro se lee como un fallo, no como una función; y en las
 * pantallas que no son pestañas (detalle de cuenta, Ajustes) no hace nada.
 */
export function useSwipeNavigation(): {
  onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
  onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
  onPointerCancel(): void;
} {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const start = useRef<{ x: number; y: number; time: number; id: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    start.current = null;

    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE)) return;
    if (document.querySelector('[role="dialog"]') !== null) return;

    // Un ancestro que ya se desplaza en horizontal manda sobre el gesto.
    let node: HTMLElement | null = target;
    while (node && node !== event.currentTarget) {
      if (node.scrollWidth > node.clientWidth + 1) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return;
      }
      node = node.parentElement;
    }

    start.current = { x: event.clientX, y: event.clientY, time: Date.now(), id: event.pointerId };
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = start.current;
      start.current = null;
      if (origin === null || origin.id !== event.pointerId) return;

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;

      if (Date.now() - origin.time > MAX_DURATION_MS) return;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;

      const index = TAB_ROUTES.indexOf(pathname);
      // La pantalla actual no es una pestaña: no hay "siguiente" ni "anterior".
      if (index === -1) return;

      // Dedo hacia la izquierda = avanzar, como pasar la página de un libro.
      const direction = dx < 0 ? 1 : -1;
      const next = TAB_ROUTES[index + direction];
      if (next === undefined) return;

      // Se navega con el enrutador de siempre: la barra inferior, el botón
      // Atrás y el historial siguen funcionando porque no hay una segunda
      // navegación en paralelo, sólo otra forma de disparar la de siempre.
      navigate(next, { state: { swipe: direction } });
    },
    [navigate, pathname],
  );

  const onPointerCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
