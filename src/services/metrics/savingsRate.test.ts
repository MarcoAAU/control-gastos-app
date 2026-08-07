import { describe, expect, it } from 'vitest';
import { savingsRate } from './savingsRate';

function totals(income: number, expense: number) {
  return { income, expense, net: income - expense, count: 0 };
}

describe('savingsRate', () => {
  it('calcula la proporción no gastada', () => {
    expect(savingsRate(totals(1_000_000, 250_000))).toBe(75);
    expect(savingsRate(totals(2_000_000, 2_000_000))).toBe(0);
  });

  it('puede ser negativa, y eso es información', () => {
    // Gastar más de lo que entra no debe recortarse a 0: "−45%" dice algo que
    // "0%" oculta.
    expect(savingsRate(totals(1_000_000, 1_450_000))).toBe(-45);
  });

  it('sin ingresos devuelve null, no un porcentaje inventado', () => {
    // Con 0 ingresos la división es por cero. Un 0 diría "ahorraste el 0%",
    // que es falso: no ahorraste nada porque no entró nada.
    expect(savingsRate(totals(0, 300_000))).toBeNull();
    expect(savingsRate(totals(0, 0))).toBeNull();
  });

  it('nunca devuelve Infinity ni NaN', () => {
    const resultado = savingsRate(totals(0, 500_000));
    expect(Number.isFinite(resultado ?? 0)).toBe(true);
  });
});
