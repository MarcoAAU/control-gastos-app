import { createDefaultSettings } from '@/constants';
import { ensureSeedCatalog } from '@/services/catalog/ensureSeedCatalog';
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
  /** Despliega o pliega los indicadores del Inicio. Se recuerda entre sesiones. */
  setShowTodayIndicators(visible: boolean): void;
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

  setShowTodayIndicators(visible) {
    set((state) =>
      // El valor guardado puede ser `undefined` en instalaciones anteriores a
      // esta preferencia; ahí el estado real es "visible".
      (state.settings.showTodayIndicators ?? true) === visible
        ? {}
        : { settings: { ...state.settings, showTodayIndicators: visible } },
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
    const timestamp = new Date().toISOString();
    // Un respaldo antiguo —o uno hecho mientras el catálogo estaba vacío por el
    // fallo que esto corrige— no debe dejar la app sin categorías ni bancos al
    // restaurarlo. Se completa lo que falte; lo que trae el archivo manda.
    const catalog = ensureSeedCatalog(
      {
        banks: data.banks ?? [],
        categories: data.categories ?? [],
        subcategories: data.subcategories ?? [],
      },
      timestamp,
    );

    set({
      schemaVersion: data.schemaVersion,
      banks: catalog.banks,
      accounts: data.accounts ?? [],
      categories: catalog.categories,
      subcategories: catalog.subcategories,
      transactions: data.transactions ?? [],
      history: data.history ?? [],
      settings: data.settings ?? createDefaultSettings(),
      meta: { ...data.meta, updatedAt: timestamp },
    });
  },

  clearAllData() {
    set((state) => {
      const timestamp = new Date().toISOString();
      /**
       * ⚠️ EL CATÁLOGO NO SE BORRA: SE REPONE DE FÁBRICA.
       *
       * Antes esto vaciaba también categorías y bancos —de 15 y 4 a cero— y
       * dejaba una app que ya no sabe clasificar un gasto y en la que **no se
       * puede crear una cuenta**, porque una cuenta necesita un banco. El
       * usuario pulsaba "borrar mis datos" y se encontraba con una app rota.
       *
       * Se llevaba además las categorías de sistema (`sys_ajuste`,
       * `sys_sin_categoria`), de las que depende el ajuste de saldo: una
       * referencia rota esperando a que alguien cuadre una cuenta.
       *
       * Lo que sí se borra es lo que el usuario quiso borrar: sus cuentas, sus
       * movimientos y su historial.
       */
      const catalog = ensureSeedCatalog(
        { banks: [], categories: [], subcategories: [] },
        timestamp,
      );

      return {
        banks: catalog.banks,
        categories: catalog.categories,
        subcategories: catalog.subcategories,
        accounts: [],
        transactions: [],
        history: [],
        // Las preferencias sobreviven a propósito: ver la nota de la interfaz.
        settings: state.settings,
        meta: { ...state.meta, updatedAt: timestamp },
      };
    });
  },
});
