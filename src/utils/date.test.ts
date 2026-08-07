import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/models';
import { compareTxDesc, formatDateTime, txSortKey } from './date';

function tx(date: string, time: string, createdAt: string, id = `${date}-${time}`): Transaction {
  return {
    id,
    type: 'expense',
    amount: 1000,
    date,
    time,
    accountId: 'acc-1',
    categoryId: 'comida',
    subcategoryId: null,
    description: '',
    notes: '',
    source: 'manual',
    isAdjustment: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('txSortKey', () => {
  it('ordena por fecha antes que por hora', () => {
    const antes = txSortKey(tx('2026-08-05', '23:59', 'a'));
    const despues = txSortKey(tx('2026-08-06', '00:01', 'b'));
    expect(antes < despues).toBe(true);
  });

  it('con la misma fecha, ordena por hora', () => {
    const manana = txSortKey(tx('2026-08-06', '08:00', 'a'));
    const tarde = txSortKey(tx('2026-08-06', '18:30', 'b'));
    expect(manana < tarde).toBe(true);
  });
});

describe('compareTxDesc — el orden de la lista de movimientos', () => {
  it('pone lo más reciente primero', () => {
    const lista = [
      tx('2026-08-01', '10:00', 'a'),
      tx('2026-08-06', '10:00', 'b'),
      tx('2026-08-03', '10:00', 'c'),
    ];
    expect(lista.slice().sort(compareTxDesc).map((t) => t.date)).toEqual([
      '2026-08-06',
      '2026-08-03',
      '2026-08-01',
    ]);
  });

  it('dentro del mismo día, la hora más tardía va primero', () => {
    const lista = [tx('2026-08-06', '09:00', 'a'), tx('2026-08-06', '21:00', 'b')];
    expect(lista.slice().sort(compareTxDesc).map((t) => t.time)).toEqual(['21:00', '09:00']);
  });
});

describe('EL RIESGO DE LA FASE 13: los movimientos migrados no tienen hora', () => {
  /**
   * Todos los movimientos que vienen de v1 llegan con `time: '00:00'`, porque
   * v1 no guardaba la hora. Al pasar a ordenar por `fecha + hora`, un mismo
   * día lleno de `'00:00'` deja el orden indeterminado — y una lista que se
   * baraja sola entre renders parece un fallo grave aunque los datos estén
   * bien. El desempate por `createdAt` es lo que lo impide.
   */
  it('con la misma fecha Y la misma hora, desempata por creación', () => {
    const lista = [
      tx('2026-07-01', '00:00', '2026-07-01T10:00:00.000Z', 'primero'),
      tx('2026-07-01', '00:00', '2026-07-01T12:00:00.000Z', 'segundo'),
      tx('2026-07-01', '00:00', '2026-07-01T11:00:00.000Z', 'tercero'),
    ];
    expect(lista.slice().sort(compareTxDesc).map((t) => t.id)).toEqual([
      'segundo',
      'tercero',
      'primero',
    ]);
  });

  it('el orden es ESTABLE: ordenar dos veces da lo mismo', () => {
    // Sin el desempate, dos pasadas sobre `00:00` podían dar órdenes distintos
    // y la lista "saltaba" al re-renderizar.
    const lista = [
      tx('2026-07-01', '00:00', '2026-07-01T10:00:00.000Z', 'a'),
      tx('2026-07-01', '00:00', '2026-07-01T10:00:01.000Z', 'b'),
      tx('2026-07-01', '00:00', '2026-07-01T10:00:02.000Z', 'c'),
      tx('2026-07-01', '00:00', '2026-07-01T10:00:03.000Z', 'd'),
    ];
    const primera = lista.slice().sort(compareTxDesc).map((t) => t.id);
    const segunda = lista.slice().reverse().sort(compareTxDesc).map((t) => t.id);
    expect(segunda).toEqual(primera);
  });

  it('un movimiento nuevo con hora real se coloca por delante de los migrados del mismo día', () => {
    const migrado = tx('2026-08-06', '00:00', '2026-07-01T00:00:00.000Z', 'migrado');
    const nuevo = tx('2026-08-06', '14:30', '2026-08-06T14:30:00.000Z', 'nuevo');
    expect([migrado, nuevo].sort(compareTxDesc).map((t) => t.id)).toEqual(['nuevo', 'migrado']);
  });
});

describe('formatDateTime — la hora sólo se muestra si existe', () => {
  it('omite la hora de los movimientos migrados', () => {
    // Mostrar "00:00" en cientos de movimientos antiguos sería ruido que
    // además sugiere una precisión que el dato no tiene.
    expect(formatDateTime('2026-08-06', '00:00')).not.toContain('00:00');
  });

  it('muestra la hora cuando el usuario la puso', () => {
    expect(formatDateTime('2026-08-06', '14:30')).toContain('14:30');
  });
});
