import type { Archivable, Auditable, HexColor, IconRef, ID } from './common';

/**
 * A qué tipo de movimiento aplica una categoría.
 *
 * v1 tenía DOS listas separadas y constantes (`CATEGORIES` e
 * `INCOME_CATEGORIES`), lo que hacía imposible que el usuario creara las
 * suyas: no había ni un sitio donde guardarlas. Una sola colección con un
 * discriminante permite el CRUD que pide el nuevo spec, y `'both'` cubre
 * casos reales ("Préstamos" es ingreso al recibirlo y gasto al pagarlo).
 */
export type CategoryKind = 'income' | 'expense' | 'both';

export interface Category extends Auditable, Archivable {
  id: ID;
  name: string;
  color: HexColor;
  icon: IconRef;
  kind: CategoryKind;
  /** Vino con la app (se puede editar, no borrar). */
  isBuiltIn: boolean;
  /**
   * Categoría de sistema (`sys_ajuste`, `sys_sin_asignar`): ni se edita ni se
   * borra. La app depende de que su id exista.
   */
  isSystem: boolean;
  /** Orden manual en los selectores. Menor primero. */
  order: number;
}

/**
 * Subcategoría (nivel 2). Requisito nuevo del usuario.
 *
 * Colección plana con `categoryId` en vez de un array anidado dentro de
 * `Category`: así editar una subcategoría no obliga a reescribir su categoría
 * entera, y evita la jerarquía infinita (dos niveles bastan y son los que se
 * pidieron — KISS).
 */
export interface Subcategory extends Auditable, Archivable {
  id: ID;
  categoryId: ID;
  name: string;
  /** `null` = hereda el de la categoría padre. */
  icon: IconRef | null;
  color: HexColor | null;
  order: number;
}
