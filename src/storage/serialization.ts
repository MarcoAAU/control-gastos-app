/**
 * Serialización JSON tolerante a fallos.
 *
 * `JSON.parse` lanza ante una cadena truncada, que es exactamente lo que puede
 * haber en localStorage si el navegador se quedó sin espacio a mitad de una
 * escritura. Un `parse` sin proteger convertiría eso en una pantalla en blanco
 * permanente para el usuario, sin salida.
 */

export function safeParse(raw: string | null): { ok: true; value: unknown } | { ok: false } {
  if (raw === null || raw === '') return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Serializa. Puede lanzar si el objeto tiene ciclos, cosa que no debería
 * ocurrir con `AppData` (es un árbol plano), pero se envuelve igualmente para
 * que un fallo de guardado sea siempre un `StorageError` clasificable.
 */
export function safeStringify(value: unknown): { ok: true; raw: string } | { ok: false } {
  try {
    return { ok: true, raw: JSON.stringify(value) };
  } catch {
    return { ok: false };
  }
}

/** Tamaño aproximado en bytes de una cadena UTF-16 guardada en localStorage. */
export function approximateBytes(raw: string): number {
  // localStorage almacena UTF-16: ~2 bytes por unidad de código. Se usa para
  // avisar antes de llegar al límite de ~5 MB, no para medir con precisión.
  return raw.length * 2;
}
