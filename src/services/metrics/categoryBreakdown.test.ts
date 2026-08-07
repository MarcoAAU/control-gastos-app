import { describe, expect, it } from 'vitest';
import type { Category, ID, Transaction, TransactionType } from '@/models';
import { categoryBreakdown, dailySeries } from './categoryBreakdown';

let counter = 0;

function tx(
  type: TransactionType,
  amount: number,
  categoryId: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  counter++;
  return {
    id: `tx-${counter}`,
    type,
    amount,
    date: '2026-08-05',
    time: '00:00',
    accountId: 'acc-1',
    categoryId,
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

function category(id: string, name: string, color: string): Category {
  return {
    id,
    name,
    color,
    icon: 'cat-otros',
    kind: 'expense',
    isBuiltIn: true,
    isSystem: false,
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
  };
}

const categoryById = new Map<ID, Category>([
  ['comida', category('comida', 'Comida', '#ff8a5c')],
  ['transporte', category('transporte', 'Transporte', '#6c8dff')],
]);

describe('categoryBreakdown', () => {
  it('agrupa por categoría y ordena de mayor a menor', () => {
    const result = categoryBreakdown(
      [tx('expense', 30_000, 'transporte'), tx('expense', 100_000, 'comida')],
      categoryById,
    );
    expect(result.map((s) => s.categoryId)).toEqual(['comida', 'transporte']);
    expect(result[0]!.total).toBe(100_000);
  });

  it('los porcentajes suman 100', () => {
    const result = categoryBreakdown(
      [tx('expense', 75_000, 'comida'), tx('expense', 25_000, 'transporte')],
      categoryById,
    );
    expect(result[0]!.percentage).toBe(75);
    expect(result.reduce((s, x) => s + x.percentage, 0)).toBeCloseTo(100);
  });

  it('no incluye categorías sin movimientos', () => {
    // Una leyenda con quince entradas a 0% no informa y ocupa media pantalla.
    const result = categoryBreakdown([tx('expense', 50_000, 'comida')], categoryById);
    expect(result).toHaveLength(1);
  });

  it('sin gastos devuelve una lista vacía, no una división por cero', () => {
    const result = categoryBreakdown([], categoryById);
    expect(result).toEqual([]);
  });

  it('excluye los ingresos cuando se piden gastos', () => {
    const result = categoryBreakdown(
      [tx('expense', 50_000, 'comida'), tx('income', 900_000, 'comida')],
      categoryById,
    );
    expect(result[0]!.total).toBe(50_000);
  });

  it('EXCLUYE LOS AJUSTES: no son un gasto de ninguna categoría', () => {
    const result = categoryBreakdown(
      [
        tx('expense', 50_000, 'comida'),
        tx('expense', 3_000_000, 'sys_ajuste', { isAdjustment: true }),
      ],
      categoryById,
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.percentage).toBe(100);
  });

  it('respeta el rango de fechas, con ambos extremos incluidos', () => {
    const result = categoryBreakdown(
      [
        tx('expense', 10_000, 'comida', { date: '2026-07-31' }),
        tx('expense', 20_000, 'comida', { date: '2026-08-01' }),
        tx('expense', 40_000, 'comida', { date: '2026-08-31' }),
        tx('expense', 80_000, 'comida', { date: '2026-09-01' }),
      ],
      categoryById,
      { range: { from: '2026-08-01', to: '2026-08-31' } },
    );
    expect(result[0]!.total).toBe(60_000);
  });

  it('una categoría borrada se degrada a un rótulo legible, no a undefined', () => {
    const result = categoryBreakdown([tx('expense', 10_000, 'ya-no-existe')], categoryById);
    expect(result[0]!.name).toBe('Sin categoría');
    expect(result[0]!.color).toMatch(/^#/);
  });
});

describe('dailySeries', () => {
  const days = ['2026-08-01', '2026-08-02', '2026-08-03'];

  it('devuelve un punto por día, incluidos los días SIN movimientos', () => {
    // Si un día vacío desapareciera, el eje se comprimiría y dos semanas
    // parecerían cinco días.
    const series = dailySeries([tx('expense', 10_000, 'comida', { date: '2026-08-02' })], days);
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.expense)).toEqual([0, 10_000, 0]);
  });

  it('conserva el orden de los días que recibe', () => {
    expect(dailySeries([], days).map((p) => p.date)).toEqual(days);
  });

  it('separa ingresos de gastos en el mismo día', () => {
    const series = dailySeries(
      [
        tx('expense', 10_000, 'comida', { date: '2026-08-01' }),
        tx('income', 500_000, 'salario', { date: '2026-08-01' }),
      ],
      days,
    );
    expect(series[0]).toEqual({ date: '2026-08-01', income: 500_000, expense: 10_000 });
  });

  it('ignora los movimientos fuera de la ventana', () => {
    const series = dailySeries([tx('expense', 99_000, 'comida', { date: '2025-01-01' })], days);
    expect(series.every((p) => p.expense === 0)).toBe(true);
  });

  it('excluye los ajustes', () => {
    const series = dailySeries(
      [tx('income', 3_000_000, 'sys_ajuste', { date: '2026-08-01', isAdjustment: true })],
      days,
    );
    expect(series[0]!.income).toBe(0);
  });

  it('sin días devuelve una serie vacía', () => {
    expect(dailySeries([tx('expense', 1000, 'comida')], [])).toEqual([]);
  });
});
