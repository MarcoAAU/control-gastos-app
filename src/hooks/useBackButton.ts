import { useEffect, useRef } from 'react';

/**
 * Hace que el botón Atrás de Android cierre el overlay en vez de la app.
 *
 * ── EL PROBLEMA ORIGINAL ──────────────────────────────────────────────────
 * En v1 (auditoría §12) los modales eran divs que se mostraban y ocultaban sin
 * tocar el historial. Con un modal abierto, Atrás **cerraba la aplicación
 * entera** y el usuario perdía lo que estaba escribiendo.
 *
 * ── POR QUÉ NO BASTA CON "empujar al abrir, retroceder al cerrar" ─────────
 * `history.back()` es ASÍNCRONO. En el relevo hoja → diálogo (pulsar
 * "Eliminar" en la hoja de acciones abre la confirmación), la hoja llama a
 * `back()` al cerrarse y el diálogo empuja su entrada acto seguido; cuando
 * por fin llega el `popstate` del `back()`, consume la entrada del DIÁLOGO y
 * lo cerraría solo: la confirmación aparecería y se cancelaría sola sin que
 * nadie la toque.
 *
 * Intentar arbitrar esa carrera con banderas es frágil, porque depende del
 * orden en que React ejecuta limpiezas y efectos.
 *
 * ⚠️ LIMITACIÓN CONOCIDA — regla de uso de la app
 * Aunque la reconciliación de abajo mitiga el problema, la secuencia "cerrar
 * un overlay y abrir otro en el mismo gesto" sigue siendo frágil: depende de
 * cuándo decida React ejecutar cada fase de efectos, y eso no está bajo
 * nuestro control.
 *
 * Por eso la app EVITA ese patrón por diseño: nunca se encadenan dos
 * overlays. Cuando hace falta confirmar algo que empieza dentro de una hoja,
 * la confirmación se muestra COMO UN PASO DENTRO DE LA MISMA HOJA (ver
 * `TransactionsScreen`), no como un diálogo encima. Además de eliminar la
 * carrera, en móvil se ve mejor: un solo panel en vez de dos velos apilados.
 *
 * ── LA SOLUCIÓN: RECONCILIAR, NO REACCIONAR ──────────────────────────────
 * Los efectos NO tocan el historial. Sólo apuntan o quitan su overlay de una
 * pila y piden una reconciliación. Ésta corre UNA vez por tanda, cuando los
 * efectos del commit ya terminaron, y se limita a igualar dos números:
 *
 *     deseado = ¿hay algún overlay abierto? (0 o 1 entradas)
 *     real    = entradas que hemos empujado nosotros
 *
 * En el relevo hoja → diálogo ambos valen 1 antes y después, así que **no se
 * ejecuta ninguna operación de historial** y la carrera desaparece por
 * construcción, no por temporización.
 */

interface OverlayEntry {
  id: number;
  onBack: () => void;
}

/** Overlays abiertos. El último es el que responde a Atrás (LIFO). */
const overlayStack: OverlayEntry[] = [];

/** Entradas de historial nuestras. Invariante: 0 o 1. */
let actualEntries = 0;

/** `popstate` provocados por nuestro propio `back()`, aún sin llegar. */
let pendingSelfPop = 0;

let reconcileScheduled = false;
let nextId = 1;
let listening = false;

let removalScheduled = false;

function reconcile(): void {
  reconcileScheduled = false;
  const desired = overlayStack.length > 0 ? 1 : 0;
  if (desired === actualEntries) return;

  // AÑADIR es seguro e inmediato: si sobra una entrada, `reconcile` la
  // retirará después; mientras tanto Atrás sigue cerrando el overlay.
  if (desired > actualEntries) {
    window.history.pushState({ __overlay: true }, '');
    actualEntries = 1;
    return;
  }

  // ⚠️ RETIRAR es la dirección peligrosa y por eso se aplaza otro tick.
  //
  // React puede desmontar los efectos del overlay saliente y montar los del
  // entrante en TAREAS DISTINTAS, y no controlamos cuáles. Retirar la entrada
  // en ese hueco dejaría al overlay entrante sin la suya, y el `popstate`
  // resultante lo cerraría solo.
  //
  // Con un tick extra y una RE-COMPROBACIÓN, el overlay entrante ya está en la
  // pila y la retirada simplemente no ocurre. Si de verdad no queda nada
  // abierto, se retira y el historial queda limpio.
  if (removalScheduled) return;
  removalScheduled = true;
  setTimeout(() => {
    removalScheduled = false;
    if (overlayStack.length > 0 || actualEntries === 0) return;
    pendingSelfPop++;
    // `actualEntries` se pone a 0 al llegar el `popstate`, no aquí: hasta
    // entonces la entrada sigue existiendo de verdad.
    window.history.back();
  }, 0);
}

function scheduleReconcile(): void {
  if (reconcileScheduled) return;
  reconcileScheduled = true;
  // ⚠️ setTimeout y NO queueMicrotask, aunque parezca excesivo.
  //
  // React desmonta y monta los efectos de un commit en DOS fases
  // (`commitPassiveUnmountEffects` y `commitPassiveMountEffects`) y puede
  // ceder el hilo entre ambas. Un microtask se cuela justo en ese hueco: vería
  // la pila ya vacía por la limpieza de la hoja pero todavía sin el diálogo, y
  // retiraría la entrada que el diálogo necesita — exactamente el fallo que
  // esto viene a evitar.
  //
  // Un tick de retraso es imperceptible: nadie puede pulsar Atrás en ese
  // intervalo.
  setTimeout(reconcile, 0);
}

function handlePopState(): void {
  // El navegador ya consumió la entrada, viniera de donde viniera.
  actualEntries = 0;

  if (pendingSelfPop > 0) {
    // Lo provocamos nosotros al cerrar: no debe cerrar ningún otro overlay.
    pendingSelfPop--;
  } else {
    const top = overlayStack.pop();
    if (top) top.onBack();
  }

  // Si quedan overlays abiertos hay que reponer la entrada, para que el
  // siguiente Atrás los cierre a ellos en vez de salir de la pantalla.
  scheduleReconcile();
}

function ensureListening(): void {
  if (listening) return;
  window.addEventListener('popstate', handlePopState);
  listening = true;
}

export function useBackButton(active: boolean, onBack: () => void): void {
  // Ref para que redefinir el callback en cada render no reinicie el efecto:
  // eso pediría una reconciliación por render.
  const callbackRef = useRef(onBack);
  callbackRef.current = onBack;

  useEffect(() => {
    if (!active) return;

    const id = nextId++;
    overlayStack.push({ id, onBack: () => callbackRef.current() });
    ensureListening();
    scheduleReconcile();

    return () => {
      const index = overlayStack.findIndex((entry) => entry.id === id);
      // Ausente = ya lo cerró `handlePopState`.
      if (index !== -1) overlayStack.splice(index, 1);
      scheduleReconcile();
    };
  }, [active]);
}
