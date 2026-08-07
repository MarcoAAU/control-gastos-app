import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import {
  matchesAccount,
  matchesAmount,
  matchesCategory,
  matchesDate,
  matchesSubcategory,
  matchesType,
} from './predicates';

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amount: 50000,
    date: '2026-06-15',
    time: '12:00',
    accountId: 'acc1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * LA REGLA QUE GOBIERNA TODO EL ARCHIVO: "sin criterio" es "sin restricción".
 *
 * Es la que se rompe sola —basta olvidar un `length > 0`— y cuando se rompe el
 * síntoma es que deseleccionar la última casilla deja la lista vacía, que se
 * lee como "se borraron mis movimientos".
 */
describe('todos los predicados: ausente o vacío no descarta nada', () => {
  it('criterio ausente', () => {
    expect(matchesType(tx(), undefined)).toBe(true);
    expect(matchesAccount(tx(), undefined)).toBe(true);
    expect(matchesCategory(tx(), undefined)).toBe(true);
    expect(matchesSubcategory(tx(), undefined)).toBe(true);
    expect(matchesAmount(tx(), undefined, undefined)).toBe(true);
    expect(matchesDate(tx(), {})).toBe(true);
  });

  it('lista vacía', () => {
    expect(matchesType(tx(), [])).toBe(true);
    expect(matchesAccount(tx(), [])).toBe(true);
    expect(matchesCategory(tx(), [])).toBe(true);
    expect(matchesSubcategory(tx(), [])).toBe(true);
  });
});

describe('matchesType / matchesAccount / matchesCategory', () => {
  it('acepta lo que está en la lista', () => {
    expect(matchesType(tx({ type: 'income' }), ['income'])).toBe(true);
    expect(matchesAccount(tx(), ['acc1', 'acc2'])).toBe(true);
    expect(matchesCategory(tx(), ['comida'])).toBe(true);
  });

  it('descarta lo que no está', () => {
    expect(matchesType(tx({ type: 'income' }), ['expense'])).toBe(false);
    expect(matchesAccount(tx(), ['acc9'])).toBe(false);
    expect(matchesCategory(tx(), ['transporte'])).toBe(false);
  });
});

describe('matchesSubcategory — el caso del null', () => {
  it('un movimiento SIN subcategoría no pasa un filtro de subcategoría', () => {
    // `null` no puede colarse cuando se piden subcategorías concretas: si
    // pasara, filtrar por "Gasolina" mostraría todos los gastos sin clasificar.
    expect(matchesSubcategory(tx({ subcategoryId: null }), ['sub-gasolina'])).toBe(false);
  });

  it('un movimiento con la subcategoría pedida sí pasa', () => {
    expect(matchesSubcategory(tx({ subcategoryId: 'sub-gasolina' }), ['sub-gasolina'])).toBe(true);
  });

  it('pero sin filtro puesto, el que no tiene subcategoría sigue apareciendo', () => {
    expect(matchesSubcategory(tx({ subcategoryId: null }), [])).toBe(true);
  });
});

describe('matchesDate', () => {
  it('incluye los extremos del rango', () => {
    // Quien escribe "hasta el 15" espera ver el 15.
    expect(matchesDate(tx({ date: '2026-06-15' }), { dateFrom: '2026-06-15' })).toBe(true);
    expect(matchesDate(tx({ date: '2026-06-15' }), { dateTo: '2026-06-15' })).toBe(true);
  });

  it('descarta fuera del rango', () => {
    expect(matchesDate(tx({ date: '2026-06-14' }), { dateFrom: '2026-06-15' })).toBe(false);
    expect(matchesDate(tx({ date: '2026-06-16' }), { dateTo: '2026-06-15' })).toBe(false);
  });

  it('filtra por mes y por año', () => {
    expect(matchesDate(tx(), { month: '2026-06' })).toBe(true);
    expect(matchesDate(tx(), { month: '2026-07' })).toBe(false);
    expect(matchesDate(tx(), { year: '2026' })).toBe(true);
    expect(matchesDate(tx(), { year: '2025' })).toBe(false);
  });

  it('cruza el fin de año comparando cadenas', () => {
    // La comparación lexicográfica de `yyyy-MM-dd` es cronológica; si alguien
    // la sustituyera por `Date` volvería la zona horaria (ADR-006).
    expect(matchesDate(tx({ date: '2026-01-01' }), { dateFrom: '2025-12-31' })).toBe(true);
    expect(matchesDate(tx({ date: '2025-12-31' }), { dateFrom: '2026-01-01' })).toBe(false);
  });
});

describe('matchesAmount', () => {
  it('incluye los extremos', () => {
    expect(matchesAmount(tx({ amount: 50000 }), 50000, undefined)).toBe(true);
    expect(matchesAmount(tx({ amount: 50000 }), undefined, 50000)).toBe(true);
  });

  it('descarta fuera del rango', () => {
    expect(matchesAmount(tx({ amount: 49999 }), 50000, undefined)).toBe(false);
    expect(matchesAmount(tx({ amount: 50001 }), undefined, 50000)).toBe(false);
  });

  it('un mínimo de cero SÍ es un criterio, no un "sin filtro"', () => {
    // `0` es falsy: comprobar `if (min)` en vez de `if (min !== undefined)`
    // haría desaparecer este filtro sin avisar. Aquí no descarta nada porque
    // los importes son positivos, pero el criterio debe seguir existiendo.
    expect(matchesAmount(tx({ amount: 1 }), 0, undefined)).toBe(true);
  });

  it('compara el valor absoluto: el signo lo pone el tipo', () => {
    // Un ingreso de 60.000 y un gasto de 60.000 deben responder igual a
    // "más de 50.000".
    expect(matchesAmount(tx({ type: 'income', amount: 60000 }), 50000, undefined)).toBe(true);
    expect(matchesAmount(tx({ type: 'expense', amount: 60000 }), 50000, undefined)).toBe(true);
  });
});
