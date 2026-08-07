import { describe, expect, it } from 'vitest';
import { averageDailySpend } from './averageDailySpend';

const AGOSTO = { from: '2026-08-01', to: '2026-08-31' };

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
