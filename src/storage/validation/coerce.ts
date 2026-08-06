/**
 * Coerciones defensivas.
 *
 * FILOSOFÍA: estas funciones NUNCA lanzan. Reciben `unknown` (lo que salga de
 * `JSON.parse`) y devuelven siempre un valor del tipo pedido, cayendo a un
 * valor por defecto si el dato está mal.
 *
 * El motivo es concreto: los datos de entrada son el localStorage real de un
 * usuario, escrito por tres versiones distintas de una app que no validaba
 * nada. Un único campo corrupto NO puede impedir que se recuperen los otros
 * 400 movimientos buenos. Por eso se coacciona registro a registro y se anota
 * la incidencia, en lugar de validar todo o nada.
 *
 * Deliberadamente sin Zod: son seis funciones de dos líneas y son, literalmente,
 * la lógica defensiva de la migración. Una dependencia de 12 kB no las mejora.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  // Los números se aceptan porque un id podría haberse guardado sin comillas.
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

/** Número finito. Rechaza `NaN`, `Infinity`, `null`, texto y objetos. */
export function asFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Importe de un movimiento: finito y estrictamente positivo.
 *
 * Devuelve `null` en vez de un valor por defecto porque aquí NO hay defecto
 * razonable: un movimiento de importe desconocido no es un movimiento de $0,
 * es un dato irrecuperable. Quien llama decide (la migración lo descarta y lo
 * anota). Cubre los casos borde del fixture: `0`, `-5000`, `null`, `"texto"`.
 */
export function asPositiveAmount(value: unknown): number | null {
  const n = asFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha civil `YYYY-MM-DD`. Devuelve `null` si no es válida — igual que el
 * importe, inventar una fecha falsearía los reportes en silencio.
 */
export function asISODate(value: unknown): string | null {
  const s = asString(value);
  if (!ISO_DATE.test(s)) return null;
  // La forma correcta no basta: '2026-02-31' pasa el regex. Se comprueba que
  // el calendario devuelva la misma fecha que se le dio.
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

const ISO_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function asISOTime(value: unknown, fallback = '00:00'): string {
  const s = asString(value);
  return ISO_TIME.test(s) ? s : fallback;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function asHexColor(value: unknown, fallback: string): string {
  const s = asString(value);
  return HEX_COLOR.test(s) ? s.toLowerCase() : fallback;
}

/** Valor de una unión cerrada, o el respaldo si no pertenece a ella. */
export function asOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const s = asString(value);
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}
