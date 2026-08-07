import type {
  Auditable,
  ID,
  ISODate,
  ISOTime,
  TransactionSource,
  TransactionType,
} from './common';

/**
 * Movimiento: la unidad atómica de la contabilidad.
 *
 * Es la única fuente de verdad del dinero. Todo lo demás —saldos, resúmenes,
 * gráficos, reportes— se calcula a partir de esta lista. No hay agregados
 * almacenados que puedan quedar desactualizados.
 *
 * Campos nuevos respecto a v1 (`{id, date, amount, desc, categoryId,
 * accountId, source, type}`): `time`, `subcategoryId`, `notes`, `isAdjustment`
 * y los de auditoría. Todos tienen valor por defecto en la migración, así que
 * ningún movimiento existente se pierde ni queda a medias.
 */
export interface Transaction extends Auditable {
  id: ID;
  type: TransactionType;
  /**
   * Importe SIEMPRE POSITIVO. El signo lo determina `type`.
   *
   * Guardar gastos en negativo obligaría a cada consulta a acordarse del
   * convenio, y basta un olvido para que un total salga invertido. Con
   * importe positivo + tipo explícito, un error de signo es imposible.
   */
  amount: number;
  /** Fecha civil local del movimiento (ADR-006). */
  date: ISODate;
  /** Hora local. Los movimientos migrados de v1 quedan en `'00:00'`. */
  time: ISOTime;
  accountId: ID;
  categoryId: ID;
  subcategoryId: ID | null;
  /** Lo que en v1 era `desc`. */
  description: string;
  /** Observaciones libres (campo nuevo). */
  notes: string;
  source: TransactionSource;
  /**
   * Marca los movimientos generados al cuadrar el saldo de una cuenta.
   *
   * ⚠️ INVARIANTE: un movimiento con `isAdjustment: true` SÍ afecta al saldo
   * de la cuenta, pero queda EXCLUIDO de todo total de ingresos o gastos del
   * periodo. Sin esta marca, cuadrar una cuenta inflaría los "Ingresos del
   * mes" con dinero que nunca se ingresó — exactamente la clase de confusión
   * que originó la queja del usuario en v1. Se verifica con test (invariante
   * 42 del checklist de regresión). Ver ADR-004.
   */
  isAdjustment: boolean;
}
