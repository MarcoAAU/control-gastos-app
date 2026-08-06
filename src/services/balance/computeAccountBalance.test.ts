import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '@/models';
import {
  computeAccountBalance,
  computeAllAccountBalances,
  computeTotalBalance,
} from './computeAccountBalance';

function account(id: string, initialBalance: number, includeInTotals = true): Account {
  return {
    id,
    name: id,
    bankId: 'sys_sin_banco',
    type: 'savings',
    color: '#6c8dff',
    icon: 'wallet',
    initialBalance,
    initialBalanceDate: '2026-01-01',
    includeInTotals,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
  };
}

function tx(
  id: string,
  accountId: string,
  type: Transaction['type'],
  amount: number,
  isAdjustment = false,
): Transaction {
  return {
    id,
    type,
    amount,
    date: '2026-06-15',
    time: '00:00',
    accountId,
    categoryId: type === 'income' ? 'salario' : 'otros',
    subcategoryId: null,
    description: id,
    notes: '',
    source: isAdjustment ? 'adjustment' : 'manual',
    isAdjustment,
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
  };
}

describe('computeAccountBalance', () => {
  it('parte del saldo inicial cuando no hay movimientos', () => {
    expect(computeAccountBalance(account('a', 500000), [])).toBe(500000);
  });

  it('suma ingresos y resta gastos', () => {
    const txs = [tx('t1', 'a', 'income', 100), tx('t2', 'a', 'expense', 30)];
    expect(computeAccountBalance(account('a', 1000), txs)).toBe(1070);
  });

  it('ignora los movimientos de otras cuentas', () => {
    const txs = [tx('t1', 'a', 'income', 100), tx('t2', 'b', 'income', 999999)];
    expect(computeAccountBalance(account('a', 0), txs)).toBe(100);
  });

  it('puede dar negativo (una tarjeta de crédito con deuda)', () => {
    expect(computeAccountBalance(account('a', 0), [tx('t1', 'a', 'expense', 420000)])).toBe(
      -420000,
    );
  });

  it('SÍ cuenta los ajustes: mover el saldo es exactamente su razón de ser', () => {
    // Contrapartida del invariante 42: el ajuste afecta al STOCK. Lo que NO
    // debe hacer es aparecer en los ingresos/gastos del periodo (FLUJO), y de
    // eso responde services/metrics. Ver ADR-003 / ADR-004.
    const ajuste = tx('adj', 'a', 'income', 50000, true);
    expect(computeAccountBalance(account('a', 10000), [ajuste])).toBe(60000);
  });
});

describe('computeAllAccountBalances', () => {
  it('da el mismo resultado que calcular cuenta por cuenta', () => {
    const accounts = [account('a', 1000), account('b', -500), account('c', 0)];
    const txs = [
      tx('t1', 'a', 'income', 300),
      tx('t2', 'a', 'expense', 120),
      tx('t3', 'b', 'expense', 80),
    ];
    const bulk = computeAllAccountBalances(accounts, txs);
    for (const acc of accounts) {
      expect(bulk.get(acc.id)).toBe(computeAccountBalance(acc, txs));
    }
  });

  it('incluye las cuentas sin movimientos', () => {
    const balances = computeAllAccountBalances([account('sola', 777)], []);
    expect(balances.get('sola')).toBe(777);
  });

  it('no explota si un movimiento apunta a una cuenta que no existe', () => {
    const balances = computeAllAccountBalances(
      [account('a', 100)],
      [tx('t1', 'fantasma', 'expense', 50)],
    );
    expect(balances.get('a')).toBe(100);
    expect(balances.has('fantasma')).toBe(false);
  });
});

describe('computeTotalBalance', () => {
  it('suma sólo las cuentas marcadas para el total', () => {
    const accounts = [account('a', 1000), account('b', 500, false)];
    expect(computeTotalBalance(accounts, [])).toBe(1000);
  });

  it('refleja los movimientos de las cuentas incluidas', () => {
    const accounts = [account('a', 1000), account('b', 2000)];
    const txs = [tx('t1', 'a', 'expense', 300), tx('t2', 'b', 'income', 500)];
    expect(computeTotalBalance(accounts, txs)).toBe(1000 - 300 + 2000 + 500);
  });

  it('vale 0 sin cuentas', () => {
    expect(computeTotalBalance([], [])).toBe(0);
  });
});
