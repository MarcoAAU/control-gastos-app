import {
  BACKUP_KEY_PREFIX,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
} from '@/constants';
import type { AppData } from '@/models';
import { StorageError, type StorageAdapter } from './StorageAdapter';
import { approximateBytes, safeParse, safeStringify } from './serialization';
import { runMigrations, type MigrationStatus } from './migrations';

/**
 * ⚠️ LA ÚNICA PUERTA A LOS DATOS PERSISTIDOS.
 *
 * Reglas verificadas mecánicamente por ESLint:
 *  · `screens/**` y `components/**` no pueden importar de `storage/**`.
 *  · `store/slices/**` no puede importar este archivo (la persistencia la hace
 *    un único suscriptor en `store/persistence.ts`).
 *  · `localStorage` sólo aparece en `adapters/localStorageAdapter.ts`.
 *
 * En la práctica sólo dos archivos usan esta clase: `store/bootstrap.ts` (leer)
 * y `store/persistence.ts` (escribir).
 */

export interface LoadResult {
  data: AppData;
  status: MigrationStatus;
  warnings: string[];
  /** `true` si esta carga escribió el documento v2 por primera vez. */
  migratedNow: boolean;
}

/** Umbral de aviso: el 80% del límite típico de 5 MB de localStorage. */
const SIZE_WARNING_BYTES = 4 * 1024 * 1024;

export class AppDataRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  get isPersistent(): boolean {
    return this.adapter.isAvailable();
  }

  /**
   * Carga los datos, migrando desde v1 si hace falta.
   *
   * ORDEN OBLIGATORIO cuando hay migración (ADR-009):
   *   1. respaldar el string CRUDO de v1,
   *   2. migrar en memoria,
   *   3. escribir el documento v2,
   *   4. NO borrar nunca el original.
   *
   * Si el respaldo falla, se sigue adelante pero SIN escribir: el usuario
   * trabaja en memoria esa sesión y sus datos originales quedan intactos. Es
   * preferible a arriesgarse a dejar el almacenamiento a medias.
   */
  async load(): Promise<LoadResult> {
    const rawV2 = await this.adapter.getItem(STORAGE_KEY);
    if (rawV2 !== null) {
      const parsed = safeParse(rawV2);
      const result = runMigrations(parsed.ok ? parsed.value : null);
      return { data: result.data, status: result.status, warnings: result.warnings, migratedNow: false };
    }

    const rawLegacy = await this.adapter.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy === null) {
      const result = runMigrations(null);
      return { data: result.data, status: result.status, warnings: result.warnings, migratedNow: false };
    }

    const parsed = safeParse(rawLegacy);
    if (!parsed.ok) {
      const result = runMigrations(undefined);
      return {
        data: result.data,
        status: 'unrecognized',
        warnings: [
          'Tus datos guardados estaban dañados y no se pudieron leer. Se abrió la app vacía; el archivo original NO se ha borrado.',
        ],
        migratedNow: false,
      };
    }

    const backedUp = await this.createBackup(rawLegacy);
    const result = runMigrations(parsed.value);
    const warnings = [...result.warnings];

    if (!backedUp) {
      warnings.push(
        'No se pudo crear la copia de seguridad previa, así que los datos migrados no se guardaron. Exporta una copia desde Ajustes.',
      );
      return { data: result.data, status: result.status, warnings, migratedNow: false };
    }

    // 'unrecognized' o 'future' no deben sobrescribir nada.
    if (result.status !== 'migrated') {
      return { data: result.data, status: result.status, warnings, migratedNow: false };
    }

    try {
      await this.save(result.data);
    } catch (error) {
      warnings.push(
        error instanceof StorageError
          ? error.message
          : 'No se pudieron guardar los datos migrados; se seguirán mostrando en memoria.',
      );
      return { data: result.data, status: result.status, warnings, migratedNow: false };
    }

    return { data: result.data, status: result.status, warnings, migratedNow: true };
  }

  /** @throws {StorageError} para que el llamador pueda avisar al usuario. */
  async save(data: AppData): Promise<{ bytes: number; nearLimit: boolean }> {
    const serialized = safeStringify(data);
    if (!serialized.ok) {
      throw new StorageError('unknown', 'Los datos no se pudieron convertir a texto para guardarlos.');
    }
    await this.adapter.setItem(STORAGE_KEY, serialized.raw);
    const bytes = approximateBytes(serialized.raw);
    return { bytes, nearLimit: bytes > SIZE_WARNING_BYTES };
  }

  /**
   * Copia el string crudo a una clave con marca de tiempo.
   *
   * Devuelve `false` en vez de lanzar: quien llama decide si eso basta para
   * abortar (la migración sí) o si puede continuar.
   */
  async createBackup(raw: string): Promise<boolean> {
    try {
      await this.adapter.setItem(`${BACKUP_KEY_PREFIX}${Date.now()}`, raw);
      return true;
    } catch {
      return false;
    }
  }

  async listBackups(): Promise<string[]> {
    const keys = await this.adapter.keys();
    return keys.filter((k) => k.startsWith(BACKUP_KEY_PREFIX)).sort().reverse();
  }

  /** JSON legible para el botón "Exportar" de Ajustes. */
  async exportJSON(): Promise<string> {
    const raw = await this.adapter.getItem(STORAGE_KEY);
    if (raw === null) return '';
    const parsed = safeParse(raw);
    return parsed.ok ? JSON.stringify(parsed.value, null, 2) : raw;
  }

  /**
   * Importa un archivo exportado. Pasa por la MISMA cadena de migraciones que
   * la carga normal, así que un respaldo antiguo se actualiza solo — no hay
   * dos caminos de entrada que puedan divergir.
   */
  importJSON(raw: string): { data: AppData; warnings: string[]; ok: boolean } {
    const parsed = safeParse(raw);
    if (!parsed.ok) {
      return {
        data: runMigrations(null).data,
        warnings: ['El archivo no es un JSON válido.'],
        ok: false,
      };
    }
    const result = runMigrations(parsed.value);
    const ok = result.status === 'current' || result.status === 'migrated';
    return {
      data: result.data,
      warnings: ok ? result.warnings : [...result.warnings, 'El archivo no contiene datos de Mis Gastos.'],
      ok,
    };
  }

  /**
   * Borra SÓLO el documento v2.
   *
   * Ni el blob de v1 ni los respaldos se tocan: son la red de seguridad y
   * borrarlos convertiría un "empezar de cero" en una pérdida irreversible.
   */
  async clear(): Promise<void> {
    await this.adapter.removeItem(STORAGE_KEY);
  }
}
