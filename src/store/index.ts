import { create } from 'zustand';
import { createAccountsSlice } from './slices/accountsSlice';
import { createBanksSlice } from './slices/banksSlice';
import { createCategoriesSlice } from './slices/categoriesSlice';
import { createHistorySlice } from './slices/historySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createTransactionsSlice } from './slices/transactionsSlice';
import { createUiSlice } from './slices/uiSlice';
import type { AppState } from './types';

/**
 * Store único de la aplicación.
 *
 * ── POR QUÉ ZUSTAND Y NO CONTEXT NI REDUX (ADR-002) ───────────────────────
 * · Context re-renderiza TODO consumidor ante cualquier cambio del valor.
 *   Con un objeto que contiene todos los movimientos, escribir una letra en un
 *   filtro repintaría el árbol entero.
 * · Zustand suscribe por SELECTOR: un componente que lee `accounts` no se
 *   entera de que cambió `search`.
 * · `store.subscribe()` funciona fuera de React, que es lo que permite tener
 *   la persistencia en UN SOLO sitio (`persistence.ts`) en vez de esparcida
 *   por los slices.
 * · Redux Toolkit haría lo mismo con 3-4× el peso y mucha más ceremonia.
 *
 * ── POR QUÉ SIN EL MIDDLEWARE `persist` ───────────────────────────────────
 * Ese middleware guarda y rehidrata por su cuenta, pero no sabe nada de
 * `schemaVersion`, migraciones defensivas ni respaldo previo. Con datos
 * financieros reales de por medio, ese control se queda en nuestro código.
 */
export const useAppStore = create<AppState>()((...args) => ({
  ...createAccountsSlice(...args),
  ...createBanksSlice(...args),
  ...createCategoriesSlice(...args),
  ...createTransactionsSlice(...args),
  ...createHistorySlice(...args),
  ...createSettingsSlice(...args),
  ...createUiSlice(...args),
}));

export type { AppState } from './types';
