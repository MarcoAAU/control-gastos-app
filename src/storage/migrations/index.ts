import { CURRENT_SCHEMA_VERSION, type AppData } from '@/models';
import { createDefaultSettings } from '@/constants';
import { SEED_BANKS, SEED_CATEGORIES } from '@/constants';
import { detectVersion, LEGACY_SCHEMA_VERSION } from './detectVersion';
import { legacyToV2 } from './legacyToV2';
import type { Migration } from './types';

export { detectVersion, LEGACY_SCHEMA_VERSION } from './detectVersion';
export { legacyToV2 } from './legacyToV2';
export type { Migration, MigrationOutcome } from './types';

/**
 * Cadena de migraciones, en orden. Para añadir la v2→v3 del futuro: un
 * archivo, una entrada aquí y su test. Nada más cambia.
 */
const MIGRATIONS: readonly Migration[] = [
  {
    from: LEGACY_SCHEMA_VERSION,
    to: 2,
    description: 'v1 vanilla → modelo v2 con saldo derivado',
    run: legacyToV2,
  },
];

export type MigrationStatus =
  /** Ya estaba en la versión actual: no se tocó nada. */
  | 'current'
  /** Se aplicaron una o más migraciones. */
  | 'migrated'
  /** No había datos: instalación nueva. */
  | 'empty'
  /** Había algo, pero no reconocible como datos de esta app. */
  | 'unrecognized'
  /** La versión guardada es MÁS NUEVA que la que entiende este código. */
  | 'future';

export interface MigrationRunResult {
  status: MigrationStatus;
  data: AppData;
  warnings: string[];
  detectedVersion: number | null;
}

/** Documento vacío de una instalación nueva. */
export function createEmptyAppData(): AppData {
  const timestamp = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    banks: SEED_BANKS.map((seed) => ({ ...seed, createdAt: timestamp, archivedAt: null })),
    accounts: [],
    categories: SEED_CATEGORIES.map((seed) => ({
      ...seed,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    })),
    subcategories: [],
    // Sin cuentas ni movimientos de demostración: el usuario pidió
    // explícitamente que la app no invente datos ("Ahora damelo sin datos para
    // llenarlos manualmente" / "los movimientos solo los debe agregar el
    // usuario").
    transactions: [],
    history: [],
    settings: createDefaultSettings(),
    meta: {
      createdAt: timestamp,
      updatedAt: timestamp,
      migratedFrom: null,
      migrationWarnings: [],
    },
  };
}

/**
 * Aplica las migraciones necesarias sobre un documento ya parseado.
 *
 * Función PURA: no toca almacenamiento. El repositorio es quien respalda antes
 * y escribe después. Así toda la lógica delicada se puede probar en Node sin
 * navegador ni mocks.
 */
export function runMigrations(input: unknown): MigrationRunResult {
  if (input === null || input === undefined) {
    return { status: 'empty', data: createEmptyAppData(), warnings: [], detectedVersion: null };
  }

  const detectedVersion = detectVersion(input);

  if (detectedVersion === null) {
    // Datos ilegibles. Se arranca vacío PERO el llamador no debe sobrescribir
    // el original: puede ser recuperable a mano y es lo único que tiene el
    // usuario.
    return {
      status: 'unrecognized',
      data: createEmptyAppData(),
      warnings: [
        'No se pudieron leer los datos guardados. Se abrió la app vacía y tus datos anteriores siguen intactos en el navegador.',
      ],
      detectedVersion: null,
    };
  }

  if (detectedVersion > CURRENT_SCHEMA_VERSION) {
    // Pasa si el usuario abre una versión vieja de la app tras haber usado una
    // nueva (caché del Service Worker, APK sin actualizar). Migrar "hacia
    // atrás" destruiría campos que no conocemos, así que no se toca nada.
    return {
      status: 'future',
      data: createEmptyAppData(),
      warnings: [
        'Tus datos fueron guardados por una versión más reciente de la app. Actualiza para poder verlos; no se ha modificado nada.',
      ],
      detectedVersion,
    };
  }

  if (detectedVersion === CURRENT_SCHEMA_VERSION) {
    return {
      status: 'current',
      data: input as AppData,
      warnings: [],
      detectedVersion,
    };
  }

  let current: unknown = input;
  let version = detectedVersion;
  const warnings: string[] = [];

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((m) => m.from === version);
    if (!migration) {
      // Hueco en la cadena: es un fallo de programación, no de datos.
      warnings.push(
        `No existe una migración desde la versión ${version}. Se abrió la app vacía sin borrar nada.`,
      );
      return { status: 'unrecognized', data: createEmptyAppData(), warnings, detectedVersion };
    }
    const outcome = migration.run(current);
    warnings.push(...outcome.warnings);
    current = outcome.data;
    version = migration.to;
  }

  const data = current as AppData;
  data.meta.migrationWarnings = warnings;

  return { status: 'migrated', data, warnings, detectedVersion };
}
