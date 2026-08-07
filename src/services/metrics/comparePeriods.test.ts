import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import { comparePeriods, computeChange } from './comparePeriods';

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 100_000,
    date: '2026-08-05',
    time: '00:00',
    accountId: 'acc1',
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

describe('computeChange', () => {
  it('calcula la variación absoluta y el porcentaje', () => {
    expect(computeChange(120_000, 100_000)).toEqual({
      absolute: 20_000,
      percentage: 20,
      direction: 'up',
    });
  });

  it('detecta la bajada', () => {
    const cambio = computeChange(80_000, 100_000);
    expect(cambio.direction).toBe('down');
    expect(cambio.percentage).toBe(-20);
  });

  it('sin cambio, la dirección es plana', () => {
    expect(computeChange(100_000, 100_000).direction).toBe('flat');
  });

  /**
   * LAS TRES SALIDAS TENTADORAS SON MENTIRA:
   *   Infinity → se pinta tal cual en la tarjeta.
   *   100%     → afirma que se duplicó algo que no había.
   *   0%       → afirma que no cambió nada, cuando cambió todo.
   */
  it('con periodo anterior en cero, el porcentaje es null', () => {
    const cambio = computeChange(340_000, 0);
    expect(cambio.percentage).toBeNull();
    // El importe absoluto SÍ existe: "sin datos del mes pasado, +$340.000"
    // informa; "+∞%" no.
    expect(cambio.absolute).toBe(340_000);
    expect(cambio.direction).toBe('up');
  });

  it('nunca devuelve Infinity ni NaN', () => {
    for (const [a, b] of [[100, 0], [0, 0], [-50, 0]]) {
      const p = computeChange(a!, b!).percentage;
      expect(p === null || Number.isFinite(p)).toBe(true);
    }
  });

  /**
   * Con un balance anterior NEGATIVO, dividir por él sin valor absoluto
   * invierte el signo: pasar de −100.000 a −200.000 (empeorar) saldría como
   * "+100%" de mejora.
   */
  it('un periodo anterior negativo no invierte el signo de la variación', () => {
    const cambio = computeChange(-200_000, -100_000);
    expect(cambio.direction).toBe('down');
    expect(cambio.percentage).toBe(-100);
  });

  it('recuperarse desde un balance negativo sale como subida', () => {
    const cambio = computeChange(50_000, -100_000);
    expect(cambio.direction).toBe('up');
    expect(cambio.percentage).toBe(150);
  });
});

describe('comparePeriods', () => {
  const AGOSTO = { from: '2026-08-01', to: '2026-08-07' };
  const JULIO = { from: '2026-07-01', to: '2026-07-07' };

  const data = [
    tx({ id: 'j1', date: '2026-07-03', amount: 200_000 }),
    tx({ id: 'j2', date: '2026-07-05', type: 'income', amount: 1_000_000 }),
    // Fuera del tramo recortado: 20 de julio no entra en el 1–7.
    tx({ id: 'j3', date: '2026-07-20', amount: 900_000 }),
    tx({ id: 'a1', date: '2026-08-02', amount: 300_000 }),
    tx({ id: 'a2', date: '2026-08-04', type: 'income', amount: 1_200_000 }),
  ];

  it('compara sólo dentro de cada rango', () => {
    const c = comparePeriods(data, AGOSTO, JULIO);
    expect(c.current.expense).toBe(300_000);
    // Si el recorte no se respetara, aquí saldrían 1.100.000.
    expect(c.previous.expense).toBe(200_000);
  });

  it('devuelve la variación de ingresos, gastos y balance', () => {
    const c = comparePeriods(data, AGOSTO, JULIO);
    expect(c.income.absolute).toBe(200_000);
    expect(c.expense.absolute).toBe(100_000);
    expect(c.net.absolute).toBe(100_000);
  });

  it('los ajustes de saldo quedan fuera de los dos lados', () => {
    // Si contaran, cuadrar una cuenta se vería como un ingreso enorme y la
    // comparación del mes saldría disparada sin que entrara dinero.
    const conAjuste = [
      ...data,
      tx({ id: 'aj', date: '2026-08-03', type: 'income', amount: 5_000_000, isAdjustment: true }),
    ];
    expect(comparePeriods(conAjuste, AGOSTO, JULIO).current.income).toBe(1_200_000);
  });

  it('un periodo anterior vacío no rompe nada', () => {
    // Es el caso NORMAL del primer mes de uso de la app.
    const soloAgosto = data.filter((t) => t.date.startsWith('2026-08'));
    const c = comparePeriods(soloAgosto, AGOSTO, JULIO);
    expect(c.previous.count).toBe(0);
    expect(c.income.percentage).toBeNull();
    expect(c.expense.percentage).toBeNull();
    expect(c.income.absolute).toBe(1_200_000);
  });

  it('los dos periodos vacíos dan variación plana, no un error', () => {
    const c = comparePeriods([], AGOSTO, JULIO);
    expect(c.income).toEqual({ absolute: 0, percentage: null, direction: 'flat' });
  });
});
