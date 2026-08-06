import { SYSTEM_CATEGORY_ADJUSTMENT } from '@/constants';
import type { ID, ISODate, ISOTime, Transaction, TransactionType } from '@/models';
import { createId } from '@/services/id/createId';
import { removeById, updateById } from '@/utils/collections';
import type { SliceCreator } from '../types';

/**
 * Movimientos: el libro contable. La única fuente de verdad del dinero.
 *
 * ⚠️ NINGUNA ACCIÓN DE AQUÍ TOCA EL SALDO DE UNA CUENTA — y ése es justamente
 * el punto. En v1 cada alta, edición y borrado tenía que acordarse de ajustar
 * `account.balance` a mano; un solo olvido descuadraba los datos para siempre
 * y sin forma de detectarlo. Aquí el saldo se deriva, así que no puede
 * desincronizarse: no existe un segundo sitio donde pueda estar mal.
 */

export interface TransactionDraft {
  type: TransactionType;
  amount: number;
  date: ISODate;
  time?: ISOTime;
  accountId: ID;
  categoryId: ID;
  subcategoryId?: ID | null;
  description?: string;
  notes?: string;
}

export interface TransactionsSlice {
  transactions: Transaction[];

  addTransaction(draft: TransactionDraft): ID;
  updateTransaction(id: ID, patch: Partial<TransactionDraft>): void;
  deleteTransaction(id: ID): void;
  /**
   * Copia un movimiento con fecha de hoy. Requisito nuevo del usuario: los
   * gastos recurrentes (mercado, transporte) se repiten casi idénticos.
   */
  duplicateTransaction(id: ID, date?: ISODate): ID | null;

  /**
   * Registra un ajuste para que el saldo de la cuenta pase a ser `targetBalance`.
   *
   * NO reescribe el saldo inicial ni muta un campo (ADR-004): crea un
   * movimiento fechado con `isAdjustment: true`, que
   *  · SÍ mueve el saldo — es su razón de ser,
   *  · queda EXCLUIDO de todo total de ingresos y gastos del periodo,
   *  · es reversible: borrarlo deshace el ajuste,
   *  · es auditable: queda en el libro, con fecha.
   *
   * Reescribir el pasado cambiaría retroactivamente todos los reportes y la
   * curva de evolución del saldo. `currentBalance` lo calcula quien llama con
   * `computeAccountBalance` (el store no importa services de saldo).
   *
   * Devuelve `null` si no hace falta ajuste.
   */
  adjustAccountBalance(input: {
    accountId: ID;
    currentBalance: number;
    targetBalance: number;
    date: ISODate;
    notes?: string;
  }): ID | null;
}

function nowInstant(): string {
  return new Date().toISOString();
}

export const createTransactionsSlice: SliceCreator<TransactionsSlice> = (set, get) => ({
  transactions: [],

  addTransaction(draft) {
    const id = createId();
    const now = nowInstant();
    const transaction: Transaction = {
      id,
      type: draft.type,
      // Siempre positivo: el signo lo lleva `type`. Se normaliza aquí para que
      // ninguna pantalla pueda introducir un negativo por descuido.
      amount: Math.abs(draft.amount),
      date: draft.date,
      time: draft.time ?? '00:00',
      accountId: draft.accountId,
      categoryId: draft.categoryId,
      subcategoryId: draft.subcategoryId ?? null,
      description: draft.description?.trim() ?? '',
      notes: draft.notes?.trim() ?? '',
      source: 'manual',
      isAdjustment: false,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ transactions: [...state.transactions, transaction] }));
    return id;
  },

  updateTransaction(id, patch) {
    set((state) => ({
      transactions: updateById(state.transactions, id, (tx) => ({
        ...tx,
        ...patch,
        ...(patch.amount !== undefined ? { amount: Math.abs(patch.amount) } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
        updatedAt: nowInstant(),
      })),
    }));
  },

  deleteTransaction(id) {
    set((state) => ({ transactions: removeById(state.transactions, id) }));
  },

  duplicateTransaction(id, date) {
    const original = get().transactions.find((tx) => tx.id === id);
    if (!original) return null;

    const newId = createId();
    const now = nowInstant();
    set((state) => ({
      transactions: [
        ...state.transactions,
        {
          ...original,
          id: newId,
          date: date ?? original.date,
          // Una copia es siempre manual, aunque el original fuera un ajuste o
          // viniera importado: la creó el usuario, aquí y ahora.
          source: 'manual',
          isAdjustment: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    return newId;
  },

  adjustAccountBalance({ accountId, currentBalance, targetBalance, date, notes }) {
    const delta = targetBalance - currentBalance;
    if (delta === 0) return null;

    const id = createId();
    const now = nowInstant();
    set((state) => ({
      transactions: [
        ...state.transactions,
        {
          id,
          type: delta > 0 ? 'income' : 'expense',
          amount: Math.abs(delta),
          date,
          time: '00:00',
          accountId,
          categoryId: SYSTEM_CATEGORY_ADJUSTMENT,
          subcategoryId: null,
          description: 'Ajuste de saldo',
          notes: notes?.trim() ?? '',
          source: 'adjustment',
          isAdjustment: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }));
    return id;
  },
});
