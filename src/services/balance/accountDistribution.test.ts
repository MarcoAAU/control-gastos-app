import { describe, expect, it } from 'vitest';
import type { Account } from '@/models';
import { accountDistribution } from './accountDistribution';

function account(id: string, name: string, includeInTotals = true): Account {
  return {
    id,
    name,
    bankId: 'b1',
    type: 'savings',
    color: '#ffd400',
    icon: 'bank',
    initialBalance: 0,
    initialBalanceDate: '2026-01-01',
    includeInTotals,
    createdAt: '',
    updatedAt: '',
    archivedAt: null,
  };
}

describe('accountDistribution', () => {
  it('reparte el saldo positivo en porcentajes que suman 100', () => {
    const cuentas = [account('a', 'Ahorros'), account('b', 'Efectivo')];
    const saldos = new Map([['a', 750_000], ['b', 250_000]]);
    const { entries, totalPositive } = accountDistribution(cuentas, saldos);
    expect(totalPositive).toBe(1_000_000);
    expect(entries.map((e) => e.share)).toEqual([75, 25]);
  });

  it('ordena de mayor a menor saldo', () => {
    const cuentas = [account('a', 'Poca'), account('b', 'Mucha')];
    const saldos = new Map([['a', 10_000], ['b', 900_000]]);
    expect(accountDistribution(cuentas, saldos).entries.map((e) => e.name)).toEqual([
      'Mucha',
      'Poca',
    ]);
  });

  /**
   * EL CASO QUE ROMPE UNA TARTA. Con +3.400.000 y −420.000, la "parte del
   * total" de la tarjeta sale negativa y las dos porciones suman más del 100%.
   * Aquí el porcentaje se calcula sólo sobre lo positivo y la deuda se marca.
   */
  it('una cuenta en negativo no recibe porcentaje: se marca como deuda', () => {
    const cuentas = [account('ahorro', 'Ahorros'), account('tarjeta', 'Tarjeta')];
    const saldos = new Map([['ahorro', 3_400_000], ['tarjeta', -420_000]]);
    const { entries, totalPositive, totalDebt } = accountDistribution(cuentas, saldos);

    const tarjeta = entries.find((e) => e.name === 'Tarjeta');
    expect(tarjeta?.isDebt).toBe(true);
    expect(tarjeta?.share).toBe(0);
    expect(tarjeta?.balance).toBe(-420_000);

    // El denominador NO incluye la deuda: el 100% es el dinero disponible.
    expect(totalPositive).toBe(3_400_000);
    expect(totalDebt).toBe(420_000);
    expect(entries.find((e) => e.name === 'Ahorros')?.share).toBe(100);
  });

  it('excluye las cuentas que no cuentan para el total', () => {
    // Si una cuenta está fuera del saldo total, verla repartiéndoselo sería
    // contradictorio.
    const cuentas = [account('a', 'Dentro'), account('b', 'Fuera', false)];
    const saldos = new Map([['a', 100_000], ['b', 900_000]]);
    const { entries, totalPositive } = accountDistribution(cuentas, saldos);
    expect(entries.map((e) => e.name)).toEqual(['Dentro']);
    expect(totalPositive).toBe(100_000);
  });

  it('con todo a cero no divide por cero', () => {
    const cuentas = [account('a', 'Vacía')];
    const { entries, totalPositive } = accountDistribution(cuentas, new Map([['a', 0]]));
    expect(totalPositive).toBe(0);
    expect(entries[0]?.share).toBe(0);
    expect(Number.isFinite(entries[0]?.share ?? NaN)).toBe(true);
  });

  it('una cuenta sin saldo calculado se trata como cero, no como undefined', () => {
    const { entries } = accountDistribution([account('a', 'Nueva')], new Map());
    expect(entries[0]?.balance).toBe(0);
  });

  it('sin cuentas devuelve una distribución vacía', () => {
    expect(accountDistribution([], new Map())).toEqual({
      entries: [],
      totalPositive: 0,
      totalDebt: 0,
    });
  });
});
