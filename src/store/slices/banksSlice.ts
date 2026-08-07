import { DEFAULT_COLOR, SYSTEM_IDS } from '@/constants';
import type { Bank, HexColor, ID } from '@/models';
import { createSlugId } from '@/services/id/createId';
import { updateById } from '@/utils/collections';
import type { SliceCreator } from '../types';

/**
 * Bancos.
 *
 * En v1 eran una constante del código y el "otro banco" que escribía el
 * usuario quedaba como texto suelto dentro de la cuenta, así que no se podía
 * reutilizar ni renombrar. Ahora son entidades: es lo que hace posible el
 * requisito de que "Otro banco" se guarde para volver a usarlo.
 */

export interface BankDraft {
  name: string;
  color?: HexColor;
  icon?: string;
}

export interface BanksSlice {
  banks: Bank[];

  /**
   * Crea el banco, o devuelve el id del que ya existe con ese nombre.
   *
   * Es idempotente a propósito: el flujo real es "el usuario escribe el nombre
   * de su banco al crear una cuenta", y si lo escribe otra vez debe reusarse
   * el mismo banco, no aparecer duplicado en el selector.
   */
  addBank(draft: BankDraft): ID;
  updateBank(id: ID, patch: Partial<BankDraft>): void;
  archiveBank(id: ID): void;
}

export const createBanksSlice: SliceCreator<BanksSlice> = (set, get) => ({
  banks: [],

  addBank(draft) {
    const name = draft.name.trim();
    if (!name) return '';

    const existing = get().banks.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    // Id derivado del nombre, igual que en la migración: así un banco creado
    // ahora y el mismo banco migrado desde v1 convergen al mismo registro.
    const id = createSlugId('bank', name);
    if (get().banks.some((b) => b.id === id)) return id;

    set((state) => ({
      banks: [
        ...state.banks,
        {
          id,
          name,
          color: draft.color ?? DEFAULT_COLOR,
          icon: draft.icon ?? 'bank',
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          archivedAt: null,
        },
      ],
    }));
    return id;
  },

  updateBank(id, patch) {
    if (SYSTEM_IDS.includes(id)) return; // "Sin banco" no se renombra
    set((state) => ({
      banks: updateById(state.banks, id, (bank) => ({
        ...bank,
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() || bank.name } : {}),
      })),
    }));
  },

  archiveBank(id) {
    if (SYSTEM_IDS.includes(id)) return;
    set((state) => ({
      banks: updateById(state.banks, id, (bank) =>
        bank.archivedAt !== null ? bank : { ...bank, archivedAt: new Date().toISOString() },
      ),
    }));
  },
});
