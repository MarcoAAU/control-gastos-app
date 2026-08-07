import type { HistoryEntry, ID, ISODate, Transaction } from '@/models';
import { createId } from '@/services/id/createId';
import { removeById, updateById } from '@/utils/collections';
import type { SliceCreator } from '../types';

/**
 * Historial: instantáneas guardadas de un intervalo.
 *
 * ⚠️ LOS TOTALES SE CONGELAN AL GUARDAR y no se recalculan nunca. Si se
 * derivaran de los movimientos actuales, editar un gasto antiguo cambiaría
 * retroactivamente un historial ya guardado — y un historial que cambia solo
 * no sirve de nada. Fue exactamente el fallo que el usuario reportó en v1
 * ("no se están guardando los valores"), corregido en el commit 66c59af.
 *
 * A diferencia de v1, aquí "Ingresos" SÍ significa ingresos: la suma de los
 * movimientos de tipo ingreso del intervalo, excluidos los ajustes.
 */

export interface HistorySlice {
  history: HistoryEntry[];

  /**
   * Guarda una foto del intervalo. Recibe los movimientos ya filtrados por
   * quien llama: el store no calcula rangos de fecha (eso es `services/`).
   */
  saveHistoryEntry(input: {
    name: string;
    startDate: ISODate;
    endDate: ISODate;
    transactions: Transaction[];
  }): ID;

  renameHistoryEntry(id: ID, name: string): void;
  deleteHistoryEntry(id: ID): void;
}

export const createHistorySlice: SliceCreator<HistorySlice> = (set) => ({
  history: [],

  saveHistoryEntry({ name, startDate, endDate, transactions }) {
    const id = createId();

    // Los ajustes de saldo quedan fuera de los totales, igual que en el resto
    // de la app (invariante 42 del checklist). Se conservan en la copia para
    // que el detalle muestre el movimiento completo del intervalo.
    const real = transactions.filter((tx) => !tx.isAdjustment);
    const income = real.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = real.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    set((state) => ({
      history: [
        ...state.history,
        {
          id,
          name: name.trim() || `${startDate} → ${endDate}`,
          startDate,
          endDate,
          savedAt: new Date().toISOString(),
          totals: { income, expense, balance: income - expense },
          // Copia profunda: el snapshot no debe cambiar si el usuario edita
          // después uno de esos movimientos.
          transactions: transactions.map((tx) => ({ ...tx })),
          origin: 'v2',
        },
      ],
    }));
    return id;
  },

  renameHistoryEntry(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      history: updateById(state.history, id, (entry) =>
        entry.name === trimmed ? entry : { ...entry, name: trimmed },
      ),
    }));
  },

  deleteHistoryEntry(id) {
    set((state) => ({ history: removeById(state.history, id) }));
  },
});
