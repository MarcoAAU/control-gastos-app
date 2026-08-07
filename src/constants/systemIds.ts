/**
 * Identificadores de entidades de sistema.
 *
 * La app depende de que estos ids existan siempre, así que se fijan aquí en
 * vez de generarse. Todos llevan prefijo `sys_` para que no puedan colisionar
 * con los ids generados (base36 de timestamp + aleatorio) ni con los de v1
 * (`comida`, `salario`, `bancolombia`…).
 */

/** Categoría de los movimientos de ajuste de saldo (ADR-004). */
export const SYSTEM_CATEGORY_ADJUSTMENT = 'sys_ajuste';

/**
 * Destino de los movimientos migrados cuyo `categoryId` no existe.
 *
 * Desviación consciente respecto al plan, que proponía reutilizar `otros`:
 * "Otros" es una categoría REAL del usuario, y volcar ahí los huérfanos
 * ensuciaría sus reportes sin dejar rastro. Una categoría propia deja
 * explícito que hubo un dato incompleto y permite reasignarlo después.
 */
export const SYSTEM_CATEGORY_UNCATEGORIZED = 'sys_sin_categoria';

/** Cuenta que recoge los movimientos cuyo `accountId` no existe: nunca se
 *  descarta un movimiento por tener la cuenta rota. */
export const SYSTEM_ACCOUNT_UNASSIGNED = 'sys_sin_asignar';

/** Banco de las cuentas sin entidad (el `bankId: 'manual'` de v1). */
export const SYSTEM_BANK_NONE = 'sys_sin_banco';

/** Ids que la UI no deja editar ni archivar. */
export const SYSTEM_IDS: readonly string[] = [
  SYSTEM_CATEGORY_ADJUSTMENT,
  SYSTEM_CATEGORY_UNCATEGORIZED,
  SYSTEM_ACCOUNT_UNASSIGNED,
  SYSTEM_BANK_NONE,
];
