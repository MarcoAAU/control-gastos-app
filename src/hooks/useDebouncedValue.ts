import { useEffect, useState } from 'react';

/**
 * Devuelve `value` con retraso: sólo se actualiza tras `delayMs` sin cambios.
 *
 * ── DÓNDE VA EL RETRASO, Y POR QUÉ IMPORTA ────────────────────────────────
 * La tentación es retrasar lo que se ESCRIBE (el valor del `<input>`). Eso
 * produce el peor resultado posible: el cuadro de búsqueda va a tirones,
 * porque las letras aparecen 200 ms después de teclearlas. Un campo que no
 * responde al instante se percibe como una app rota.
 *
 * Lo que se retrasa aquí es lo que se CONSUME. El texto se pinta al momento;
 * lo único que espera es el recálculo de la lista filtrada. El usuario ve sus
 * letras al instante y los resultados una fracción de segundo después, que es
 * el orden natural.
 *
 * ── POR QUÉ 200 ms ────────────────────────────────────────────────────────
 * Escribiendo rápido en un móvil salen unas 5 pulsaciones por segundo, así que
 * 200 ms agrupa casi todas las ráfagas sin llegar a sentirse como una espera
 * (por debajo de ~250 ms la respuesta se percibe inmediata). Con 500 ms la
 * lista parecería colgada; sin retraso, cada tecla recorrería todos los
 * movimientos.
 *
 * ── LIMPIEZA ──────────────────────────────────────────────────────────────
 * El `clearTimeout` del efecto no es un detalle: sin él, un temporizador
 * pendiente al desmontar la pantalla haría `setState` sobre un componente que
 * ya no existe.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Si el valor vuelve a ser el que ya estaba publicado no hace falta
    // programar nada: evita un render extra al borrar la búsqueda entera.
    if (Object.is(value, debounced)) return;

    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
    // `debounced` se lee sólo para el cortocircuito de arriba; incluirlo en las
    // dependencias reprogramaría el temporizador al publicar el valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return debounced;
}
