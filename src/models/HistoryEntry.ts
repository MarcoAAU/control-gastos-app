import type { ID, ISODate, ISOInstant } from './common';
import type { Transaction } from './Transaction';

/**
 * Instantánea guardada de un intervalo ("Quincena de junio").
 *
 * ⚠️ ES UNA FOTO, NO UNA VISTA. Los totales van CONGELADOS dentro de la
 * entrada, y las transacciones se copian, no se referencian. Recalcularlos
 * después a partir de los movimientos actuales daría cifras distintas cada vez
 * que el usuario editara un movimiento antiguo — y fue exactamente el fallo
 * que se corrigió en el commit `66c59af` de v1 ("no se guardan los valores de
 * ingreso, egreso y saldo"). Un historial que cambia solo no es un historial.
 *
 * Coste: duplicación de datos. Es deliberado y es lo que da la garantía.
 */
export interface HistoryEntry {
  id: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  savedAt: ISOInstant;

  /** Totales congelados en el momento de guardar. */
  totals: {
    income: number;
    expense: number;
    balance: number;
  };

  /** Copia profunda de los movimientos del intervalo. */
  transactions: Transaction[];

  /**
   * `'legacy'` marca las entradas migradas de v1, donde "Ingresos" significaba
   * en realidad *saldo total de las cuentas* (`app.js:221`). La pantalla de
   * detalle muestra un aviso en esas entradas para que las cifras antiguas no
   * se comparen con las nuevas como si midieran lo mismo.
   */
  origin: 'v2' | 'legacy';
}
