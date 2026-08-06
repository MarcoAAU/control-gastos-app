import type { StateCreator } from 'zustand';
import type { AppData } from '@/models';
import type { AccountsSlice } from './slices/accountsSlice';
import type { BanksSlice } from './slices/banksSlice';
import type { CategoriesSlice } from './slices/categoriesSlice';
import type { HistorySlice } from './slices/historySlice';
import type { SettingsSlice } from './slices/settingsSlice';
import type { TransactionsSlice } from './slices/transactionsSlice';
import type { UiSlice } from './slices/uiSlice';

/**
 * Estado completo de la aplicación: la unión de los siete slices.
 *
 * ⚠️ ES LA ÚNICA CAPA DE MUTACIÓN. Requisito literal del usuario: *"todo
 * cambio de información debe pasar por una única capa de gestión del estado"*.
 * Ninguna pantalla escribe en almacenamiento ni muta datos por su cuenta;
 * llama a una acción de aquí. ESLint impide lo contrario.
 */
export interface AppState
  extends AccountsSlice,
    BanksSlice,
    CategoriesSlice,
    TransactionsSlice,
    HistorySlice,
    SettingsSlice,
    UiSlice {}

/** Firma de un creador de slice. Todos los slices ven el estado completo. */
export type SliceCreator<T> = StateCreator<AppState, [], [], T>;

/**
 * Porción PERSISTIDA del estado — exactamente `AppData`.
 *
 * Lo que no está aquí (todo `UiSlice`: filtros activos, hoja abierta, toasts,
 * estado de hidratación) NO se guarda a propósito. Persistir la UI hace que la
 * app reabra con un modal a medias o un filtro invisible puesto, y el usuario
 * cree que se rompió.
 */
export type PersistedState = AppData;

/** Extrae de `AppState` lo que se escribe en disco. Única definición: DRY. */
export function selectPersisted(state: AppState): PersistedState {
  return {
    schemaVersion: state.schemaVersion,
    banks: state.banks,
    accounts: state.accounts,
    categories: state.categories,
    subcategories: state.subcategories,
    transactions: state.transactions,
    history: state.history,
    settings: state.settings,
    meta: state.meta,
  };
}
