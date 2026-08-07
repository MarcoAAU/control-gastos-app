import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPES } from '@/models';
import { ACCOUNT_TYPE_META } from './accountTypes';
import { resolveIcon } from './icons';
import { PALETTE } from './palette';
import { LEGACY_MANUAL_BANK_ID, SEED_BANKS } from './seedBanks';
import { LEGACY_CATEGORY_IDS, SEED_CATEGORIES } from './seedCategories';
import {
  SYSTEM_CATEGORY_ADJUSTMENT,
  SYSTEM_CATEGORY_UNCATEGORIZED,
} from './systemIds';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Estos tests no comprueban "que las constantes estén bien escritas": protegen
 * el CONTRATO con los datos que el usuario ya tiene guardados. Si alguien
 * renombra un id de categoría, los movimientos de v1 que lo referencian
 * quedarían huérfanos al migrar y el usuario vería su historial vacío. Aquí es
 * donde eso se detiene.
 */

describe('SEED_CATEGORIES — contrato con los datos de v1', () => {
  it('conserva todos los ids que v1 podía haber guardado en categoryId', () => {
    const ids = new Set(SEED_CATEGORIES.map((c) => c.id));
    const faltantes = LEGACY_CATEGORY_IDS.filter((id) => !ids.has(id));
    expect(faltantes).toEqual([]);
  });

  it('mantiene los 13 ids literales de app.js:5-22 sin renombrar', () => {
    // Lista congelada. Si este test falla es porque alguien cambió un id:
    // NO se arregla actualizando la lista, se arregla revirtiendo el cambio.
    expect(LEGACY_CATEGORY_IDS).toEqual([
      'comida',
      'transporte',
      'vivienda',
      'entretenimiento',
      'salud',
      'compras',
      'servicios',
      'otros',
      'salario',
      'freelance',
      'regalo',
      'inversion',
      'otro_ingreso',
    ]);
  });

  it('clasifica como ingreso exactamente las 5 categorías que v1 tenía en INCOME_CATEGORIES', () => {
    const ingresos = SEED_CATEGORIES.filter((c) => c.kind === 'income').map((c) => c.id);
    expect(ingresos.sort()).toEqual(
      ['salario', 'freelance', 'regalo', 'inversion', 'otro_ingreso'].sort(),
    );
  });

  it('clasifica como gasto exactamente las 8 categorías que v1 tenía en CATEGORIES', () => {
    const gastos = SEED_CATEGORIES.filter((c) => c.kind === 'expense').map((c) => c.id);
    expect(gastos.sort()).toEqual(
      [
        'comida',
        'transporte',
        'vivienda',
        'entretenimiento',
        'salud',
        'compras',
        'servicios',
        'otros',
      ].sort(),
    );
  });
});

describe('SEED_CATEGORIES — integridad', () => {
  it('no repite ids', () => {
    const ids = SEED_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no repite valores de order (el orden de los selectores sería inestable)', () => {
    const orders = SEED_CATEGORIES.map((c) => c.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('usa colores hexadecimales válidos', () => {
    for (const c of SEED_CATEGORIES) {
      expect(c.color, `categoría ${c.id}`).toMatch(HEX);
    }
  });

  it('usa claves de icono que existen de verdad en el registro', () => {
    // Un icono semilla no puede caer en el fallback a texto: se vería la
    // cadena "cat-comida" escrita en pantalla.
    for (const c of SEED_CATEGORIES) {
      expect(resolveIcon(c.icon), `categoría ${c.id} → icono ${c.icon}`).toBeDefined();
    }
  });

  it('incluye las dos categorías de sistema y las marca como tales', () => {
    for (const id of [SYSTEM_CATEGORY_ADJUSTMENT, SYSTEM_CATEGORY_UNCATEGORIZED]) {
      const cat = SEED_CATEGORIES.find((c) => c.id === id);
      expect(cat, `falta la categoría de sistema ${id}`).toBeDefined();
      expect(cat?.isSystem).toBe(true);
    }
  });

  it('no marca como sistema ninguna categoría del usuario', () => {
    const sistema = SEED_CATEGORIES.filter((c) => c.isSystem).map((c) => c.id);
    expect(sistema.sort()).toEqual(
      [SYSTEM_CATEGORY_ADJUSTMENT, SYSTEM_CATEGORY_UNCATEGORIZED].sort(),
    );
  });
});

describe('SEED_BANKS', () => {
  it('conserva los ids de DEMO_BANKS que las cuentas de v1 referencian', () => {
    const ids = new Set(SEED_BANKS.map((b) => b.id));
    for (const id of ['bancolombia', 'davivienda', 'bbva', 'nu']) {
      expect(ids.has(id), `falta el banco ${id}`).toBe(true);
    }
  });

  it('no reutiliza el id "manual" de v1 como banco real', () => {
    // 'manual' no era un banco: era el marcador de "sin entidad". Si existiera
    // como banco, la migración lo trataría como uno más.
    expect(SEED_BANKS.some((b) => b.id === LEGACY_MANUAL_BANK_ID)).toBe(false);
  });

  it('no repite ids y usa colores válidos', () => {
    const ids = SEED_BANKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of SEED_BANKS) {
      expect(b.color, `banco ${b.id}`).toMatch(HEX);
      expect(resolveIcon(b.icon), `banco ${b.id} → icono ${b.icon}`).toBeDefined();
    }
  });
});

describe('ACCOUNT_TYPE_META', () => {
  it('cubre todos los tipos de cuenta declarados', () => {
    for (const type of ACCOUNT_TYPES) {
      expect(ACCOUNT_TYPE_META[type], `falta metadato de ${type}`).toBeDefined();
    }
    expect(Object.keys(ACCOUNT_TYPE_META).sort()).toEqual([...ACCOUNT_TYPES].sort());
  });

  it('no repite legacyLabel (la migración quedaría ambigua)', () => {
    const labels = Object.values(ACCOUNT_TYPE_META)
      .map((m) => m.legacyLabel)
      .filter((l): l is string => l !== null);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('cubre las 5 etiquetas exactas del <select> de v1', () => {
    const labels = Object.values(ACCOUNT_TYPE_META).map((m) => m.legacyLabel);
    for (const legacy of [
      'Cuenta de ahorros',
      'Cuenta corriente',
      'Tarjeta de crédito',
      'Efectivo',
      'Otro',
    ]) {
      expect(labels).toContain(legacy);
    }
  });

  it('sólo espera saldo negativo en tarjetas de crédito', () => {
    const negativos = ACCOUNT_TYPES.filter((t) => ACCOUNT_TYPE_META[t].negativeIsExpected);
    expect(negativos).toEqual(['credit']);
  });
});

describe('PALETTE', () => {
  it('no repite colores y todos son hexadecimales válidos', () => {
    expect(new Set(PALETTE).size).toBe(PALETTE.length);
    for (const color of PALETTE) {
      expect(color).toMatch(HEX);
    }
  });

  it('empieza por los 8 colores que v1 asignaba a sus categorías', () => {
    expect(PALETTE.slice(0, 8)).toEqual([
      '#ff8a5c',
      '#6c8dff',
      '#4bd9c0',
      '#c084fc',
      '#ff6b7a',
      '#ffd166',
      '#5eead4',
      '#93a2c6',
    ]);
  });
});
