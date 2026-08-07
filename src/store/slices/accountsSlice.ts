import { DEFAULT_ACCOUNT_TYPE, DEFAULT_COLOR, SYSTEM_BANK_NONE } from '@/constants';
import type { Account, AccountType, HexColor, ID, ISODate } from '@/models';
import { createId } from '@/services/id/createId';
import { removeById, updateById } from '@/utils/collections';
import type { SliceCreator } from '../types';

/**
 * Cuentas.
 *
 * ⚠️ NINGUNA ACCIÓN DE AQUÍ TOCA UN SALDO. No existe `setBalance` porque no
 * existe el campo: el saldo se deriva del libro de movimientos (ADR-003).
 * Para cuadrar una cuenta se registra una transacción de ajuste desde
 * `transactionsSlice`, que es reversible y auditable (ADR-004).
 *
 * Esto es lo que impide estructuralmente que vuelva el descuadre de v1, donde
 * cada alta/edición/borrado de movimiento tenía que acordarse de sumar o
 * restar a mano en la cuenta (`app.js:171-173`).
 */

export interface AccountDraft {
  name: string;
  bankId?: ID;
  type?: AccountType;
  color?: HexColor;
  icon?: string;
  initialBalance: number;
  initialBalanceDate: ISODate;
  includeInTotals?: boolean;
}

export interface AccountsSlice {
  accounts: Account[];

  addAccount(draft: AccountDraft): ID;
  updateAccount(id: ID, patch: Partial<AccountDraft>): void;
  /** Borrado lógico: conserva la integridad con los movimientos existentes. */
  archiveAccount(id: ID): void;
  restoreAccount(id: ID): void;
  /**
   * Borrado físico. Sólo debe llamarse tras decidir qué pasa con sus
   * movimientos; el store no lo decide por su cuenta.
   */
  deleteAccount(id: ID): void;
}

export const createAccountsSlice: SliceCreator<AccountsSlice> = (set) => ({
  accounts: [],

  addAccount(draft) {
    const id = createId();
    const now = new Date().toISOString();
    const account: Account = {
      id,
      name: draft.name.trim() || 'Cuenta sin nombre',
      bankId: draft.bankId ?? SYSTEM_BANK_NONE,
      type: draft.type ?? DEFAULT_ACCOUNT_TYPE,
      color: draft.color ?? DEFAULT_COLOR,
      icon: draft.icon ?? 'wallet',
      // El saldo inicial lo da SIEMPRE el usuario. v1 inventaba un valor al
      // crear la cuenta y el usuario lo reportó como error.
      initialBalance: draft.initialBalance,
      initialBalanceDate: draft.initialBalanceDate,
      includeInTotals: draft.includeInTotals ?? true,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    set((state) => ({ accounts: [...state.accounts, account] }));
    return id;
  },

  updateAccount(id, patch) {
    set((state) => ({
      accounts: updateById(state.accounts, id, (account) => ({
        ...account,
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() || account.name } : {}),
        updatedAt: new Date().toISOString(),
      })),
    }));
  },

  archiveAccount(id) {
    set((state) => ({
      accounts: updateById(state.accounts, id, (account) =>
        account.archivedAt !== null
          ? account
          : { ...account, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ),
    }));
  },

  restoreAccount(id) {
    set((state) => ({
      accounts: updateById(state.accounts, id, (account) =>
        account.archivedAt === null
          ? account
          : { ...account, archivedAt: null, updatedAt: new Date().toISOString() },
      ),
    }));
  },

  deleteAccount(id) {
    set((state) => ({ accounts: removeById(state.accounts, id) }));
  },
});
