/**
 * Tipos escalares compartidos.
 *
 * Son alias de `string`/`number`, no clases: no añaden coste en tiempo de
 * ejecución. Su valor está en la firma — `date: ISODate` documenta el formato
 * exacto en el punto de uso, que es donde hace falta. El formato se VALIDA en
 * `storage/validation/` (Fase 4); aquí sólo se declara.
 */

/** Identificador opaco. Generado por `services/id/createId`. */
export type ID = string;

/**
 * Fecha civil `YYYY-MM-DD` en HORA DE PARED LOCAL.
 *
 * Nunca se obtiene con `toISOString().slice(0,10)`: eso convierte a UTC y en
 * Colombia (UTC-5) manda un gasto de las 8 de la noche al día siguiente. Ver
 * ADR-006.
 */
export type ISODate = string;

/** Hora local `HH:mm` en 24h. Complementa a `ISODate`. */
export type ISOTime = string;

/**
 * Instante absoluto (`toISOString()`), para metadatos de auditoría como
 * `createdAt`. Aquí UTC sí es lo correcto: no es "cuándo ocurrió el gasto"
 * sino "cuándo se escribió el registro".
 */
export type ISOInstant = string;

/** Color en formato `#rrggbb`. */
export type HexColor = string;

/**
 * Clave del registro de iconos (`constants/icons.ts`) o un emoji literal
 * heredado de v1. Es `string` a propósito: si fuese `IconKey`, los datos ya
 * guardados por el usuario ("🍔") dejarían de tipar. Ver ADR-011.
 */
export type IconRef = string;

/** Naturaleza de un movimiento. Los dos únicos valores posibles. */
export type TransactionType = 'income' | 'expense';

/** Origen de un movimiento, para poder distinguirlos en auditoría. */
export type TransactionSource = 'manual' | 'imported' | 'adjustment';

/** Campos de auditoría comunes a todas las entidades. */
export interface Auditable {
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
}

/**
 * Entidad que se archiva en vez de borrarse.
 *
 * Borrar físicamente una categoría o una cuenta dejaría movimientos apuntando
 * a un id inexistente. El borrado lógico conserva la integridad referencial y
 * permite deshacer.
 */
export interface Archivable {
  archivedAt: ISOInstant | null;
}
