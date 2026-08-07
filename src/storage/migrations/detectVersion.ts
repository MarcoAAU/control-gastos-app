import { isRecord } from '../validation/coerce';
import { looksLikeLegacyBlob } from '../validation/legacy';

/** Versión 1 = el blob de v1, que no llevaba número de versión. */
export const LEGACY_SCHEMA_VERSION = 1;

/**
 * Deduce la versión de esquema de un documento ya parseado.
 *
 * Devuelve `null` si el valor no es reconocible como datos de esta app — caso
 * en el que el llamador arranca vacío SIN escribir nada, para no pisar algo
 * que quizá sí se pueda recuperar a mano.
 */
export function detectVersion(value: unknown): number | null {
  if (!isRecord(value)) return null;

  const declared = value['schemaVersion'];
  if (typeof declared === 'number' && Number.isInteger(declared) && declared > 0) {
    return declared;
  }

  // Sin campo de versión: sólo puede ser v1, y aun así hay que comprobar que
  // tenga forma de datos nuestros. Un objeto JSON cualquiera no lo es.
  if (looksLikeLegacyBlob(value)) return LEGACY_SCHEMA_VERSION;

  return null;
}
