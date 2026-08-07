import { describe, expect, it } from 'vitest';
import type { Account, Category, Subcategory, Transaction } from '@/models';
import { searchTransactions } from './searchTransactions';

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 47000,
    date: '2026-08-06',
    time: '00:00',
    accountId: 'acc1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt: '2026-08-06T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z',
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
  [
    'transporte',
    {
      id: 'transporte', name: 'Transporte', color: '#4aa3ff', icon: 'cat-transporte',
      kind: 'expense', isBuiltIn: true, isSystem: false, order: 20,
      createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

const subcategoryById = new Map<string, Subcategory>([
  [
    'sub-gasolina',
    {
      id: 'sub-gasolina', categoryId: 'transporte', name: 'Gasolina', icon: null, color: null,
      order: 10, createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

const accountById = new Map<string, Account>([
  [
    'acc1',
    {
      id: 'acc1', name: 'Bancolombia Ahorros', bankId: 'bancolombia', type: 'savings',
      color: '#ffd400', icon: 'bank', initialBalance: 0, initialBalanceDate: '2026-01-01',
      includeInTotals: true, createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

const context = { categoryById, subcategoryById, accountById };

describe('searchTransactions — dónde busca', () => {
  const data = [
    tx({ id: 'a', description: 'Mercado del mes' }),
    tx({ id: 'b', description: '', notes: 'Regalo de cumpleaños' }),
    tx({ id: 'c', categoryId: 'transporte', subcategoryId: 'sub-gasolina' }),
  ];

  it('busca en la descripción', () => {
    expect(searchTransactions(data, 'mercado').map((t) => t.id)).toEqual(['a']);
  });

  it('busca en las observaciones', () => {
    expect(searchTransactions(data, 'regalo').map((t) => t.id)).toEqual(['b']);
  });

  it('busca por nombre de categoría', () => {
    // Sin esto, buscar "transporte" no encontraría un gasto de transporte
    // anotado sin descripción — que es la mayoría.
    expect(searchTransactions(data, 'transporte', context).map((t) => t.id)).toEqual(['c']);
  });

  it('busca por nombre de subcategoría', () => {
    expect(searchTransactions(data, 'gasolina', context).map((t) => t.id)).toEqual(['c']);
  });

  it('busca por nombre de cuenta', () => {
    expect(searchTransactions(data, 'bancolombia', context)).toHaveLength(3);
  });

  it('NO busca por importe', () => {
    // Deliberado: los importes son cadenas de dígitos y cualquier consulta
    // corta coincidiría con casi todo. Ver la nota del módulo.
    expect(searchTransactions(data, '47000', context)).toEqual([]);
  });
});

describe('searchTransactions — cómo compara', () => {
  const data = [
    tx({ id: 'a', description: 'Taxi al aeropuerto' }),
    tx({ id: 'b', description: 'Café con leche' }),
    tx({ id: 'c', description: 'Almuerzo cumpleaños de Ana' }),
  ];

  it('ignora mayúsculas', () => {
    expect(searchTransactions(data, 'TAXI').map((t) => t.id)).toEqual(['a']);
  });

  it('ignora tildes en los dos sentidos', () => {
    expect(searchTransactions(data, 'cafe').map((t) => t.id)).toEqual(['b']);
    expect(searchTransactions(data, 'CAFÉ').map((t) => t.id)).toEqual(['b']);
  });

  it('varias palabras se combinan con Y, en cualquier orden', () => {
    // "taxi aeropuerto" encuentra "Taxi al aeropuerto" aunque en medio haya un
    // "al" que no se escribió.
    expect(searchTransactions(data, 'taxi aeropuerto').map((t) => t.id)).toEqual(['a']);
    expect(searchTransactions(data, 'aeropuerto taxi').map((t) => t.id)).toEqual(['a']);
  });

  it('añadir una palabra ACOTA, nunca amplía', () => {
    // Con O lógico entre palabras, seguir escribiendo devolvería MÁS
    // resultados: exactamente lo contrario de lo que espera quien afina.
    const unaPalabra = searchTransactions(data, 'cumpleanos');
    const dosPalabras = searchTransactions(data, 'cumpleanos pedro');
    expect(unaPalabra).toHaveLength(1);
    expect(dosPalabras).toHaveLength(0);
  });

  it('una consulta vacía devuelve todo, no nada', () => {
    expect(searchTransactions(data, '')).toHaveLength(3);
    expect(searchTransactions(data, '   ')).toHaveLength(3);
  });

  it('no exige el contexto para funcionar', () => {
    // Si una pantalla lo llama sin índices, la búsqueda debe degradarse a
    // descripción y notas, no romperse.
    expect(searchTransactions(data, 'taxi').map((t) => t.id)).toEqual(['a']);
  });

  it('devuelve una copia: no reordena ni muta la lista original', () => {
    const original = data.slice();
    const resultado = searchTransactions(data, '');
    expect(resultado).not.toBe(data);
    expect(data).toEqual(original);
  });
});
