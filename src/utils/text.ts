/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Normalización de texto para búsquedas.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── POR QUÉ NO BASTA CON `.toLowerCase()` ─────────────────────────────────
 * La app es en español y se usa en un móvil. Escribir "café", "cumpleaños" o
 * "Bogotá" con su tilde exige cambiar de teclado o mantener pulsada la tecla:
 * nadie lo hace mientras busca. Con una comparación literal, buscar "cafe" no
 * encontraría "Café" y el usuario concluiría que el movimiento se perdió.
 *
 * `NFD` descompone cada letra acentuada en letra + tilde suelta, y el rango
 * `U+0300–U+036F` es justamente el bloque de esas tildes: quitarlo deja el
 * texto sin acentos. Es la forma estándar de hacerlo sin una tabla a mano.
 *
 * ── EFECTO COLATERAL ACEPTADO: LA Ñ ───────────────────────────────────────
 * "ñ" también se descompone (n + tilde), así que "año" y "ano" se vuelven el
 * mismo término al buscar. En español son letras distintas, pero aquí sólo
 * afecta a BUSCAR, nunca a guardar: el dato original no se toca. El resultado
 * es una búsqueda más indulgente —"nino" encuentra "niño"— que es exactamente
 * lo que se quiere de un cuadro de búsqueda.
 */
export function normalizeText(value: string): string {
  // El rango va escrito con escapes (`\u0300-\u036f`) y no con los
  // caracteres literales: son marcas combinantes, invisibles en el editor, y
  // cualquier herramienta que reescriba el archivo podría comérselas sin que
  // se note.
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Trocea la consulta en palabras normalizadas.
 *
 * Buscar por palabras sueltas en vez de por la cadena entera permite que
 * "taxi aeropuerto" encuentre "Taxi al aeropuerto" — con la cadena literal no
 * lo haría, porque en medio hay un "al". También hace que el orden dé igual:
 * "aeropuerto taxi" encuentra lo mismo. Las palabras se combinan con Y (todas
 * deben aparecer); con O, teclear una segunda palabra AMPLIARÍA los resultados
 * en vez de acotarlos, que es justo lo contrario de lo que espera quien sigue
 * escribiendo para afinar.
 */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeText(query).trim();
  if (normalized === '') return [];
  return normalized.split(/\s+/);
}
