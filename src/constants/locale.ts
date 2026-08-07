/**
 * Configuración regional. La app es de un usuario colombiano y el formato de
 * moneda ya estaba fijado en v1 (`app.js:39-42`: `toLocaleString('es-CO')`).
 */

export const LOCALE = 'es-CO';

export const CURRENCY = 'COP';

export const CURRENCY_SYMBOL = '$';

/**
 * La semana empieza en lunes. Convenio en Colombia y el que ya usaba v1 al
 * agrupar por semana. Cambiarlo desplazaría todos los resúmenes semanales.
 */
export const WEEK_STARTS_ON = 1 as const;

/**
 * El peso colombiano no usa céntimos en la práctica: v1 redondeaba con
 * `Math.round()` en cada importe. Se mantiene para que las cifras migradas
 * coincidan exactamente con las que el usuario ya veía.
 */
export const AMOUNT_DECIMALS = 0;

/** Separador de columnas del CSV (Fase 17). Excel en es-CO espera `;`. */
export const CSV_DELIMITER = ';';
