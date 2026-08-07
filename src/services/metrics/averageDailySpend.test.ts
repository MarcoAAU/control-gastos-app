import { describe, expect, it } from 'vitest';
import { averageDailySpend, daysInRange, elapsedDaysInRange } from './averageDailySpend';

const AGOSTO = { from: '2026-08-01', to: '2026-08-31' };

describe('daysInRange', () => {
  it('cuenta los dos extremos', () => {
    expect(daysInRange({ from: '2026-08-01', to: '2026-08-01' })).toBe(1);
    expect(daysInRange({ from: '2026-08-01', to: '2026-08-31' })).toBe(31);
  });

  it('cruza meses y años', () => {
    expect(daysInRange({ from: '2026-01-01', to: '2026-12-31' })).toBe(365);
    expect(daysInRange({ from: '2024-01-01', to: '2024-12-31' })).toBe(366); // bisiesto
  });

  it('un rango invertido da 0, no un número negativo', () => {
    expect(daysInRange({ from: '2026-08-31', to: '2026-08-01' })).toBe(0);
  });
});

describe('elapsedDaysInRange', () => {
  it('en un periodo EN CURSO cuenta hasta hoy, no hasta el final', () => {
    // Es la decisión que hace útil el promedio del mes en curso.
    expect(elapsedDaysInRange(AGOSTO, '2026-08-02')).toBe(2);
    expect(elapsedDaysInRange(AGOSTO, '2026-08-15')).toBe(15);
  });

  it('en un periodo YA CERRADO cuenta el periodo entero', () => {
    expect(elapsedDaysInRange(AGOSTO, '2026-09-10')).toBe(31);
  });

  it('en un periodo que no ha empezado da 0', () => {
    expect(elapsedDaysInRange(AGOSTO, '2026-07-20')).toBe(0);
  });

  it('el último día del periodo ya es el periodo completo', () => {
    expect(elapsedDaysInRange(AGOSTO, '2026-08-31')).toBe(31);
  });
});

describe('averageDailySpend', () => {
  /**
   * EL MOTIVO DE TODO ESTE MÓDULO.
   *
   * Dividiendo entre los días del periodo, el 2 de agosto con 186.000 gastados
   * saldría "6.000 al día" — un número que responde a "cuánto habrás gastado
   * al día si no gastas nada más en todo el mes", que nadie preguntó.
   */
  it('divide entre los días TRANSCURRIDOS, no entre los del periodo', () => {
    expect(averageDailySpend(186_000, AGOSTO, '2026-08-02')).toBe(93_000);
    expect(averageDailySpend(186_000, AGOSTO, '2026-08-02')).not.toBe(6_000);
  });

  it('cuando el mes acaba, el divisor sí es el mes entero', () => {
    expect(averageDailySpend(310_000, AGOSTO, '2026-08-31')).toBe(10_000);
  });

  it('sin días transcurridos devuelve null, nunca Infinity ni NaN', () => {
    // La interfaz lo pinta como «—». Un 0 afirmaría "gastas 0 al día".
    const resultado = averageDailySpend(50_000, AGOSTO, '2026-07-01');
    expect(resultado).toBeNull();
  });

  it('sin gastos da 0, que sí es una afirmación cierta', () => {
    expect(averageDailySpend(0, AGOSTO, '2026-08-10')).toBe(0);
  });
});
