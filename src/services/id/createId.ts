/**
 * Generación de identificadores.
 *
 * Formato: `<base36 del tiempo><aleatorio>` — el mismo esquema que `uid()` de
 * v1 (`app.js:32-34`). Se conserva a propósito: los ids de v1 sobreviven a la
 * migración sin reescribirse, así que los nuevos deben poder convivir con
 * ellos sin colisionar ni parecer de otra especie.
 *
 * Ordenable por tiempo como efecto secundario útil: el prefijo temporal hace
 * que dos movimientos creados el mismo día se ordenen por creación al
 * desempatar.
 */

const RANDOM_LENGTH = 8;

function randomSuffix(): string {
  // `crypto.getRandomValues` está en todos los navegadores objetivo, pero
  // puede faltar en contextos no seguros o en un runtime de test. El respaldo
  // con Math.random es suficiente: estos ids no son secretos, sólo únicos.
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(RANDOM_LENGTH);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
  }
  return Math.random().toString(36).slice(2, 2 + RANDOM_LENGTH);
}

/** Identificador único para una entidad nueva. */
export function createId(): string {
  return Date.now().toString(36) + randomSuffix();
}

/**
 * Id derivado de un nombre, estable y legible (`"Scotiabank Colpatria"` →
 * `"bank_scotiabank_colpatria"`).
 *
 * Lo usa la migración para los bancos que el usuario escribió a mano: si crea
 * dos cuentas con el mismo banco, ambas deben terminar apuntando al MISMO
 * banco. Con un id aleatorio saldrían dos bancos duplicados con el mismo
 * nombre — que es justo lo que v1 hacía mal.
 */
export function createSlugId(prefix: string, name: string): string {
  const slug = name
    .normalize('NFD')
    // Escape explícito: los diacríticos combinantes escritos literalmente en
    // el fuente son invisibles en el editor y se pierden al copiar el archivo.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${prefix}_${slug || 'sin_nombre'}`;
}
