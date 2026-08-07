import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, parseBackup } from './exportAppData';
import { createEmptyAppData } from '@/storage/migrations';

describe('buildBackup', () => {
  it('envuelve los datos con formato y versión reconocibles', () => {
    const backup = buildBackup(createEmptyAppData(), '2.0.0');
    expect(backup.format).toBe('mis-gastos-backup');
    expect(backup.formatVersion).toBe(1);
    expect(backup.data.schemaVersion).toBe(2);
  });
});

describe('backupFileName', () => {
  it('lleva la fecha para no sobrescribir el respaldo anterior', () => {
    expect(backupFileName(new Date(2026, 7, 6))).toBe('mis-gastos-2026-08-06.json');
  });

  it('rellena mes y día con cero a la izquierda', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('mis-gastos-2026-01-05.json');
  });
});

describe('parseBackup — archivos válidos', () => {
  it('lee un respaldo con envoltorio', () => {
    const raw = JSON.stringify(buildBackup(createEmptyAppData(), '2.0.0'));
    const result = parseBackup(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.schemaVersion).toBe(2);
  });

  it('acepta también un AppData suelto, sin envoltorio', () => {
    // Es lo que alguien copiaría a mano desde las herramientas del navegador.
    const result = parseBackup(JSON.stringify(createEmptyAppData()));
    expect(result.ok).toBe(true);
  });
});

describe('parseBackup — archivos que hay que rechazar con un mensaje', () => {
  it('un JSON roto no lanza: devuelve un motivo legible', () => {
    const result = parseBackup('{ esto no es json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/JSON/i);
  });

  it('un JSON válido pero de otra cosa se rechaza', () => {
    const result = parseBackup('{"usuarios":[]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cuentas/i);
  });

  it('un archivo de otra aplicación se identifica como tal', () => {
    const result = parseBackup(JSON.stringify({ format: 'otra-app', data: { accounts: [] } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/otra aplicación/i);
  });

  it('null y los tipos primitivos no revientan', () => {
    expect(parseBackup('null').ok).toBe(false);
    expect(parseBackup('42').ok).toBe(false);
    expect(parseBackup('"texto"').ok).toBe(false);
    expect(parseBackup('').ok).toBe(false);
  });
});

describe('parseBackup — avisos sin abortar', () => {
  it('avisa si el respaldo viene de una versión futura, pero lo importa', () => {
    const backup = { ...buildBackup(createEmptyAppData(), '2.0.0'), formatVersion: 99 };
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.join(' ')).toMatch(/más nueva/i);
  });

  it('avisa de las colecciones que faltan en vez de fallar', () => {
    const result = parseBackup(JSON.stringify({ accounts: [], schemaVersion: 2 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.length).toBeGreaterThan(0);
  });
});
