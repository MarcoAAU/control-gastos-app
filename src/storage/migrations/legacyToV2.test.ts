import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LEGACY_CATEGORY_IDS,
  SYSTEM_ACCOUNT_UNASSIGNED,
  SYSTEM_BANK_NONE,
  SYSTEM_CATEGORY_UNCATEGORIZED,
} from '@/constants';
import { computeAccountBalance } from '@/services/balance/computeAccountBalance';
import { legacyToV2 } from './legacyToV2';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Los tests más importantes del proyecto.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aquí no se comprueba que el código "haga algo": se comprueba que el dinero
 * del usuario sobreviva al cambio de modelo de datos. Si alguno de estos falla
 * en el futuro, NO se actualiza el test — se revierte el cambio.
 */

function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`../../../docs/fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

interface LegacyAccount {
  id: string;
  nickname: string;
  balance: number;
}

function legacyAccounts(fixture: unknown): LegacyAccount[] {
  return (fixture as { accounts: LegacyAccount[] }).accounts;
}

const sample = loadFixture('legacy-sample.json');
const edgeCases = loadFixture('legacy-edge-cases.json');

describe('legacyToV2 — GARANTÍA 2: el saldo visible no cambia', () => {
  it('cada cuenta del caso feliz conserva EXACTAMENTE su saldo de v1', () => {
    const { data } = legacyToV2(sample);

    for (const legacy of legacyAccounts(sample)) {
      const account = data.accounts.find((a) => a.id === legacy.id);
      expect(account, `falta la cuenta ${legacy.nickname}`).toBeDefined();
      const derived = computeAccountBalance(account!, data.transactions);
      expect(derived, `saldo de "${legacy.nickname}"`).toBe(legacy.balance);
    }
  });

  it('conserva el saldo también en los casos borde (negativo, sin movimientos, con registros descartados)', () => {
    const { data } = legacyToV2(edgeCases);

    for (const legacy of legacyAccounts(edgeCases)) {
      const account = data.accounts.find((a) => a.id === legacy.id);
      expect(account, `falta la cuenta ${legacy.nickname}`).toBeDefined();
      const derived = computeAccountBalance(account!, data.transactions);
      expect(derived, `saldo de "${legacy.nickname}"`).toBe(legacy.balance);
    }
  });

  it('no emite ningún aviso de descuadre de saldo', () => {
    for (const fixture of [sample, edgeCases]) {
      const { warnings } = legacyToV2(fixture);
      expect(warnings.filter((w) => w.includes('no coincide tras migrar'))).toEqual([]);
    }
  });

  it('una cuenta sin movimientos conserva su saldo como saldo inicial', () => {
    const { data } = legacyToV2(edgeCases);
    const account = data.accounts.find((a) => a.id === 'acc_sin_movimientos');
    expect(account?.initialBalance).toBe(500000);
  });

  it('acepta un saldo inicial negativo si es lo que implica el libro', () => {
    // La tarjeta de crédito tiene -1.250.000 y un gasto de 45.000: su saldo
    // inicial despejado es aún más negativo. Es correcto, no un error.
    const { data } = legacyToV2(edgeCases);
    const account = data.accounts.find((a) => a.id === 'acc_negativo');
    expect(account!.initialBalance).toBeLessThan(0);
    expect(computeAccountBalance(account!, data.transactions)).toBe(-1250000);
  });
});

describe('legacyToV2 — GARANTÍA 1: no se pierde ningún movimiento recuperable', () => {
  it('migra todos los movimientos del caso feliz', () => {
    const { data, warnings } = legacyToV2(sample);
    const original = (sample as { transactions: unknown[] }).transactions.length;
    expect(data.transactions).toHaveLength(original);
    expect(warnings).toEqual([]);
  });

  it('reasigna a "Sin asignar" —y no descarta— un movimiento con cuenta inexistente', () => {
    const { data } = legacyToV2(edgeCases);
    const tx = data.transactions.find((t) => t.id === 'tx_cuenta_huerfana');
    expect(tx, 'el movimiento huérfano se perdió').toBeDefined();
    expect(tx?.accountId).toBe(SYSTEM_ACCOUNT_UNASSIGNED);
    expect(data.accounts.some((a) => a.id === SYSTEM_ACCOUNT_UNASSIGNED)).toBe(true);
  });

  it('la cuenta "Sin asignar" queda fuera del saldo total', () => {
    const { data } = legacyToV2(edgeCases);
    const unassigned = data.accounts.find((a) => a.id === SYSTEM_ACCOUNT_UNASSIGNED);
    expect(unassigned?.includeInTotals).toBe(false);
  });

  it('reetiqueta —y no descarta— un movimiento con categoría desconocida', () => {
    const { data } = legacyToV2(edgeCases);
    const tx = data.transactions.find((t) => t.id === 'tx_categoria_desconocida');
    expect(tx?.categoryId).toBe(SYSTEM_CATEGORY_UNCATEGORIZED);
  });

  it('asume gasto en un movimiento sin campo type', () => {
    const { data } = legacyToV2(edgeCases);
    const tx = data.transactions.find((t) => t.id === 'tx_sin_type');
    expect(tx?.type).toBe('expense');
  });

  it('conserva un movimiento con descripción vacía', () => {
    const { data } = legacyToV2(edgeCases);
    expect(data.transactions.some((t) => t.id === 'tx_sin_desc')).toBe(true);
  });

  it('conserva el HTML de una descripción como TEXTO, sin interpretarlo', () => {
    // React escapa al renderizar, así que el dato se guarda tal cual y el
    // self-XSS de v1 (§16 de la auditoría) desaparece por construcción.
    const { data } = legacyToV2(edgeCases);
    const tx = data.transactions.find((t) => t.id === 'tx_desc_con_html');
    expect(tx?.description).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('legacyToV2 — descarte de lo irrecuperable', () => {
  const invalidAmountIds = [
    'tx_amount_cero',
    'tx_amount_negativo',
    'tx_amount_null',
    'tx_amount_texto',
  ];

  it('descarta exactamente los 4 movimientos con importe inválido, y ninguno más', () => {
    const { data } = legacyToV2(edgeCases);
    const migratedIds = new Set(data.transactions.map((t) => t.id));
    for (const id of invalidAmountIds) {
      expect(migratedIds.has(id), `${id} no debería haberse migrado`).toBe(false);
    }
    const originalCount = (edgeCases as { transactions: unknown[] }).transactions.length;
    expect(data.transactions).toHaveLength(originalCount - invalidAmountIds.length);
  });

  it('avisa de cada descarte con nombre, para que el usuario pueda rehacerlo', () => {
    const { warnings } = legacyToV2(edgeCases);
    const descartes = warnings.filter((w) => w.includes('se descartó'));
    expect(descartes).toHaveLength(invalidAmountIds.length);
    expect(descartes.every((w) => w.includes('importe no era válido'))).toBe(true);
  });

  it('un registro corrupto NO aborta el lote completo', () => {
    const { data } = legacyToV2(edgeCases);
    expect(data.transactions.some((t) => t.id === 'tx_ingreso_valido')).toBe(true);
    expect(data.transactions.some((t) => t.id === 'tx_gasto_valido')).toBe(true);
  });
});

describe('legacyToV2 — bancos', () => {
  it('crea un banco reutilizable a partir del texto libre de v1', () => {
    const { data } = legacyToV2(edgeCases);
    const bank = data.banks.find((b) => b.name === 'Scotiabank Colpatria');
    expect(bank, 'no se creó el banco escrito a mano').toBeDefined();
    expect(bank?.isBuiltIn).toBe(false);
    const account = data.accounts.find((a) => a.id === 'acc_manual');
    expect(account?.bankId).toBe(bank?.id);
  });

  it('no duplica bancos ni ids', () => {
    const { data } = legacyToV2(edgeCases);
    const ids = data.banks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const nombres = data.banks.map((b) => b.name.toLowerCase());
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('conserva el bankId original cuando es uno de los conocidos', () => {
    const { data } = legacyToV2(sample);
    const account = data.accounts.find((a) => a.id === 'acc_bancolombia');
    expect(account?.bankId).toBe('bancolombia');
  });

  it('traduce el bankId "manual" de v1 a "Sin banco" cuando no hay nombre real', () => {
    const { data } = legacyToV2({
      accounts: [
        { id: 'a1', bankId: 'manual', bankName: 'Manual', type: 'Efectivo', nickname: 'Efectivo', balance: 1000 },
      ],
    });
    expect(data.accounts[0]?.bankId).toBe(SYSTEM_BANK_NONE);
  });
});

describe('legacyToV2 — cuentas', () => {
  it('traduce las etiquetas de tipo de v1 a la unión cerrada', () => {
    const { data } = legacyToV2(sample);
    expect(data.accounts.find((a) => a.id === 'acc_bancolombia')?.type).toBe('savings');
    expect(data.accounts.find((a) => a.id === 'acc_nu')?.type).toBe('credit');
  });

  it('mapea a "other" un tipo que no existía en el <select> de v1', () => {
    const { data } = legacyToV2(edgeCases);
    expect(data.accounts.find((a) => a.id === 'acc_tipo_desconocido')?.type).toBe('other');
  });

  it('conserva el emoji de v1 como icono, sin traducirlo', () => {
    const { data } = legacyToV2(sample);
    expect(data.accounts.find((a) => a.id === 'acc_bancolombia')?.icon).toBe('🏦');
  });

  it('usa como fecha de saldo inicial la del movimiento más antiguo de la cuenta', () => {
    const { data } = legacyToV2(sample);
    const account = data.accounts.find((a) => a.id === 'acc_bancolombia');
    const fechas = data.transactions
      .filter((t) => t.accountId === 'acc_bancolombia')
      .map((t) => t.date)
      .sort();
    expect(account?.initialBalanceDate).toBe(fechas[0]);
  });
});

describe('legacyToV2 — categorías', () => {
  it('siembra todas las categorías que los movimientos de v1 pueden referenciar', () => {
    const { data } = legacyToV2(sample);
    const ids = new Set(data.categories.map((c) => c.id));
    for (const id of LEGACY_CATEGORY_IDS) {
      expect(ids.has(id), `falta ${id}`).toBe(true);
    }
  });

  it('ningún movimiento migrado apunta a una categoría inexistente', () => {
    for (const fixture of [sample, edgeCases]) {
      const { data } = legacyToV2(fixture);
      const ids = new Set(data.categories.map((c) => c.id));
      for (const tx of data.transactions) {
        expect(ids.has(tx.categoryId), `${tx.id} → ${tx.categoryId}`).toBe(true);
      }
    }
  });

  it('ningún movimiento migrado apunta a una cuenta inexistente', () => {
    for (const fixture of [sample, edgeCases]) {
      const { data } = legacyToV2(fixture);
      const ids = new Set(data.accounts.map((a) => a.id));
      for (const tx of data.transactions) {
        expect(ids.has(tx.accountId), `${tx.id} → ${tx.accountId}`).toBe(true);
      }
    }
  });
});

describe('legacyToV2 — historial', () => {
  it('respeta los totales congelados en vez de recalcularlos', () => {
    const { data } = legacyToV2(sample);
    const entry = data.history.find((h) => h.id === 'hist_001');
    expect(entry?.totals).toEqual({ income: 2980000, expense: 1312000, balance: 1668000 });
  });

  it('marca las entradas migradas como legacy, para poder avisar de que "Ingresos" significaba otra cosa', () => {
    const { data } = legacyToV2(sample);
    expect(data.history.every((h) => h.origin === 'legacy')).toBe(true);
  });

  it('deriva los totales de las entradas guardadas antes de que v1 los congelara', () => {
    const { data } = legacyToV2(edgeCases);
    const entry = data.history.find((h) => h.id === 'hist_sin_totales');
    expect(entry, 'se perdió el historial sin totales').toBeDefined();
    const esperado = entry!.transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    expect(entry!.totals.expense).toBe(esperado);
  });

  it('copia los movimientos del snapshot en vez de referenciarlos', () => {
    const { data } = legacyToV2(sample);
    const entry = data.history.find((h) => h.id === 'hist_001');
    const copia = entry!.transactions[0]!;
    const original = data.transactions.find((t) => t.id === copia.id);
    expect(original).toBeDefined();
    expect(copia).not.toBe(original); // referencias distintas
  });
});

describe('legacyToV2 — entradas degeneradas', () => {
  it('no revienta con un objeto vacío', () => {
    const { data, warnings } = legacyToV2({});
    expect(data.accounts).toEqual([]);
    expect(data.transactions).toEqual([]);
    expect(warnings).toEqual([]);
    expect(data.categories.length).toBeGreaterThan(0); // las semillas sí están
  });

  it('no revienta con null, con un array ni con tipos equivocados en las colecciones', () => {
    for (const input of [null, undefined, [], { accounts: 'no soy un array', transactions: 42 }]) {
      expect(() => legacyToV2(input)).not.toThrow();
    }
  });

  it('omite cuentas sin id en vez de crear registros fantasma', () => {
    const { data, warnings } = legacyToV2({ accounts: [{ nickname: 'Sin id', balance: 100 }] });
    expect(data.accounts).toEqual([]);
    expect(warnings.some((w) => w.includes('sin identificador'))).toBe(true);
  });

  it('marca el resultado como migrado desde legacy', () => {
    const { data } = legacyToV2(sample);
    expect(data.meta.migratedFrom).toBe('legacy');
    expect(data.schemaVersion).toBe(2);
  });

  it('no crea cuentas ni movimientos de demostración', () => {
    // El usuario pidió explícitamente que la app no invente datos.
    const { data } = legacyToV2({});
    expect(data.accounts).toHaveLength(0);
    expect(data.transactions).toHaveLength(0);
  });
});
