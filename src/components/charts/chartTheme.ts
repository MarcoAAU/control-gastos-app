/**
 * Colores y medidas compartidos por las gráficas.
 *
 * ── POR QUÉ SON CADENAS `var(--token)` Y NO VALORES CALCULADOS ────────────
 * Recharts pinta SVG, y los atributos `fill`/`stroke` de SVG aceptan
 * `var(--color-x)` igual que el CSS. Eso significa que las gráficas **siguen
 * al tema automáticamente**: al alternar claro/oscuro (Fase 18) se repintan
 * solas, sin volver a renderizar React ni recalcular nada.
 *
 * La alternativa —leer los tokens con `getComputedStyle` y pasarlos como
 * literales— obligaría a suscribirse al cambio de tema y a re-renderizar todas
 * las gráficas, que es trabajo y una fuente de bugs a cambio de nada.
 *
 * ⚠️ EXCEPCIÓN: los colores de CATEGORÍA no salen de aquí. Son un dato que
 * elige el usuario y se guardan dentro de la entidad, así que se pasan como
 * hex literal. Ver `PALETTE` en constants/palette.ts.
 */

export const CHART_COLORS = {
  expense: 'var(--color-primary)',
  income: 'var(--color-success)',
  grid: 'var(--color-outline-variant)',
  axis: 'var(--color-on-surface-variant)',
  /** Relleno del agujero de la dona: debe ser el fondo real de la tarjeta. */
  hole: 'var(--color-surface-container)',
} as const;

/**
 * Alturas fijas, en píxeles.
 *
 * ⚠️ TIENEN QUE SER FIJAS. `ResponsiveContainer` con altura en porcentaje
 * dentro de un contenedor sin altura definida colapsa a 0 y la gráfica no se
 * ve — es el fallo más habitual al usar Recharts, y no da ningún error.
 */
export const CHART_HEIGHT = {
  donut: 200,
  bars: 160,
} as const;

/** Margen interior. Sin él, las etiquetas de los ejes se recortan. */
export const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 8 } as const;

export const AXIS_TICK = {
  fill: CHART_COLORS.axis,
  fontSize: 11,
} as const;
