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
});
