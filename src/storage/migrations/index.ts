import { CURRENT_SCHEMA_VERSION, type AppData } from '@/models';
import { createDefaultSettings, SEED_BANKS, SEED_CATEGORIES } from '@/constants';
import { ensureSeedCatalog } from '@/services/catalog/ensureSeedCatalog';
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
  /**
   * `true` si hubo que reponer categorías o bancos de fábrica que faltaban.
   *
   * Existe para que el repositorio sepa que el documento en memoria ya NO
   * coincide con el del disco y tenga que escribirlo. Sin esta señal, la
   * reparación se repetiría en cada arranque: la app funcionaría, pero el aviso
   * saldría siempre y cualquier respaldo exportado seguiría saliendo sin
   * catálogo.
   */
  healed: boolean;
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
    return { status: 'empty', healed: false, data: createEmptyAppData(), warnings: [], detectedVersion: null };
  }

  const detectedVersion = detectVersion(input);

  if (detectedVersion === null) {
    // Datos ilegibles. Se arranca vacío PERO el llamador no debe sobrescribir
    // el original: puede ser recuperable a mano y es lo único que tiene el
    // usuario.
    return {
      status: 'unrecognized',
      healed: false,
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
      healed: false,
      data: createEmptyAppData(),
      warnings: [
        'Tus datos fueron guardados por una versión más reciente de la app. Actualiza para poder verlos; no se ha modificado nada.',
      ],
      detectedVersion,
    };
  }

  if (detectedVersion === CURRENT_SCHEMA_VERSION) {
    const notes: string[] = [];
    const data = healCatalog(input as AppData, notes);
    return {
      status: 'current',
      healed: notes.length > 0,
      data,
      warnings: notes,
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
      return { status: 'unrecognized', healed: false, data: createEmptyAppData(), warnings, detectedVersion };
    }
    const outcome = migration.run(current);
    warnings.push(...outcome.warnings);
    current = outcome.data;
    version = migration.to;
  }

  // Aquí `healed` no hace falta señalarlo: el estado 'migrated' ya provoca una
  // escritura completa del documento en el repositorio.
  const data = healCatalog(current as AppData, warnings);
  data.meta.migrationWarnings = warnings;

  return { status: 'migrated', healed: false, data, warnings, detectedVersion };
}

/**
 * Repone las categorías y bancos de fábrica que falten en el documento.
 *
 * ── POR QUÉ ESTO VIVE EN LA CARGA Y NO SÓLO EN EL BORRADO ─────────────────
 * Corregir `clearAllData` protege de aquí en adelante, pero no arregla a quien
 * YA pulsó "borrar todos los datos" con la versión anterior: su documento
 * guardado tiene el catálogo vacío y, como los documentos de la versión actual
 * se devolvían tal cual y sin normalizar, ese estado era permanente. La app
 * seguiría sin categorías y sin poder crear cuentas para siempre.
 *
 * Poniéndolo en la carga, la reparación ocurre sola al abrir la app.
 *
 * ── NO PUEDE DUPLICAR ─────────────────────────────────────────────────────
 * `ensureSeedCatalog` compara por `id`, que es contrato fijo, y sólo añade lo
 * ausente. Ejecutarlo en cada arranque es idempotente: al segundo no falta
 * nada, no repone nada y devuelve los mismos arrays por referencia, así que ni
 * siquiera provoca una escritura en disco.
 */
function healCatalog(data: AppData, warnings: string[]): AppData {
  const result = ensureSeedCatalog({
    banks: data.banks ?? [],
    categories: data.categories ?? [],
    subcategories: data.subcategories ?? [],
  });

  if (result.restored === 0) return data;

  warnings.push(
    `Faltaban ${result.restored} categorías o bancos de los que trae la app y se han repuesto. Tus movimientos y cuentas no se han tocado.`,
  );

  return {
    ...data,
    banks: result.banks,
    categories: result.categories,
    subcategories: result.subcategories,
  };
}
