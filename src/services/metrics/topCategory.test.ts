import { describe, expect, it } from 'vitest';
import type { CategorySlice } from './categoryBreakdown';
import { topCategory } from './topCategory';

function slice(name: string, total: number): CategorySlice {
  return { categoryId: name, name, color: '#fff', icon: 'cat-otros', total, percentage: 0 };
}

describe('topCategory', () => {
  it('devuelve la de mayor gasto', () => {
    const slices = [slice('Comida', 200_000), slice('Vivienda', 1_200_000)];
    expect(topCategory(slices)?.name).toBe('Vivienda');
  });

  /**
   * LO QUE ESTE TEST PROTEGE: la tarjeta no depende de que `categoryBreakdown`
   * siga devolviendo el reparto ordenado. Si un día se ordena por nombre,
   * `slices[0]` sería "Comida" y la tarjeta diría que es en lo que más se
   * gasta — sin error, con una cifra correcta, pero de otra categoría.
   */
  it('no se fía del orden de entrada', () => {
    const desordenadas = [slice('Comida', 200_000), slice('Vivienda', 1_200_000), slice('Salud', 50_000)];
    expect(topCategory(desordenadas)?.name).toBe('Vivienda');
  });

  it('sin gastos devuelve null', () => {
    expect(topCategory([])).toBeNull();
  });

  it('con una sola categoría, devuelve esa', () => {
    expect(topCategory([slice('Comida', 1)])?.name).toBe('Comida');
  });
});
