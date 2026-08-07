import { AMOUNT_DECIMALS } from '@/constants';
import type { TransactionType } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  "Ajustar saldo" — el cálculo, separado de la interfaz y del store.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El usuario dice cuánto tiene DE VERDAD en la cuenta; aquí se resuelve qué
 * movimiento hay que registrar para que el libro coincida con la realidad.
 *
 * ── POR QUÉ UN MOVIMIENTO Y NO UNA ASIGNACIÓN (ADR-004) ───────────────────
 * En v1 esto era `acc.balance = newBalance` (`app.js:705`): un campo que se
 * sobrescribía. Tres problemas, todos reales:
 *   1. No dejaba rastro. El dinero cambiaba y no había forma de saber por qué.
 *   2. No se podía deshacer.
 *   3. Al derivar el saldo del libro, una asignación no tiene dónde vivir.
 *
 * Registrar un movimiento fechado con `isAdjustment: true` resuelve los tres:
 * queda en el historial, borrarlo revierte el saldo exactamente, y encaja en
 * el modelo derivado sin excepciones.
 *
 * ⚠️ EL AJUSTE MUEVE EL SALDO (STOCK) PERO NO ES UN INGRESO NI UN GASTO
 * (FLUJO). Si contara como ingreso, "ajusté mi cuenta a 3 millones" aparecería
 * como si hubieras ganado 3 millones ese día y arruinaría todos los informes.
 * Por eso `isAdjustment` lo excluye de `services/metrics`. El invariante está
 * fijado en `solveAdjustment.test.ts` y es la prueba que impide que vuelva la
 * queja original del usuario.
 */

/**
 * Diferencia por debajo de la cual NO se registra ajuste.
 *
 * El peso colombiano no usa céntimos (`AMOUNT_DECIMALS = 0`), así que una
 * diferencia de 0,4 no es un ajuste pendiente: es ruido de coma flotante. Sin
 * este umbral, cuadrar una cuenta podría dejar un movimiento de "$0" en el
 * historial, que es exactamente el tipo de basura que hace desconfiar de una
 * app de dinero.
 */
const NEGLIGIBLE = AMOUNT_DECIMALS === 0 ? 0.5 : Number.EPSILON;

export interface AdjustmentPlan {
  /**
   * Cuánto hay que mover el saldo: `objetivo − actual`.
   * Positivo = en la cuenta hay más de lo que dice el libro.
   */
  delta: number;
  /** Tipo del movimiento a registrar; `null` si no hace falta ninguno. */
  direction: TransactionType | null;
  /** Importe del movimiento, siempre positivo (el signo lo lleva `direction`). */
  amount: number;
  /** `false` cuando la cuenta ya cuadra. */
  needed: boolean;
}

/**
 * Qué movimiento hace falta para que el saldo derivado pase a ser `target`.
 *
 * Función pura: no toca el store ni conoce React. Quien llama decide si
 * registra el movimiento (`adjustAccountBalance`) o sólo muestra la previsión
 * al usuario antes de que confirme — la interfaz usa esto para las dos cosas,
 * y así el número que se anuncia y el que se registra salen del mismo cálculo.
 */
export function solveAdjustment(currentBalance: number, targetBalance: number): AdjustmentPlan {
  if (!Number.isFinite(currentBalance) || !Number.isFinite(targetBalance)) {
    return { delta: 0, direction: null, amount: 0, needed: false };
  }

  const raw = targetBalance - currentBalance;
  const delta = AMOUNT_DECIMALS === 0 ? Math.round(raw) : raw;

  if (Math.abs(raw) < NEGLIGIBLE || delta === 0) {
    return { delta: 0, direction: null, amount: 0, needed: false };
  }

  return {
    delta,
    direction: delta > 0 ? 'income' : 'expense',
    amount: Math.abs(delta),
    needed: true,
  };
}
