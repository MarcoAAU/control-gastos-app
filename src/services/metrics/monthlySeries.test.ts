import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import { lastMonths } from '@/services/periods/getPeriodRange';
import { monthLabel, monthlySeries } from './monthlySeries';

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 10_000,
    date: '2026-08-10',
    time: '00:00',
    accountId: 'acc1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('lastMonths', () => {
  it('devuelve los meses en orden, terminando en el de referencia', () => {
    expect(lastMonths(3, '2026-08-15')).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('cruza el cambio de año', () => {
    expect(lastMonths(3, '2026-01-10')).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('el día del mes de referencia da igual', () => {
    expect(lastMonths(2, '2026-08-01')).toEqual(lastMonths(2, '2026-08-31'));
  });
});

describe('monthlySeries', () => {
  const meses = ['2026-06', '2026-07', '2026-08'];

  it('agrupa ingresos y gastos por mes', () => {
    const data = [
      tx({ id: 'a', date: '2026-07-05', amount: 100_000 }),
      tx({ id: 'b', date: '2026-07-20', amount: 50_000 }),
      tx({ id: 'c', date: '2026-08-01', type: 'income', amount: 2_400_000 }),
    ];
    expect(monthlySeries(data, meses)).toEqual([
      { month: '2026-06', label: 'jun', income: 0, expense: 0 },
      { month: '2026-07', label: 'jul', income: 0, expense: 150_000 },
      { month: '2026-08', label: 'ago', income: 2_400_000, expense: 0 },
    ]);
  });

  it('los meses SIN movimientos siguen en la serie, a cero', () => {
    // Si desaparecieran, el eje se comprimiría y medio año parecería un
    // trimestre.
    const serie = monthlySeries([], meses);
    expect(serie).toHaveLength(3);
    expect(serie.every((p) => p.income === 0 && p.expense === 0)).toBe(true);
  });

  it('excluye los ajustes de saldo', () => {
    // Un ajuste al alza dibujaría una barra de "ingresos" del tamaño del
    // descuadre el mes en que se cuadró la cuenta.
    const data = [tx({ id: 'aj', date: '2026-08-03', type: 'income', amount: 900_000, isAdjustment: true })];
    expect(monthlySeries(data, meses)[2]?.income).toBe(0);
  });

  it('descarta lo que cae fuera de la ventana', () => {
    const data = [tx({ id: 'viejo', date: '2025-01-10', amount: 500_000 })];
    expect(monthlySeries(data, meses).reduce((s, p) => s + p.expense, 0)).toBe(0);
  });

  it('agrupa por prefijo de cadena: ningún movimiento cambia de mes', () => {
    // Sin construir Date no hay conversión de zona horaria que pueda mover el
    // día 1 al mes anterior (ADR-006).
    const data = [
      tx({ id: 'primero', date: '2026-08-01', amount: 1_000 }),
      tx({ id: 'ultimo', date: '2026-07-31', amount: 2_000 }),
    ];
    const serie = monthlySeries(data, meses);
    expect(serie[1]?.expense).toBe(2_000);
    expect(serie[2]?.expense).toBe(1_000);
  });
});

describe('monthLabel', () => {
  it('traduce la clave a un rótulo corto', () => {
    expect(monthLabel('2026-01')).toBe('ene');
    expect(monthLabel('2026-12')).toBe('dic');
  });

  it('una clave malformada se devuelve tal cual, sin romper el eje', () => {
    expect(monthLabel('basura')).toBe('basura');
  });
});
