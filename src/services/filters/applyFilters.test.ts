import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '@/models';
import { applyFilters, hasActiveFilters } from './applyFilters';

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 10000,
    date: '2026-06-15',
    time: '00:00',
    accountId: 'acc1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

const categoryById = new Map<string, Category>([
  [
    'comida',
    {
      id: 'comida', name: 'Comida', color: '#ff8a5c', icon: 'cat-comida', kind: 'expense',
      isBuiltIn: true, isSystem: false, order: 10,
      createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

describe('applyFilters — los ajustes se excluyen por defecto', () => {
  const data = [tx({ id: 'normal' }), tx({ id: 'ajuste', isAdjustment: true })];

  it('no muestra los ajustes de saldo sin pedirlo', () => {
    // Si aparecieran, el usuario vería "ingresos" que nunca ingresó.
    expect(applyFilters(data, {}).map((t) => t.id)).toEqual(['normal']);
  });

  it('los muestra cuando se piden explícitamente', () => {
    const result = applyFilters(data, { includeAdjustments: true });
    expect(result.map((t) => t.id)).toEqual(['normal', 'ajuste']);
  });
});

describe('applyFilters — combinación de criterios', () => {
  const data = [
    tx({ id: 'a', type: 'expense', accountId: 'acc1', categoryId: 'comida', amount: 50000, date: '2026-06-01' }),
    tx({ id: 'b', type: 'income', accountId: 'acc1', categoryId: 'salario', amount: 900000, date: '2026-06-10' }),
    tx({ id: 'c', type: 'expense', accountId: 'acc2', categoryId: 'comida', amount: 15000, date: '2026-07-05' }),
    tx({ id: 'd', type: 'expense', accountId: 'acc2', categoryId: 'transporte', amount: 8000, date: '2026-07-20' }),
  ];

  it('los criterios distintos se combinan con Y', () => {
    const result = applyFilters(data, { types: ['expense'], accountIds: ['acc2'] });
    expect(result.map((t) => t.id)).toEqual(['c', 'd']);
  });

  it('los valores de una misma lista se combinan con O', () => {
    // Marcar dos cuentas debe mostrar ambas, no la intersección (vacía).
    const result = applyFilters(data, { accountIds: ['acc1', 'acc2'] });
    expect(result).toHaveLength(4);
  });

  it('filtra por rango de fechas, extremos incluidos', () => {
    const result = applyFilters(data, { dateFrom: '2026-06-10', dateTo: '2026-07-05' });
    expect(result.map((t) => t.id)).toEqual(['b', 'c']);
  });

  it('filtra por mes completo', () => {
    expect(applyFilters(data, { month: '2026-07' }).map((t) => t.id)).toEqual(['c', 'd']);
  });

  it('filtra por año completo', () => {
    expect(applyFilters(data, { year: '2026' })).toHaveLength(4);
    expect(applyFilters(data, { year: '2025' })).toHaveLength(0);
  });

  it('filtra por rango de importe', () => {
    const result = applyFilters(data, { amountMin: 10000, amountMax: 100000 });
    expect(result.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('un filtro sin resultados devuelve una lista vacía, no todo', () => {
    expect(applyFilters(data, { accountIds: ['no_existe'] })).toEqual([]);
  });

  it('un filtro vacío no descarta nada', () => {
    expect(applyFilters(data, {})).toHaveLength(4);
  });

  it('una lista vacía se trata como "sin criterio", no como "nada pasa"', () => {
    // Al deseleccionar la última casilla el usuario espera verlo todo otra vez.
    expect(applyFilters(data, { accountIds: [], types: [] })).toHaveLength(4);
  });
});

describe('applyFilters — búsqueda', () => {
  const data = [
    tx({ id: 'a', description: 'Mercado del mes' }),
    tx({ id: 'b', description: 'Taxi al aeropuerto', categoryId: 'transporte' }),
    tx({ id: 'c', description: '', notes: 'Regalo de cumpleaños' }),
  ];

  it('busca en la descripción sin distinguir mayúsculas', () => {
    expect(applyFilters(data, { search: 'MERCADO' }).map((t) => t.id)).toEqual(['a']);
  });

  it('busca también en las observaciones', () => {
    expect(applyFilters(data, { search: 'cumpleaños' }).map((t) => t.id)).toEqual(['c']);
  });

  it('busca por nombre de categoría cuando se le da el contexto', () => {
    const result = applyFilters(data, { search: 'comida' }, { categoryById });
    expect(result.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('ignora los espacios sobrantes', () => {
    expect(applyFilters(data, { search: '  taxi  ' }).map((t) => t.id)).toEqual(['b']);
  });
});

describe('hasActiveFilters', () => {
  it('detecta que hay criterios puestos', () => {
    expect(hasActiveFilters({ types: ['expense'] })).toBe(true);
    expect(hasActiveFilters({ search: 'mercado' })).toBe(true);
  });

  it('no cuenta las listas vacías ni las cadenas vacías', () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ accountIds: [], search: '' })).toBe(false);
  });

  it('no cuenta includeAdjustments: es una preferencia, no un filtro', () => {
    expect(hasActiveFilters({ includeAdjustments: true })).toBe(false);
  });
});
