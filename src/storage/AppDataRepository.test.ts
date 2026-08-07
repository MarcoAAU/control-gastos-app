import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BACKUP_KEY_PREFIX, LEGACY_STORAGE_KEY, STORAGE_KEY } from '@/constants';
import { AppDataRepository } from './AppDataRepository';
import { createMemoryAdapter } from './adapters/memoryAdapter';
import { StorageError, type StorageAdapter } from './StorageAdapter';
import { detectVersion } from './migrations/detectVersion';
import { runMigrations } from './migrations';

const legacyRaw = readFileSync(
  fileURLToPath(new URL('../../docs/fixtures/legacy-sample.json', import.meta.url)),
  'utf8',
);

/** Adaptador que falla al escribir, para probar los caminos de error. */
function failingAdapter(reason: 'quota-exceeded' | 'unavailable', seed?: Record<string, string>): StorageAdapter {
  const inner = createMemoryAdapter(seed);
  return {
    ...inner,
    async setItem() {
      throw new StorageError(reason, 'fallo simulado');
    },
  };
}

describe('detectVersion', () => {
  it('reconoce el blob de v1 por su forma, no por una versión declarada', () => {
    expect(detectVersion(JSON.parse(legacyRaw))).toBe(1);
  });

  it('lee la versión declarada de un documento v2', () => {
    expect(detectVersion({ schemaVersion: 2, accounts: [] })).toBe(2);
  });

  it('devuelve null ante algo que no son datos de esta app', () => {
    for (const value of [null, 42, 'texto', [], {}, { foo: 'bar' }]) {
      expect(detectVersion(value)).toBeNull();
    }
  });
});

describe('runMigrations', () => {
  it('sin datos, arranca vacío y con las semillas puestas', () => {
    const result = runMigrations(null);
    expect(result.status).toBe('empty');
    expect(result.data.transactions).toEqual([]);
    expect(result.data.categories.length).toBeGreaterThan(0);
  });

  it('migra un blob v1 y marca el estado como migrado', () => {
    const result = runMigrations(JSON.parse(legacyRaw));
    expect(result.status).toBe('migrated');
    expect(result.detectedVersion).toBe(1);
    expect(result.data.schemaVersion).toBe(2);
  });

  it('deja intacto un documento que ya está en la versión actual', () => {
    const migrated = runMigrations(JSON.parse(legacyRaw)).data;
    const again = runMigrations(migrated);
    expect(again.status).toBe('current');
    expect(again.data).toBe(migrated);
  });

  it('no toca datos escritos por una versión FUTURA de la app', () => {
    const result = runMigrations({ schemaVersion: 99, accounts: [] });
    expect(result.status).toBe('future');
    expect(result.warnings[0]).toContain('versión más reciente');
  });

  it('ante datos irreconocibles arranca vacío y avisa, sin borrar nada', () => {
    const result = runMigrations({ cualquier: 'cosa' });
    expect(result.status).toBe('unrecognized');
    expect(result.warnings).toHaveLength(1);
  });
});

describe('AppDataRepository.load — migración desde v1', () => {
  it('respalda el blob crudo ANTES de escribir la versión migrada', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    const repo = new AppDataRepository(adapter);

    const result = await repo.load();

    expect(result.status).toBe('migrated');
    expect(result.migratedNow).toBe(true);

    const backups = await repo.listBackups();
    expect(backups).toHaveLength(1);
    // El respaldo es el ORIGINAL byte a byte, no una reserialización.
    expect(await adapter.getItem(backups[0]!)).toBe(legacyRaw);
  });

  it('NUNCA borra el blob de v1', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    await new AppDataRepository(adapter).load();
    expect(await adapter.getItem(LEGACY_STORAGE_KEY)).toBe(legacyRaw);
  });

  it('deja escrito el documento v2 y en la siguiente carga ya no migra', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    const repo = new AppDataRepository(adapter);
    await repo.load();

    expect(await adapter.getItem(STORAGE_KEY)).not.toBeNull();

    const second = await repo.load();
    expect(second.status).toBe('current');
    expect(second.migratedNow).toBe(false);
    // Y no genera un segundo respaldo.
    expect(await repo.listBackups()).toHaveLength(1);
  });

  it('si el respaldo falla, NO escribe nada y lo dice', async () => {
    const repo = new AppDataRepository(
      failingAdapter('quota-exceeded', { [LEGACY_STORAGE_KEY]: legacyRaw }),
    );
    const result = await repo.load();

    expect(result.migratedNow).toBe(false);
    expect(result.warnings.some((w) => w.includes('copia de seguridad'))).toBe(true);
    // Aun así devuelve los datos migrados: el usuario puede trabajar y exportar.
    expect(result.data.accounts.length).toBeGreaterThan(0);
  });

  it('con datos v1 corruptos arranca vacío sin borrar el original', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: '{"accounts": [tru' });
    const result = await new AppDataRepository(adapter).load();

    expect(result.status).toBe('unrecognized');
    expect(result.data.transactions).toEqual([]);
    expect(await adapter.getItem(LEGACY_STORAGE_KEY)).toBe('{"accounts": [tru');
  });

  it('sin nada guardado, arranca como instalación nueva', async () => {
    const result = await new AppDataRepository(createMemoryAdapter()).load();
    expect(result.status).toBe('empty');
    expect(result.data.accounts).toEqual([]);
  });
});

