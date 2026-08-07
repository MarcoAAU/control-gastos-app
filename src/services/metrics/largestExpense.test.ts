import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import { largestExpense } from './largestExpense';

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

describe('largestExpense', () => {
  it('devuelve el gasto mayor', () => {
    const data = [tx({ id: 'a', amount: 50_000 }), tx({ id: 'b', amount: 900_000 })];
    expect(largestExpense(data)?.id).toBe('b');
  });

  it('ignora los ingresos por grandes que sean', () => {
    const data = [tx({ id: 'sueldo', type: 'income', amount: 5_000_000 }), tx({ id: 'gasto', amount: 30_000 })];
    expect(largestExpense(data)?.id).toBe('gasto');
  });

  /**
   * Un ajuste a la baja está guardado como gasto, porque así es como resta del
   * saldo. Si contara, cuadrar una cuenta descuadrada por 800.000 pondría
   * "Mayor gasto: Ajuste de saldo" en el Inicio.
   */
  it('ignora los ajustes de saldo aunque sean el importe más alto', () => {
    const data = [
      tx({ id: 'ajuste', amount: 800_000, isAdjustment: true }),
      tx({ id: 'arriendo', amount: 1_000 }),
    ];
    expect(largestExpense(data)?.id).toBe('arriendo');
  });

  it('respeta el rango de fechas', () => {
    const data = [
      tx({ id: 'julio', amount: 900_000, date: '2026-07-15' }),
      tx({ id: 'agosto', amount: 100_000, date: '2026-08-15' }),
    ];
    const enAgosto = largestExpense(data, { from: '2026-08-01', to: '2026-08-31' });
    expect(enAgosto?.id).toBe('agosto');
  });

  it('sin gastos devuelve null', () => {
    expect(largestExpense([])).toBeNull();
    expect(largestExpense([tx({ id: 'a', type: 'income' })])).toBeNull();
  });

  it('ante un empate el resultado es DETERMINISTA', () => {
    // Una tarjeta que alterna entre dos movimientos iguales al re-renderizar
    // parece un fallo.
    const data = [tx({ id: 'a', amount: 50_000 }), tx({ id: 'b', amount: 50_000 })];
    expect(largestExpense(data)?.id).toBe('a');
    expect(largestExpense(data)?.id).toBe('a');
  });
});
