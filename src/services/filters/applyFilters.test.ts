import { describe, expect, it } from 'vitest';
import { SYSTEM_CATEGORY_ADJUSTMENT } from '@/constants';
import type { Category, Transaction, TransactionFilters } from '@/models';
import { applyFilters, countActiveFilters, hasActiveFilters } from './applyFilters';
import { describeFilters } from './describeFilters';

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

  /**
   * En la Fase 8 esta regla estaba escrita dentro de `TransactionsScreen`, así
   * que sólo valía en esa pantalla: cualquier otra vista que filtrara por la
   * categoría de ajuste habría mostrado una lista vacía. Ahora vive aquí.
   */
  it('filtrar POR la categoría de ajuste los muestra sin pedirlo aparte', () => {
    const conAjuste = [
      tx({ id: 'normal' }),
      tx({ id: 'ajuste', isAdjustment: true, categoryId: SYSTEM_CATEGORY_ADJUSTMENT }),
    ];
    const result = applyFilters(conAjuste, { categoryIds: [SYSTEM_CATEGORY_ADJUSTMENT] });
    expect(result.map((t) => t.id)).toEqual(['ajuste']);
  });

  it('la categoría de ajuste combinada con otra muestra ambas cosas', () => {
    const conAjuste = [
      tx({ id: 'comida' }),
      tx({ id: 'ajuste', isAdjustment: true, categoryId: SYSTEM_CATEGORY_ADJUSTMENT }),
      tx({ id: 'taxi', categoryId: 'transporte' }),
    ];
    const result = applyFilters(conAjuste, {
      categoryIds: [SYSTEM_CATEGORY_ADJUSTMENT, 'comida'],
    });
    expect(result.map((t) => t.id)).toEqual(['comida', 'ajuste']);
  });

  it('un `includeAdjustments: false` explícito gana sobre la regla anterior', () => {
    const conAjuste = [tx({ id: 'ajuste', isAdjustment: true, categoryId: SYSTEM_CATEGORY_ADJUSTMENT })];
    const result = applyFilters(conAjuste, {
      categoryIds: [SYSTEM_CATEGORY_ADJUSTMENT],
      includeAdjustments: false,
    });
    expect(result).toEqual([]);
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

/**
 * EL REQUISITO DE LA FASE 14: "filtros combinables". Cada criterio recorta al
 * anterior, sin que ninguno anule a otro ni al aplicarse en distinto orden.
 */
describe('applyFilters — cuatro criterios simultáneos', () => {
  const data = [
    tx({ id: 'objetivo', type: 'expense', accountId: 'acc1', categoryId: 'comida', amount: 45000, date: '2026-06-10', description: 'Mercado del mes' }),
    tx({ id: 'otro-tipo', type: 'income', accountId: 'acc1', categoryId: 'comida', amount: 45000, date: '2026-06-10', description: 'Mercado del mes' }),
    tx({ id: 'otra-cuenta', type: 'expense', accountId: 'acc2', categoryId: 'comida', amount: 45000, date: '2026-06-10', description: 'Mercado del mes' }),
    tx({ id: 'fuera-de-fecha', type: 'expense', accountId: 'acc1', categoryId: 'comida', amount: 45000, date: '2026-07-10', description: 'Mercado del mes' }),
    tx({ id: 'importe-alto', type: 'expense', accountId: 'acc1', categoryId: 'comida', amount: 900000, date: '2026-06-10', description: 'Mercado del mes' }),
    tx({ id: 'sin-texto', type: 'expense', accountId: 'acc1', categoryId: 'comida', amount: 45000, date: '2026-06-10', description: 'Taxi' }),
  ];

  const cuatroCriterios: TransactionFilters = {
    types: ['expense'],
    accountIds: ['acc1'],
    dateFrom: '2026-06-01',
    dateTo: '2026-06-30',
    amountMax: 100000,
    search: 'mercado',
  };

  it('sólo sobrevive lo que cumple TODOS', () => {
    const result = applyFilters(data, { ...cuatroCriterios, types: ['expense'] });
    expect(result.map((t) => t.id)).toEqual(['objetivo']);
  });

  it('cada criterio descarta a su candidato, uno por uno', () => {
    // Si alguno dejara de aplicarse, su candidato reaparecería aquí.
    const ids = (f: Parameters<typeof applyFilters>[1]) => applyFilters(data, f).map((t) => t.id);
    expect(ids({ types: ['expense'] })).not.toContain('otro-tipo');
    expect(ids({ accountIds: ['acc1'] })).not.toContain('otra-cuenta');
    expect(ids({ dateFrom: '2026-06-01', dateTo: '2026-06-30' })).not.toContain('fuera-de-fecha');
    expect(ids({ amountMax: 100000 })).not.toContain('importe-alto');
    expect(ids({ search: 'mercado' })).not.toContain('sin-texto');
  });

  it('quitar un criterio devuelve exactamente a su candidato, ni uno más', () => {
    const { types: _omitido, ...sinTipo } = cuatroCriterios;
    expect(applyFilters(data, sinTipo).map((t) => t.id).sort()).toEqual(['objetivo', 'otro-tipo']);
  });

  it('el orden en que se escriben los criterios no cambia el resultado', () => {
    const a = applyFilters(data, { types: ['expense'], accountIds: ['acc1'], search: 'mercado' });
    const b = applyFilters(data, { search: 'mercado', accountIds: ['acc1'], types: ['expense'] });
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
  });

  it('no muta ni reordena la lista original', () => {
    const original = data.map((t) => t.id);
    applyFilters(data, cuatroCriterios);
    expect(data.map((t) => t.id)).toEqual(original);
  });
});

describe('countActiveFilters — lo que dice la insignia del botón', () => {
  it('cuenta EJES, no valores', () => {
    // Marcar tres cuentas es un filtro puesto ("por cuenta"), no tres. Una
    // insignia con "3" tras tocar un solo control desconcierta.
    expect(countActiveFilters({ accountIds: ['a', 'b', 'c'] })).toBe(1);
  });

  it('suma un eje por cada criterio distinto', () => {
    expect(countActiveFilters({ accountIds: ['a'], types: ['expense'], amountMin: 1000 })).toBe(3);
  });

  it('no cuenta las listas vacías: no filtran nada', () => {
    expect(countActiveFilters({ accountIds: [], types: [] })).toBe(0);
  });

  it('no cuenta includeAdjustments: es una preferencia, no un criterio', () => {
    expect(countActiveFilters({ includeAdjustments: true })).toBe(0);
  });

  it('un mínimo de cero SÍ cuenta', () => {
    // `0` es falsy y se perdería con una comprobación descuidada.
    expect(countActiveFilters({ amountMin: 0 })).toBe(1);
  });

  /**
   * DEFECTO ENCONTRADO AL VERIFICAR LA FASE 14 EN EL NAVEGADOR.
   *
   * Contando claves, elegir el atajo "Mes" ponía un 2 en la insignia (pone
   * `dateFrom` y `dateTo`) mientras abajo aparecía UNA sola ficha con el
   * rango. Dos números distintos describiendo lo mismo en la misma pantalla.
   */
  it('un rango de fechas es UN criterio, no dos', () => {
    expect(countActiveFilters({ dateFrom: '2026-08-01', dateTo: '2026-08-31' })).toBe(1);
  });

  it('un rango de importe también es uno solo', () => {
    expect(countActiveFilters({ amountMin: 1000, amountMax: 5000 })).toBe(1);
  });

  it('mes y año pertenecen al mismo eje que las fechas', () => {
    // Todos responden a "cuándo", y la hoja limpia unos al poner los otros.
    expect(countActiveFilters({ month: '2026-08', year: '2026' })).toBe(1);
  });

  it('la insignia NUNCA supera al número de fichas visibles', () => {
    // El invariante que evita que el usuario busque un filtro que no existe.
    // (Al revés sí puede: tres categorías son tres fichas y un solo eje.)
    const filters: TransactionFilters = {
      types: ['expense'],
      accountIds: ['acc1'],
      categoryIds: ['comida'],
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    };
    expect(countActiveFilters(filters)).toBe(4);
    expect(describeFilters(filters)).toHaveLength(4);
  });

  it('no cuenta la búsqueda: ya se ve escrita en su cuadro', () => {
    expect(countActiveFilters({ search: 'mercado' })).toBe(0);
    // Pero sigue siendo "algo que recorta la lista", y eso es otra pregunta.
    expect(hasActiveFilters({ search: 'mercado' })).toBe(true);
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
