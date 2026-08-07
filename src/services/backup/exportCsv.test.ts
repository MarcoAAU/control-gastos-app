import { describe, expect, it } from 'vitest';
import type { Account, Category, Subcategory, Transaction } from '@/models';
import { categoryBreakdown } from '@/services/metrics/categoryBreakdown';
import { periodTotals } from '@/services/metrics/periodTotals';
import {
  categorySummaryToCsv,
  csvCell,
  csvFileName,
  csvNumber,
  movementsToCsv,
} from './exportCsv';

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 47_000,
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

const accountById = new Map<string, Account>([
  [
    'acc1',
    {
      id: 'acc1', name: 'Bancolombia Ahorros', bankId: 'b', type: 'savings', color: '#fff',
      icon: 'bank', initialBalance: 0, initialBalanceDate: '2026-01-01', includeInTotals: true,
      createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
]);

const categoryById = new Map<string, Category>([
  [
    'comida',
    {
      id: 'comida', name: 'Comida', color: '#f00', icon: 'cat-comida', kind: 'expense',
      isBuiltIn: true, isSystem: false, order: 10, createdAt: '', updatedAt: '', archivedAt: null,
    },
  ],
  [
    'salario',
    {
      id: 'salario', name: 'Salario', color: '#0f0', icon: 'cat-salario', kind: 'income',
      isBuiltIn: true, isSystem: false, order: 20, createdAt: '', updatedAt: '', archivedAt: null,
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

describe('csvCell — escapado', () => {
  it('deja pasar el texto simple sin comillas', () => {
    expect(csvCell('Mercado')).toBe('Mercado');
  });

  it('entrecomilla cuando hay punto y coma', () => {
    // Sin esto la descripción partiría la fila en dos columnas.
    expect(csvCell('Pan; leche')).toBe('"Pan; leche"');
  });

  it('duplica las comillas interiores, como manda el RFC 4180', () => {
    expect(csvCell('Compra "urgente"')).toBe('"Compra ""urgente"""');
  });

  it('entrecomilla los saltos de línea de las observaciones', () => {
    // El campo de observaciones es un textarea desde la Fase 13: los saltos
    // de línea son datos reales del usuario, no un caso teórico.
    expect(csvCell('Tanqueada\nCon la tarjeta')).toBe('"Tanqueada\nCon la tarjeta"');
  });

  it('vacío y nulo dan celda vacía', () => {
    expect(csvCell('')).toBe('');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('csvCell — inyección de fórmulas', () => {
  /**
   * Una celda que empieza por `=`, `+`, `-` o `@` la interpreta Excel como
   * FÓRMULA. El caso accidental es el habitual: quien anote "-500 de
   * descuento" vería su descripción convertida en un número.
   */
  it('neutraliza los cuatro caracteres que Excel toma por fórmula', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+34 600 123')).toBe("'+34 600 123");
    expect(csvCell('-500 de descuento')).toBe("'-500 de descuento");
    expect(csvCell('@casa')).toBe("'@casa");
  });

  it('el apóstrofo va ANTES de las comillas, no dentro', () => {
    // Dentro del entrecomillado seguiría siendo el primer carácter de la
    // celda y Excel volvería a ver la fórmula.
    expect(csvCell('=SUMA(A1;A2)')).toBe(`"'=SUMA(A1;A2)"`);
  });

  it('no toca un texto que sólo CONTIENE esos caracteres', () => {
    expect(csvCell('Pago 2+2')).toBe('Pago 2+2');
  });
});

describe('csvNumber', () => {
  it('NO pone separador de miles', () => {
    // "1.250.000" no lo lee Excel como número en ninguna configuración: sería
    // texto y SUMA() daría cero, que es justo lo que se iba a hacer.
    expect(csvNumber(1_250_000)).toBe('1250000');
  });

  it('conserva el signo negativo', () => {
    expect(csvNumber(-47_000)).toBe('-47000');
  });

  it('un valor no finito no escribe "NaN" en la celda', () => {
    expect(csvNumber(Number.NaN)).toBe('0');
    expect(csvNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('movementsToCsv', () => {
  const data = [
    tx({ id: 'a', amount: 47_000, description: 'Gasolina' }),
    tx({ id: 'b', type: 'income', amount: 2_400_000, categoryId: 'salario', description: 'Salario' }),
  ];

  it('empieza con el BOM de UTF-8', () => {
    // Sin él, Excel para Windows lee "Café" como "CafÃ©".
    expect(movementsToCsv(data, context).charCodeAt(0)).toBe(0xfeff);
  });

  it('usa punto y coma como separador', () => {
    const csv = movementsToCsv(data, context);
    expect(csv.split('\r\n')[0]).toContain('Fecha;Hora;Tipo;Importe');
  });

  it('termina las filas con CRLF', () => {
    expect(movementsToCsv(data, context)).toContain('\r\n');
  });

  /**
   * EL IMPORTE VA CON SIGNO. Quien exporta a Excel lo hace para sumar; una
   * columna de positivos exige una fórmula con condición antes de totalizar.
   */
  it('los gastos salen en negativo y los ingresos en positivo', () => {
    const filas = movementsToCsv(data, context).split('\r\n');
    expect(filas[1]).toContain(';-47000;');
    expect(filas[2]).toContain(';2400000;');
  });

  it('resuelve los nombres de cuenta, categoría y subcategoría', () => {
    const conSub = [tx({ id: 'c', subcategoryId: 'sub-mercado' })];
    const fila = movementsToCsv(conSub, context).split('\r\n')[1];
    expect(fila).toContain('Bancolombia Ahorros');
    expect(fila).toContain('Comida');
    expect(fila).toContain('Mercado');
  });

  it('omite la hora de los movimientos migrados', () => {
    // '00:00' significa "sin hora", no medianoche: exportarla mentiría sobre
    // la precisión del dato.
    const fila = movementsToCsv([tx({ id: 'a' })], context).split('\r\n')[1];
    expect(fila?.startsWith('2026-08-02;;')).toBe(true);
  });

  it('escribe la hora cuando el usuario la puso', () => {
    const fila = movementsToCsv([tx({ id: 'a', time: '19:45' })], context).split('\r\n')[1];
    expect(fila).toContain('2026-08-02;19:45;');
  });

  it('los ajustes se marcan, no se ocultan', () => {
    // Si faltaran, la suma del CSV no cuadraría con el saldo de la app.
    const fila = movementsToCsv([tx({ id: 'aj', isAdjustment: true })], context).split('\r\n')[1];
    expect(fila).toContain(';Ajuste;');
  });

  it('una lista vacía produce sólo la cabecera, no un archivo roto', () => {
    const csv = movementsToCsv([], context);
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(1);
  });

  it('una cuenta o categoría borrada deja la celda vacía, no "undefined"', () => {
    const huerfano = [tx({ id: 'x', accountId: 'fantasma', categoryId: 'fantasma' })];
    expect(movementsToCsv(huerfano, context)).not.toContain('undefined');
  });
});

describe('consistencia con la pantalla — la regla de la Fase 17', () => {
  /**
   * Reportes NO tiene matemática propia. Si el CSV sumara por su cuenta, tarde
   * o temprano el archivo y la pantalla dirían cifras distintas y no habría
   * forma de saber cuál creer. Estos dos tests atan una cosa a la otra.
   */
  const data = [
    tx({ id: '1', amount: 310_000, categoryId: 'comida', date: '2026-08-01' }),
    tx({ id: '2', amount: 150_000, categoryId: 'comida', date: '2026-08-03' }),
    tx({ id: '3', type: 'income', amount: 2_400_000, categoryId: 'salario', date: '2026-08-01' }),
    // Fuera del rango: no debe salir ni en el CSV ni en los totales.
    tx({ id: '4', amount: 900_000, date: '2026-07-15' }),
  ];
  const rango = { from: '2026-08-01', to: '2026-08-31' };
  const enRango = data.filter((t) => t.date >= rango.from && t.date <= rango.to);

  it('la suma de la columna Importe del CSV es el balance del periodo', () => {
    const csv = movementsToCsv(enRango, context);
    const sumaCsv = csv
      .split('\r\n')
      .slice(1)
      .filter(Boolean)
      .reduce((total, fila) => total + Number(fila.split(';')[3]), 0);

    expect(sumaCsv).toBe(periodTotals(data, rango).net);
  });

  it('el resumen por categoría del CSV sale del mismo reparto que la pantalla', () => {
    const slices = categoryBreakdown(data, categoryById, { range: rango });
    const csv = categorySummaryToCsv(slices);
    const filas = csv.split('\r\n').filter(Boolean).slice(1);

    expect(filas).toHaveLength(slices.length);
    expect(filas[0]).toBe(`Comida;460000;100`);
  });
});

describe('csvFileName', () => {
  it('lleva la fecha para no sobrescribir el export anterior', () => {
    expect(csvFileName('movimientos', new Date(2026, 7, 7))).toBe(
      'mis-gastos-movimientos-2026-08-07.csv',
    );
  });
});
