import type { Archivable, Auditable, HexColor, IconRef, ID, ISODate } from './common';

/**
 * Tipo de cuenta. Los cinco valores son exactamente los del `<select>` de v1
 * (index.html:195-199), que allí era texto libre. Ahora es una unión cerrada:
 * permite agrupar por tipo en los reportes sin normalizar cadenas sueltas.
 */
export const ACCOUNT_TYPES = ['savings', 'checking', 'credit', 'cash', 'other'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Cuenta.
 *
 * ⚠️ NO TIENE CAMPO `balance`. Es la decisión estructural central del rediseño
 * (ADR-003). El saldo actual se DERIVA:
 *
 *     saldo = initialBalance + Σ(ingresos) − Σ(gastos)
 *
 * vía `services/balance/computeAccountBalance`. Guardar el saldo como un campo
 * mutable fue la causa de todos los problemas de contabilidad de v1: cada alta,
 * edición y borrado de movimiento tenía que acordarse de sumar o restar a mano
 * (`app.js:171-173`), y cualquier olvido descuadraba los datos para siempre sin
 * forma de detectarlo. Derivado, el saldo no puede desincronizarse: no existe
 * un segundo sitio donde pueda estar mal.
 *
 * Corolario: para CAMBIAR el saldo actual se registra una transacción de ajuste
 * (ADR-004), no se escribe un campo.
 */
export interface Account extends Auditable, Archivable {
  id: ID;
  /** Lo que en v1 se llamaba `nickname` ("Cuenta principal"). */
  name: string;
  bankId: ID;
  type: AccountType;
  color: HexColor;
  icon: IconRef;
  /** Saldo en `initialBalanceDate`, antes de cualquier movimiento registrado. */
  initialBalance: number;
  initialBalanceDate: ISODate;
  /**
   * Si entra en el "Saldo total" del inicio. Permite tener una cuenta de
   * seguimiento (la de un familiar, un ahorro ajeno) sin contaminar el total.
   */
  includeInTotals: boolean;
}