describe('AppDataRepository.save', () => {
  it('hace ida y vuelta sin perder datos', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    const repo = new AppDataRepository(adapter);
    const { data } = await repo.load();

    const reloaded = await repo.load();
    expect(reloaded.data.transactions).toEqual(data.transactions);
    expect(reloaded.data.accounts).toEqual(data.accounts);
  });

  it('propaga el error de cuota con su causa clasificada', async () => {
    const repo = new AppDataRepository(failingAdapter('quota-exceeded'));
    const { data } = runMigrations(null);
    await expect(repo.save(data)).rejects.toMatchObject({ reason: 'quota-exceeded' });
  });

  it('informa del tamaño para poder avisar antes de llenar la cuota', async () => {
    const repo = new AppDataRepository(createMemoryAdapter());
    const { bytes, nearLimit } = await repo.save(runMigrations(null).data);
    expect(bytes).toBeGreaterThan(0);
    expect(nearLimit).toBe(false);
  });
});

describe('AppDataRepository — exportar e importar', () => {
  it('exporta un JSON legible y lo vuelve a importar sin pérdidas', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    const repo = new AppDataRepository(adapter);
    const { data } = await repo.load();

    const exported = await repo.exportJSON();
    expect(exported).toContain('\n'); // indentado

    const imported = repo.importJSON(exported);
    expect(imported.ok).toBe(true);
    expect(imported.data.transactions).toEqual(data.transactions);
  });

  it('un export ANTIGUO en formato v1 se actualiza al importarlo', async () => {
    // Mismo camino que la carga normal: no hay dos rutas de entrada que puedan
    // divergir con el tiempo.
    const imported = new AppDataRepository(createMemoryAdapter()).importJSON(legacyRaw);
    expect(imported.ok).toBe(true);
    expect(imported.data.schemaVersion).toBe(2);
  });

  it('rechaza un archivo que no es JSON', () => {
    const result = new AppDataRepository(createMemoryAdapter()).importJSON('no soy json');
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toContain('JSON válido');
  });

  it('rechaza un JSON válido que no son datos de la app', () => {
    const result = new AppDataRepository(createMemoryAdapter()).importJSON('{"hola":"mundo"}');
    expect(result.ok).toBe(false);
  });
});

describe('AppDataRepository.clear', () => {
  it('borra el documento v2 pero conserva v1 y los respaldos', async () => {
    const adapter = createMemoryAdapter({ [LEGACY_STORAGE_KEY]: legacyRaw });
    const repo = new AppDataRepository(adapter);
    await repo.load();

    await repo.clear();

    expect(await adapter.getItem(STORAGE_KEY)).toBeNull();
    expect(await adapter.getItem(LEGACY_STORAGE_KEY)).toBe(legacyRaw);
    expect((await adapter.keys()).some((k) => k.startsWith(BACKUP_KEY_PREFIX))).toBe(true);
  });
});

describe('AppDataRepository — almacenamiento no disponible', () => {
  it('carga vacío y se declara no persistente en vez de romperse', async () => {
    const adapter: StorageAdapter = {
      ...createMemoryAdapter(),
      isAvailable: () => false,
    };
    const repo = new AppDataRepository(adapter);
    expect(repo.isPersistent).toBe(false);
    const result = await repo.load();
    expect(result.status).toBe('empty');
  });
});
