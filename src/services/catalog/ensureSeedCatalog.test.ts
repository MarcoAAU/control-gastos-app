import { describe, expect, it } from 'vitest';
import { SEED_BANKS, SEED_CATEGORIES } from '@/constants';
import { ensureSeedCatalog } from './ensureSeedCatalog';

const T = '2026-08-08T10:00:00.000Z';

function catalogoCompleto() {
  return ensureSeedCatalog({ banks: [], categories: [], subcategories: [] }, T);
}

describe('ensureSeedCatalog', () => {
  it('repone todo cuando el catálogo está vacío', () => {
    const result = catalogoCompleto();
    expect(result.categories).toHaveLength(SEED_CATEGORIES.length);
    expect(result.banks).toHaveLength(SEED_BANKS.length);
    expect(result.restored).toBe(SEED_CATEGORIES.length + SEED_BANKS.length);
  });

  /**
   * EL RIESGO EVIDENTE DE "SEMBRAR AL ARRANCAR": Comida, Comida, Comida…
   *
   * No puede pasar porque se compara por `id`, que es contrato fijo, y no por
   * nombre. Este test ejecuta la función DIEZ veces seguidas sobre su propio
   * resultado, que es lo que hace la app abriéndose diez veces.
   */
  it('es idempotente: diez pasadas no duplican nada', () => {
    let catalog = catalogoCompleto();
    const primeraVez = catalog.categories.length;

    for (let i = 0; i < 10; i += 1) {
      catalog = ensureSeedCatalog(catalog, T);
    }

    expect(catalog.categories).toHaveLength(primeraVez);
    expect(catalog.restored).toBe(0);
    const ids = catalog.categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * La persistencia compara por REFERENCIA (`store/persistence.ts`). Si al no
   * faltar nada se devolviera una copia, la app escribiría en disco en cada
   * arranque sin que nada hubiera cambiado.
   */
  it('devuelve los mismos arrays cuando no falta nada', () => {
    const completo = catalogoCompleto();
    const segunda = ensureSeedCatalog(completo, T);
    expect(segunda.categories).toBe(completo.categories);
    expect(segunda.banks).toBe(completo.banks);
  });

  it('no toca lo que el usuario personalizó', () => {
    const completo = catalogoCompleto();
    const comidaEditada = completo.categories.map((c) =>
      c.id === 'comida' ? { ...c, name: 'Mercado', color: '#123456' } : c,
    );

    const result = ensureSeedCatalog({ ...completo, categories: comidaEditada }, T);
    const comida = result.categories.find((c) => c.id === 'comida');
    expect(comida?.name).toBe('Mercado');
    expect(comida?.color).toBe('#123456');
    expect(result.restored).toBe(0);
  });

  /**
   * Archivar una categoría que no usas es una decisión deliberada. Verla
   * reaparecer en cada arranque sería un fallo peor que el que se corrige.
   */
  it('no resucita lo archivado', () => {
    const completo = catalogoCompleto();
    const conArchivada = completo.categories.map((c) =>
      c.id === 'compras' ? { ...c, archivedAt: T } : c,
    );

    const result = ensureSeedCatalog({ ...completo, categories: conArchivada }, T);
    const compras = result.categories.filter((c) => c.id === 'compras');
    expect(compras).toHaveLength(1);
    expect(compras[0]?.archivedAt).toBe(T);
    expect(result.restored).toBe(0);
  });

  it('conserva las categorías creadas por el usuario', () => {
    const propia = {
      id: 'mia_123',
      name: 'Mascotas',
      color: '#abcdef',
      icon: 'cat-otros',
      kind: 'expense' as const,
      isBuiltIn: false,
      isSystem: false,
      order: 999,
      createdAt: T,
      updatedAt: T,
      archivedAt: null,
    };

    const result = ensureSeedCatalog({ banks: [], categories: [propia], subcategories: [] }, T);
    expect(result.categories.find((c) => c.id === 'mia_123')).toEqual(propia);
    expect(result.categories).toHaveLength(SEED_CATEGORIES.length + 1);
  });

  it('repone las categorías de sistema, de las que depende el ajuste de saldo', () => {
    const result = catalogoCompleto();
    expect(result.categories.some((c) => c.id === 'sys_ajuste')).toBe(true);
    expect(result.categories.some((c) => c.id === 'sys_sin_categoria')).toBe(true);
  });

  it('completa sólo lo que falta cuando el catálogo está a medias', () => {
    const completo = catalogoCompleto();
    const aMedias = completo.categories.filter((c) => c.id !== 'transporte' && c.id !== 'salud');

    const result = ensureSeedCatalog({ ...completo, categories: aMedias }, T);
    expect(result.restored).toBe(2);
    expect(result.categories).toHaveLength(completo.categories.length);
  });
});
