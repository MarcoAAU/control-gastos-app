/**
 * Claves de almacenamiento.
 *
 * Centralizadas porque un error de tecleo en una de ellas equivale a perder
 * los datos del usuario en silencio. Sólo `storage/` las usa.
 */

/**
 * Blob de v1. ⚠️ NO SE BORRA NUNCA, ni siquiera tras migrar con éxito.
 * Es el seguro de vida del usuario: mientras siga ahí, cualquier fallo de la
 * migración es recuperable. Ocupa unos pocos KB. Ver ADR-009.
 */
export const LEGACY_STORAGE_KEY = 'gastos_app_data_v1';

/** Documento `AppData` actual. */
export const STORAGE_KEY = 'gastos_app_data_v2';

/**
 * Prefijo de los respaldos automáticos previos a una migración:
 * `gastos_app_backup_<timestamp>`. Se listan en Ajustes para poder restaurar.
 */
export const BACKUP_KEY_PREFIX = 'gastos_app_backup_';

/** Marca de que ya se mostró el aviso posterior a la migración. */
export const MIGRATION_NOTICE_KEY = 'gastos_app_migration_notice_seen';
