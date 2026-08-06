import type { Archivable, HexColor, IconRef, ID, ISOInstant } from './common';

/**
 * Banco o entidad emisora.
 *
 * CAMBIO RESPECTO A v1: los bancos eran una constante en el código
 * (`DEMO_BANKS`) y el "otro banco" que escribía el usuario se guardaba como
 * un texto suelto dentro de la cuenta (`bankName`), así que no se podía
 * reutilizar en la siguiente cuenta ni renombrar. Ahora son entidades
 * persistidas — es lo que hace posible el requisito de que "Otro banco" se
 * guarde para volver a usarlo.
 */
export interface Bank {
  id: ID;
  name: string;
  color: HexColor;
  icon: IconRef;
  /** `true` para los que vienen con la app; `false` si lo creó el usuario. */
  isBuiltIn: boolean;
  createdAt: ISOInstant;
  archivedAt: Archivable['archivedAt'];
}
