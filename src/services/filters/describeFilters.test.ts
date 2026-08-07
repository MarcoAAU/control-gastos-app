import { describe, expect, it } from 'vitest';
import type { Account, Category, Subcategory, TransactionFilters } from '@/models';
import { describeFilters } from './describeFilters';

const accountById = new Map<string, Account>([
  [
    'acc1',
    {
      id: 'acc1', name: 'Nequi', bankId: 'nequi', type: 'checking', color: '#ff0084', icon: 'wallet',
      initialBalance: 0, initialBalanceDate: '2026-01-01', includeInTotals: true,
      createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

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

const subcategoryById = new Map<string, Subcategory>([
  [
    'sub-mercado',
    {
      id: 'sub-mercado', categoryId: 'comida', name: 'Mercado', icon: null, color: null,
      order: 10, createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

const context = { accountById, categoryById, subcategoryById };

describe('describeFilters — qué fichas salen', () => {
  it('sin criterios, ninguna ficha', () => {
    expect(describeFilters({})).toEqual([]);
  });

  it('una ficha POR VALOR, no por eje', () => {
    // Marcar dos categorías da dos fichas: quitar una sola es una acción
    // normal y no debería obligar a abrir la hoja de filtros.
    const chips = describeFilters({ categoryIds: ['comida', 'transporte'] }, context);
    expect(chips).toHaveLength(2);
  });

  it('usa los nombres reales, nunca un id crudo', () => {
    const chips = describeFilters({ accountIds: ['acc1'], categoryIds: ['comida'] }, context);
    expect(chips.map((c) => c.label)).toEqual(['Nequi', 'Comida']);
  });

  it('si el dato ya no existe, muestra un rótulo genérico', () => {
    // Una categoría borrada no debe hacer que el usuario lea "cat_9f3b" en
    // pantalla.
    const chips = describeFilters({ categoryIds: ['fantasma'] }, context);
    expect(chips[0]?.label).toBe('Categoría');
  });

  it('el rango de fechas es UNA sola ficha', () => {
    // "Desde el 1 hasta el 15" es una idea; dos fichas dejarían quitar la
    // mitad y quedarse con un "hasta el 15" que nadie pidió.
    const chips = describeFilters({ dateFrom: '2026-06-01', dateTo: '2026-06-15' });
    expect(chips).toHaveLength(1);
    expect(chips[0]?.id).toBe('dateRange');
  });

  it('el rango de importe también es una sola ficha', () => {
    const chips = describeFilters({ amountMin: 10000, amountMax: 50000 });
    expect(chips).toHaveLength(1);
    expect(chips[0]?.id).toBe('amountRange');
  });

  it('el mes se muestra legible, no como código', () => {
    const chips = describeFilters({ month: '2026-07' });
    expect(chips[0]?.label).not.toBe('2026-07');
    expect(chips[0]?.label.toLowerCase()).toContain('2026');
  });

  it('las claves son estables y únicas: sirven de `key` en React', () => {
    const chips = describeFilters(
      { categoryIds: ['comida', 'transporte'], accountIds: ['acc1'] },
      context,
    );
    expect(new Set(chips.map((c) => c.id)).size).toBe(chips.length);
  });
});

describe('describeFilters — el parche de cada X', () => {
  it('quita SÓLO su valor y deja el resto', () => {
    const filters: TransactionFilters = { categoryIds: ['comida', 'transporte', 'salud'] };
    const chip = describeFilters(filters, context).find((c) => c.id === 'categoryIds:transporte');
    expect(chip?.patch).toEqual({ categoryIds: ['comida', 'salud'] });
  });

  it('al quitar el último valor, BORRA el criterio en vez de dejar []', () => {
    // Una lista vacía no filtra nada pero seguiría contando en la insignia:
    // el botón diría "1 filtro" sin ningún filtro aplicado.
    const chip = describeFilters({ accountIds: ['acc1'] }, context)[0];
    expect(chip?.patch).toEqual({ accountIds: undefined });
  });

  it('la X del rango de fechas quita los dos extremos a la vez', () => {
    const chip = describeFilters({ dateFrom: '2026-06-01', dateTo: '2026-06-15' })[0];
    expect(chip?.patch).toEqual({ dateFrom: undefined, dateTo: undefined });
  });

  it('no toca los demás ejes', () => {
    const filters: TransactionFilters = {
      types: ['expense'],
      accountIds: ['acc1'],
      categoryIds: ['comida'],
    };
    const chip = describeFilters(filters, context).find((c) => c.id === 'accountIds:acc1');
    expect(Object.keys(chip?.patch ?? {})).toEqual(['accountIds']);
  });
});
