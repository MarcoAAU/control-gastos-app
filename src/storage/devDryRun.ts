/* eslint-disable no-console -- Herramienta de diagnóstico: su salida ES la interfaz. */

import { LEGACY_STORAGE_KEY, STORAGE_KEY } from '@/constants';
import { computeAccountBalance } from '@/services/balance/computeAccountBalance';
import { createLocalStorageAdapter } from './adapters/localStorageAdapter';
import { safeParse } from './serialization';
import { runMigrations } from './migrations';

/**
 * ENSAYO EN SECO DE LA MIGRACIÓN. Sólo existe en desarrollo.
 *
 * Lee el blob v1 REAL del navegador, lo migra EN MEMORIA y compara saldo por
 * saldo — sin escribir absolutamente nada. Es el paso que el plan exige antes
 * de confiar la migración a los datos reales del usuario: los fixtures prueban
 * los casos que imaginamos, esto prueba el caso que existe.
 *
 * Uso: abrir la consola del navegador y ejecutar
 *
 *     await __migrationDryRun()
 *
 * Si la columna "coincide" sale ✅ en todas las filas, la migración es segura.
 */
export async function migrationDryRun(): Promise<void> {
  const adapter = createLocalStorageAdapter();

  if (!adapter.isAvailable()) {
    console.error('[dry-run] El almacenamiento del navegador no está disponible.');
    return;
  }

  const alreadyMigrated = await adapter.getItem(STORAGE_KEY);
  if (alreadyMigrated !== null) {
    console.warn(
      '[dry-run] Ya existe un documento v2. Este ensayo lee el blob v1 original de todos modos y NO modifica nada.',
    );
  }

  const raw = await adapter.getItem(LEGACY_STORAGE_KEY);
  if (raw === null) {
    console.warn(`[dry-run] No hay datos de v1 en "${LEGACY_STORAGE_KEY}" en este origen.`);
    return;
  }

  console.log(`[dry-run] Blob v1: ${raw.length} caracteres (~${Math.round((raw.length * 2) / 1024)} KB).`);

  const parsed = safeParse(raw);
  if (!parsed.ok) {
    console.error('[dry-run] ❌ El blob v1 no es JSON válido. La app arrancaría vacía sin borrarlo.');
    return;
  }

  const legacy = parsed.value as {
    accounts?: { id: string; nickname?: string; balance?: number }[];
    transactions?: unknown[];
    history?: unknown[];
  };

  const result = runMigrations(parsed.value);

  console.log(
    `[dry-run] Estado: ${result.status} · movimientos v1: ${legacy.transactions?.length ?? 0} → v2: ${result.data.transactions.length}`,
  );

  const filas = (legacy.accounts ?? []).map((legacyAccount) => {
    const migrated = result.data.accounts.find((a) => a.id === legacyAccount.id);
    const derived = migrated ? computeAccountBalance(migrated, result.data.transactions) : null;
    const antes = legacyAccount.balance ?? 0;
    return {
      cuenta: legacyAccount.nickname ?? legacyAccount.id,
      'saldo v1': antes,
      'saldo v2 (derivado)': derived,
      'saldo inicial calculado': migrated?.initialBalance ?? null,
      coincide: derived !== null && Math.abs(derived - antes) <= 1 ? '✅' : '❌',
    };
  });

  console.table(filas);

  const fallos = filas.filter((f) => f.coincide === '❌');
  if (fallos.length > 0) {
    console.error(`[dry-run] ❌ ${fallos.length} cuenta(s) NO cuadran. NO migrar todavía.`);
  } else {
    console.log('[dry-run] ✅ Todos los saldos coinciden. La migración es segura.');
  }

  if (result.warnings.length > 0) {
    console.warn(`[dry-run] ${result.warnings.length} aviso(s):`);
    for (const warning of result.warnings) console.warn('  ·', warning);
  } else {
    console.log('[dry-run] Sin avisos: no se descartó ni se reasignó ningún registro.');
  }

  console.log('[dry-run] No se ha escrito nada. Tus datos siguen exactamente igual.');
}

/** Expone la función en la consola. Se llama sólo bajo `import.meta.env.DEV`. */
export function registerDryRun(): void {
  (globalThis as unknown as Record<string, unknown>)['__migrationDryRun'] = migrationDryRun;
  console.log('[dev] Ensayo de migración disponible: await __migrationDryRun()');
}
