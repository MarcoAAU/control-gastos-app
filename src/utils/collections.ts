import type { ID } from '@/models';

/**
 * Operaciones inmutables sobre colecciones indexadas por `id`.
 *
 * ⚠️ REGLA CLAVE: si la operación no cambia nada, se devuelve **el array
 * original**, no una copia. No es una micro-optimización, es lo que impide el
 * bucle de persistencia: el suscriptor que guarda compara por referencia, así
 * que una copia idéntica dispararía una escritura, que dispararía otra
 * comparación… Devolver la misma referencia corta eso de raíz (ADR-002).
 */

interface HasId {
  id: ID;
}

/** Reemplaza un elemento aplicándole `updater`. Si no existe, no hace nada. */
export function updateById<T extends HasId>(items: T[], id: ID, updater: (item: T) => T): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return items;

  const current = items[index]!;
  const next = updater(current);
  if (next === current) return items;

  const copy = items.slice();
  copy[index] = next;
  return copy;
}

/** Elimina físicamente un elemento. Para entidades referenciadas usa `archivedAt`. */
export function removeById<T extends HasId>(items: T[], id: ID): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

/**
 * `map` que conserva la referencia original si ningún elemento cambió.
 *
 * `Array.prototype.map` siempre devuelve un array nuevo, así que una operación
 * en bloque que no modifica nada (archivar una categoría sin movimientos, por
 * ejemplo) provocaría igualmente una escritura en disco. Ver la regla clave
 * de arriba.
 */
export function mapItems<T>(items: T[], fn: (item: T) => T): T[] {
  let changed = false;
  const next = items.map((item) => {
    const mapped = fn(item);
    if (mapped !== item) changed = true;
    return mapped;
  });
  return changed ? next : items;
}

export function findById<T extends HasId>(items: readonly T[], id: ID): T | undefined {
  return items.find((item) => item.id === id);
}

/** Índice `id → elemento`, para resolver relaciones sin recorrer en bucle. */
export function indexById<T extends HasId>(items: readonly T[]): Map<ID, T> {
  const map = new Map<ID, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

/** Sólo los elementos no archivados: lo que ve el usuario por defecto. */
export function activeOnly<T extends { archivedAt: string | null }>(items: readonly T[]): T[] {
  return items.filter((item) => item.archivedAt === null);
}
