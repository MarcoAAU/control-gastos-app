import { describe, expect, it } from 'vitest';
import { SYSTEM_CATEGORY_ADJUSTMENT } from '@/constants';
import type { Account, Transaction, TransactionType } from '@/models';
import { periodTotals } from '@/services/metrics/periodTotals';
import { computeAccountBalance } from './computeAccountBalance';
import { solveAdjustment } from './solveAdjustment';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  LA PRUEBA MÁS IMPORTANTE DEL PROYECTO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La queja original del usuario era que los gastos "vaciaban los ingresos".
 * La causa fue mezclar STOCK (saldo) con FLUJO (ingresos/gastos del periodo).
 * El modelo nuevo los separa, y "ajustar saldo" es justo la operación donde
 * ambos se tocan: mueve el stock sin ser flujo.
 *
 * Por eso el invariante se fija AQUÍ, en la fase que introduce el ajuste, y no
 * más adelante: una prueba escrita después de que algo se rompa no es una
 * prueba, es una autopsia.
 */

const account: Account = {
  id: 'acc-1',
  name: 'Cuenta principal',
  bankId: 'bancolombia',
  type: 'savings',
  color: '#6c8dff',
  icon: 'bank',
  initialBalance: 1_000_000,
  initialBalanceDate: '2026-01-01',
  includeInTotals: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

let counter = 0;

function tx(
  type: TransactionType,
  amount: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  counter++;
  return {
    id: `tx-${counter}`,
    type,
    amount,
    date: '2026-08-05',
    time: '00:00',
    accountId: account.id,
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Reproduce lo que hace `transactionsSlice.adjustAccountBalance`, para poder
 * probar el ciclo completo sin montar el store.
 *
 * ⚠️ Es una RÉPLICA, y una réplica puede desviarse del original sin que nadie
 * se entere: entonces estos tests seguirían en verde mientras la app hace otra
 * cosa. Lo que impide esa deriva es el test
 * `el ajuste que registra el store coincide con el que calcula solveAdjustment`
 * de `store/store.test.ts`, que compara la salida real del slice contra
 * `solveAdjustment`. Si tocas una, ese test avisa.
 */
function buildAdjustment(currentBalance: number, targetBalance: number): Transaction | null {
  const plan = solveAdjustment(currentBalance, targetBalance);
  if (!plan.needed || plan.direction === null) return null;
  return tx(plan.direction, plan.amount, {
    categoryId: SYSTEM_CATEGORY_ADJUSTMENT,
    description: 'Ajuste de saldo',
    source: 'adjustment',
    isAdjustment: true,
  });
}

describe('solveAdjustment — el cálculo', () => {
  it('no propone nada cuando la cuenta ya cuadra', () => {
    expect(solveAdjustment(1_000_000, 1_000_000)).toMatchObject({
      needed: false,
      direction: null,
      amount: 0,
    });
  });

  it('propone un ingreso cuando hay MÁS dinero del que dice el libro', () => {
    expect(solveAdjustment(900_000, 1_000_000)).toMatchObject({
      needed: true,
      direction: 'income',
      amount: 100_000,
      delta: 100_000,
    });
  });

  it('propone un gasto cuando hay MENOS dinero del que dice el libro', () => {
    expect(solveAdjustment(1_000_000, 900_000)).toMatchObject({
      needed: true,
      direction: 'expense',
      amount: 100_000,
      delta: -100_000,
    });
  });

  it('cuadra una tarjeta de crédito contra un saldo negativo', () => {
    expect(solveAdjustment(-420_000, -500_000)).toMatchObject({
      direction: 'expense',
      amount: 80_000,
    });
  });

  it('sabe llevar un saldo negativo hasta cero', () => {
    expect(solveAdjustment(-420_000, 0)).toMatchObject({
      direction: 'income',
      amount: 420_000,
    });
  });

  it('ignora una diferencia de céntimos en vez de ensuciar el historial', () => {
    // El peso colombiano no usa céntimos: un ajuste de $0 sería basura visible.
    expect(solveAdjustment(1_000_000, 1_000_000.4).needed).toBe(false);
  });

  it('no propone ajustes imposibles a partir de entradas no numéricas', () => {
    expect(solveAdjustment(Number.NaN, 1000).needed).toBe(false);
    expect(solveAdjustment(1000, Number.POSITIVE_INFINITY).needed).toBe(false);
  });
});

describe('AJUSTE — INVARIANTE 1: cuadra exactamente, y borrarlo revierte', () => {
  it('tras el ajuste, el saldo derivado es EXACTAMENTE el que pidió el usuario', () => {
    const book = [tx('income', 500_000), tx('expense', 120_000)];
    const before = computeAccountBalance(account, book);
    expect(before).toBe(1_380_000);

    const adjustment = buildAdjustment(before, 1_500_000);
    expect(adjustment).not.toBeNull();

    expect(computeAccountBalance(account, [...book, adjustment!])).toBe(1_500_000);
  });

  it('borrar el ajuste devuelve el saldo al valor anterior, sin residuos', () => {
    // Ésta es la propiedad que v1 no tenía: allí `acc.balance = X` no se podía
    // deshacer porque no quedaba constancia de cuánto había antes.
    const book = [tx('income', 500_000), tx('expense', 120_000)];
    const before = computeAccountBalance(account, book);

    const adjustment = buildAdjustment(before, 1_500_000)!;
    const withAdjustment = [...book, adjustment];
    const withoutAdjustment = withAdjustment.filter((t) => t.id !== adjustment.id);

    expect(computeAccountBalance(account, withoutAdjustment)).toBe(before);
  });

  it('ajustar dos veces seguidas deja el saldo en el último objetivo', () => {
    const book = [tx('expense', 300_000)];
    const first = buildAdjustment(computeAccountBalance(account, book), 2_000_000)!;
    const bookAfterFirst = [...book, first];
    const second = buildAdjustment(computeAccountBalance(account, bookAfterFirst), 1_750_000)!;

    expect(computeAccountBalance(account, [...bookAfterFirst, second])).toBe(1_750_000);
  });

  it('cuadrar una cuenta que ya cuadra no registra ningún movimiento', () => {
    const book = [tx('income', 200_000)];
    expect(buildAdjustment(computeAccountBalance(account, book), 1_200_000)).toBeNull();
  });
});

describe('AJUSTE — INVARIANTE 2: un ajuste NUNCA es un ingreso ni un gasto', () => {
  it('un ajuste al alza no aparece como ingreso del periodo', () => {
    const book = [tx('income', 500_000), tx('expense', 120_000)];
    const flowBefore = periodTotals(book);

    const adjustment = buildAdjustment(computeAccountBalance(account, book), 5_000_000)!;
    const flowAfter = periodTotals([...book, adjustment]);

    // El saldo sube más de tres millones…
    expect(computeAccountBalance(account, [...book, adjustment])).toBe(5_000_000);
    // …y los ingresos del periodo NO se mueven ni un peso.
    expect(flowAfter).toEqual(flowBefore);
  });

  it('un ajuste a la baja no aparece como gasto del periodo', () => {
    const book = [tx('income', 500_000)];
    const flowBefore = periodTotals(book);

    const adjustment = buildAdjustment(computeAccountBalance(account, book), 100_000)!;
    const flowAfter = periodTotals([...book, adjustment]);

    expect(adjustment.type).toBe('expense');
    expect(flowAfter.expense).toBe(flowBefore.expense);
    expect(flowAfter).toEqual(flowBefore);
  });

  it('el ajuste tampoco cuenta como movimiento en el recuento del periodo', () => {
    const book = [tx('income', 500_000), tx('expense', 120_000)];
    const adjustment = buildAdjustment(computeAccountBalance(account, book), 9_000_000)!;

    expect(periodTotals([...book, adjustment]).count).toBe(2);
  });

  it('SÍ mueve el saldo: excluirlo del flujo no es excluirlo de la contabilidad', () => {
    // El error contrario también sería un fallo: un ajuste que no mueve nada
    // no serviría para cuadrar la cuenta.
    const adjustment = buildAdjustment(1_000_000, 1_400_000)!;
    expect(computeAccountBalance(account, [adjustment])).toBe(1_400_000);
  });
});

describe('AJUSTE — el movimiento que se registra', () => {
  it('queda marcado y clasificado como ajuste, no como un gasto cualquiera', () => {
    const adjustment = buildAdjustment(1_000_000, 800_000)!;

    expect(adjustment.isAdjustment).toBe(true);
    expect(adjustment.source).toBe('adjustment');
    // La categoría de sistema es lo que permite encontrarlos y explicarlos;
    // el formulario de movimientos no la ofrece (se filtra por `isSystem`).
    expect(adjustment.categoryId).toBe(SYSTEM_CATEGORY_ADJUSTMENT);
  });

  it('guarda el importe en positivo y el sentido en el tipo', () => {
    // Invariante de todo el modelo: `amount` nunca es negativo (ADR-005).
    const down = buildAdjustment(1_000_000, 800_000)!;
    expect(down.amount).toBeGreaterThan(0);
    expect(down.type).toBe('expense');
  });
});
