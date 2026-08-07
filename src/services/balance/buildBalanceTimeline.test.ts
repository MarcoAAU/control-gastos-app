import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import { buildBalanceTimeline } from './buildBalanceTimeline';

function account(id: string, initialBalance: number, includeInTotals = true) {
  return { id, initialBalance, includeInTotals };
}

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 10_000,
    date: '2026-08-02',
    time: '00:00',
    accountId: 'acc1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    ...overrides,
  };
}

const DIAS = ['2026-08-01', '2026-08-02', '2026-08-03'];

describe('buildBalanceTimeline', () => {
  it('parte del saldo inicial y acumula día a día', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 1_000_000)],
      [tx({ id: 'a', date: '2026-08-02', amount: 300_000 })],
      DIAS,
    );
    expect(serie.map((p) => p.balance)).toEqual([1_000_000, 700_000, 700_000]);
  });

  /**
   * EL ERROR QUE ESTE TEST IMPIDE: si lo anterior a la ventana no se sumara al
   * punto de partida, la línea arrancaría en 0 y subiría hasta el saldo real,
   * dibujando una ganancia espectacular que nunca existió.
   */
  it('el primer día YA incluye todo lo anterior a la ventana', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 1_000_000)],
      [tx({ id: 'viejo', date: '2026-07-15', amount: 400_000 })],
      DIAS,
    );
    expect(serie[0]?.balance).toBe(600_000);
  });

  it('un día sin movimientos mantiene el saldo, no lo pone a cero', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 500_000)],
      [tx({ id: 'a', date: '2026-08-01', amount: 100_000 })],
      DIAS,
    );
    expect(serie.map((p) => p.balance)).toEqual([400_000, 400_000, 400_000]);
  });

  it('los ingresos suman y los gastos restan', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 0)],
      [
        tx({ id: 'in', date: '2026-08-01', type: 'income', amount: 900_000 }),
        tx({ id: 'out', date: '2026-08-03', amount: 200_000 }),
      ],
      DIAS,
    );
    expect(serie.map((p) => p.balance)).toEqual([900_000, 900_000, 700_000]);
  });

  it('los AJUSTES sí cuentan: su razón de ser es mover el saldo', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 100_000)],
      [tx({ id: 'aj', date: '2026-08-02', type: 'income', amount: 50_000, isAdjustment: true })],
      DIAS,
    );
    expect(serie[2]?.balance).toBe(150_000);
  });

  it('las cuentas excluidas del total no mueven la línea', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 100_000), account('oculta', 9_000_000, false)],
      [tx({ id: 'a', accountId: 'oculta', date: '2026-08-02', amount: 1_000_000 })],
      DIAS,
    );
    expect(serie.every((p) => p.balance === 100_000)).toBe(true);
  });

  it('un movimiento posterior a la ventana no adelanta la línea', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 100_000)],
      [tx({ id: 'futuro', date: '2026-09-01', amount: 50_000 })],
      DIAS,
    );
    expect(serie[2]?.balance).toBe(100_000);
  });

  it('un movimiento de una cuenta inexistente se ignora', () => {
    const serie = buildBalanceTimeline(
      [account('acc1', 100_000)],
      [tx({ id: 'huerfano', accountId: 'fantasma', amount: 50_000 })],
      DIAS,
    );
    expect(serie[2]?.balance).toBe(100_000);
  });

  it('sin días devuelve una serie vacía en vez de romper', () => {
    expect(buildBalanceTimeline([account('acc1', 1)], [], [])).toEqual([]);
  });

  it('el último punto coincide con el saldo total del día', () => {
    // El invariante que ata la gráfica a la cifra de la cabecera: si no
    // cuadraran, el usuario vería dos saldos distintos en la misma pantalla.
    const cuentas = [account('acc1', 1_000_000), account('acc2', -200_000)];
    const movimientos = [
      tx({ id: 'a', date: '2026-07-01', amount: 100_000 }),
      tx({ id: 'b', date: '2026-08-02', accountId: 'acc2', type: 'income', amount: 50_000 }),
    ];
    const serie = buildBalanceTimeline(cuentas, movimientos, DIAS);
    const saldoTotal = 1_000_000 - 200_000 - 100_000 + 50_000;
    expect(serie[serie.length - 1]?.balance).toBe(saldoTotal);
  });
});
