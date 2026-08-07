import { describe, expect, it } from 'vitest';
import type { Transaction, TransactionType } from '@/models';
import { periodTotals } from './periodTotals';

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
    accountId: 'acc-1',
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

describe('periodTotals', () => {
  it('suma ingresos y gastos por separado', () => {
    expect(periodTotals([tx('income', 500_000), tx('expense', 120_000)])).toMatchObject({
      income: 500_000,
      expense: 120_000,
      net: 380_000,
      count: 2,
    });
  });

  it('devuelve ceros sin movimientos, no NaN', () => {
    expect(periodTotals([])).toEqual({ income: 0, expense: 0, net: 0, count: 0 });
  });

  it('el neto puede ser negativo: un mes malo no es un error de cálculo', () => {
    expect(periodTotals([tx('income', 100_000), tx('expense', 400_000)]).net).toBe(-300_000);
  });
});

describe('periodTotals — LA QUEJA ORIGINAL DEL USUARIO', () => {
  it('añadir un gasto NO reduce los ingresos del periodo', () => {
    // En v1 sí lo hacía: la tarjeta rotulada "Ingresos" mostraba en realidad la
    // suma de saldos de las cuentas (`app.js:221`), así que cada gasto la hacía
    // bajar. Ésta es la prueba directa de que eso no puede volver (ADR-003).
    const book = [tx('income', 2_000_000)];
    const before = periodTotals(book);

    const after = periodTotals([...book, tx('expense', 750_000)]);

    expect(after.income).toBe(before.income);
    expect(after.income).toBe(2_000_000);
    expect(after.expense).toBe(750_000);
  });

  it('añadir un ingreso no toca los gastos', () => {
    const book = [tx('expense', 300_000)];
    const after = periodTotals([...book, tx('income', 1_000_000)]);
    expect(after.expense).toBe(300_000);
  });
});

describe('periodTotals — ajustes', () => {
  it('excluye los ajustes de los ingresos', () => {
    const totals = periodTotals([
      tx('income', 500_000),
      tx('income', 3_000_000, { isAdjustment: true, source: 'adjustment' }),
    ]);
    expect(totals.income).toBe(500_000);
  });

  it('excluye los ajustes de los gastos', () => {
    const totals = periodTotals([
      tx('expense', 120_000),
      tx('expense', 900_000, { isAdjustment: true, source: 'adjustment' }),
    ]);
    expect(totals.expense).toBe(120_000);
  });

  it('un libro compuesto sólo de ajustes da flujo cero', () => {
    const totals = periodTotals([
      tx('income', 1_000_000, { isAdjustment: true }),
      tx('expense', 400_000, { isAdjustment: true }),
    ]);
    expect(totals).toEqual({ income: 0, expense: 0, net: 0, count: 0 });
  });
});

describe('periodTotals — rango de fechas', () => {
  const book = [
    tx('expense', 10_000, { date: '2026-07-31' }),
    tx('expense', 20_000, { date: '2026-08-01' }),
    tx('expense', 30_000, { date: '2026-08-15' }),
    tx('expense', 40_000, { date: '2026-08-31' }),
    tx('expense', 50_000, { date: '2026-09-01' }),
  ];

  it('incluye AMBOS extremos del rango', () => {
    // Un rango con el último día excluido dejaría fuera los gastos del 31 y el
    // total de agosto saldría mal cada mes. Se fija explícitamente.
    const totals = periodTotals(book, { from: '2026-08-01', to: '2026-08-31' });
    expect(totals.expense).toBe(90_000);
    expect(totals.count).toBe(3);
  });

  it('deja fuera lo anterior y lo posterior al rango', () => {
    const totals = periodTotals(book, { from: '2026-08-15', to: '2026-08-15' });
    expect(totals.expense).toBe(30_000);
  });

  it('un rango sin movimientos da ceros', () => {
    expect(periodTotals(book, { from: '2026-10-01', to: '2026-10-31' }).count).toBe(0);
  });

  it('sin rango cuenta todo lo que recibe', () => {
    expect(periodTotals(book).count).toBe(5);
  });

  it('el rango no salva a un ajuste: sigue excluido aunque caiga dentro', () => {
    const totals = periodTotals(
      [...book, tx('income', 5_000_000, { date: '2026-08-10', isAdjustment: true })],
      { from: '2026-08-01', to: '2026-08-31' },
    );
    expect(totals.income).toBe(0);
  });
});
