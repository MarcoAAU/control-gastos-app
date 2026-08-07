import type { AppData } from '@/models';

/**
 * Copia de seguridad manual: exportar e importar el JSON completo.
 *
 * ── POR QUÉ ESTO EXISTE EN LA FASE 9 Y NO MÁS TARDE ───────────────────────
 * Es la única adición de funcionalidad de toda la etapa de paridad, y está
 * justificada: la Fase 10 despliega la migración v1 → v2 sobre los datos
 * REALES del usuario, y regenerar el APK toca el almacenamiento del WebView.
 * Antes de eso el usuario tiene que poder sacar sus datos de la app y
 * guardarlos donde quiera. Un respaldo que sólo vive dentro de la propia app
 * no protege del escenario que hay que cubrir.
 */

/** Formato del archivo. Va dentro para poder migrar respaldos viejos. */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  format: 'mis-gastos-backup';
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  data: AppData;
}

export function buildBackup(data: AppData, appVersion: string): BackupFile {
  return {
    format: 'mis-gastos-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data,
  };
}

/** `mis-gastos-2026-08-06.json` — con fecha, para no sobrescribir el anterior. */
export function backupFileName(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `mis-gastos-${yyyy}-${mm}-${dd}.json`;
}

export type ImportResult =
  | { ok: true; data: AppData; warnings: string[] }
  | { ok: false; error: string };

/**
 * Lee un archivo de respaldo.
 *
 * ⚠️ DESCONFÍA DEL ARCHIVO. Puede estar truncado, ser de otra app, o venir de
 * una versión futura. Todo error se convierte en un mensaje explicable, nunca
 * en una excepción: si esto lanzara, el usuario perdería la pantalla entera
 * por haber elegido el archivo equivocado.
 *
 * No sustituye a la validación del repositorio — quien llame debe pasar el
 * resultado por los type guards antes de darlo por bueno.
 */
export function parseBackup(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido. ¿Seguro que es un respaldo?' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'El archivo está vacío o no tiene el formato esperado.' };
  }

  const candidate = parsed as Partial<BackupFile> & { accounts?: unknown };
  const warnings: string[] = [];

  // Un export directo de `AppData` (sin envoltorio) también se acepta: es lo
  // que alguien copiaría a mano desde las herramientas del navegador, y
  // rechazarlo sería puntilloso sin ganar nada.
  const data = (candidate.data ?? parsed) as AppData;

  if (typeof data !== 'object' || data === null || !Array.isArray(data.accounts)) {
    return {
      ok: false,
      error: 'El archivo no contiene datos de Mis Gastos (no se encontraron cuentas).',
    };
  }

  if (candidate.format && candidate.format !== 'mis-gastos-backup') {
    return { ok: false, error: 'El archivo parece ser de otra aplicación.' };
  }

  if (
    typeof candidate.formatVersion === 'number' &&
    candidate.formatVersion > BACKUP_FORMAT_VERSION
  ) {
    // No se aborta: los datos probablemente se lean igual. Se avisa para que,
    // si algo falta, el usuario sepa por qué.
    warnings.push(
      'El respaldo se creó con una versión más nueva de la app. Puede que algún dato no se importe.',
    );
  }

  for (const key of ['transactions', 'categories', 'banks'] as const) {
    if (!Array.isArray(data[key])) {
      warnings.push(`El respaldo no traía "${key}"; esa parte quedará vacía.`);
    }
  }

  return { ok: true, data, warnings };
}
