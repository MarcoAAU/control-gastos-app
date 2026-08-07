import { createDefaultSettings } from '@/constants';
import { CURRENT_SCHEMA_VERSION, type AppData, type AppSettings, type ThemePreference } from '@/models';
import type { SliceCreator } from '../types';

/**
 * Ajustes y metadatos del documento.
 *
 * `schemaVersion` y `meta` viven aquí porque son parte de lo persistido pero
 * no pertenecen a ninguna colección. Tenerlos en el estado (y no sólo en
 * disco) permite mostrar los avisos de migración en Ajustes.
 */

export interface SettingsSlice {
  schemaVersion: number;
  settings: AppSettings;
  meta: AppData['meta'];

  updateSettings(patch: Partial<AppSettings>): void;
  setTheme(theme: ThemePreference): void;
  /** Marca la fecha de la última exportación, para poder avisar si es vieja. */
  markExported(): void;
  /** Descarta los avisos de migración una vez vistos. */
  dismissMigrationWarnings(): void;

  /**
   * Sustituye TODO el documento. Es lo que hace "importar un respaldo".
   *
   * ⚠️ Vive en este slice, y no en uno propio, porque `schemaVersion` y `meta`
   * son suyos y una importación tiene que reemplazarlos junto con el resto: un
   * documento con las cuentas del respaldo y la `schemaVersion` anterior sería
   * incoherente.
   *
   * ⚠️ NO VALIDA NADA. Quien llame debe haber pasado los datos por
   * `parseBackup` y por los type guards. Aquí sólo se asigna.
   */
  replaceAllData(data: AppData): void;

  /**
   * Deja el documento vacío conservando las preferencias.
   *
   * El tema o el inicio de semana no son datos financieros: borrarlos no
   * protege nada y sí obliga al usuario a reconfigurar la app después de una
   * operación que ya es desagradable.
   */
  clearAllData(): void;
}

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: createDefaultSettings(),
  meta: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    migratedFrom: null,
    migrationWarnings: [],
  },

  updateSettings(patch) {
    set((state) => ({ settings: { ...state.settings, ...patch } }));
  },

  setTheme(theme) {
    set((state) =>
      state.settings.theme === theme
        ? {}
        : { settings: { ...state.settings, theme } },
    );
  },

  markExported() {
    set((state) => ({
      settings: {
        ...state.settings,
        backup: { ...state.settings.backup, lastExportedAt: new Date().toISOString() },
      },
    }));
  },

  dismissMigrationWarnings() {
    set((state) =>
      state.meta.migrationWarnings.length === 0
        ? {}
        : { meta: { ...state.meta, migrationWarnings: [] } },
    );
  },

  replaceAllData(data) {
    set({
      schemaVersion: data.schemaVersion,
      banks: data.banks ?? [],
      accounts: data.accounts ?? [],
      categories: data.categories ?? [],
      subcategories: data.subcategories ?? [],
      transactions: data.transactions ?? [],
      history: data.history ?? [],
      settings: data.settings ?? createDefaultSettings(),
      meta: { ...data.meta, updatedAt: new Date().toISOString() },
    });
  },

  clearAllData() {
    set((state) => ({
      banks: [],
      accounts: [],
      categories: [],
      subcategories: [],
      transactions: [],
      history: [],
      // Las preferencias sobreviven a propósito: ver la nota de la interfaz.
      settings: state.settings,
      meta: { ...state.meta, updatedAt: new Date().toISOString() },
    }));
  },
});
