import { useMemo } from 'react';
import type { Category, ID, Subcategory, Transaction } from '@/models';
import { activeOnly, indexById } from '@/utils/collections';
import { useAppStore } from '../index';

/**
 * Lectura de movimientos y categorías.
 *
 * Mismo patrón que `useAccounts`: seleccionar referencias estables y derivar
 * en `useMemo`. Ver la nota larga de ese archivo.
 */

/**
 * Movimientos ordenados del más reciente al más antiguo.
 *
 * El orden es `fecha + hora`, con `createdAt` como desempate. Los movimientos
 * migrados de v1 no tienen hora (todos `'00:00'`), así que el desempate por
 * creación es lo que evita que se barajen de forma aleatoria entre renders.
 */
export function useTransactions(): Transaction[] {
  const transactions = useAppStore((state) => state.transactions);
  return useMemo(() => {
    return transactions.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.time !== b.time) return a.time < b.time ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [transactions]);
}

export function useTransaction(id: ID | undefined): Transaction | undefined {
  const transactions = useAppStore((state) => state.transactions);
  return useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);
}

export interface CategoryLookup {
  /** Categorías activas, ordenadas para los selectores. */
  categories: Category[];
  subcategories: Subcategory[];
  /** Incluye también las archivadas: un movimiento antiguo puede referenciarlas. */
  categoryById: Map<ID, Category>;
  subcategoryById: Map<ID, Subcategory>;
}

export function useCategories(): CategoryLookup {
  const categories = useAppStore((state) => state.categories);
  const subcategories = useAppStore((state) => state.subcategories);

  return useMemo(
    () => ({
      categories: activeOnly(categories).sort((a, b) => a.order - b.order),
      subcategories: activeOnly(subcategories).sort((a, b) => a.order - b.order),
      // Los índices SÍ incluyen las archivadas: si no, un movimiento de hace
      // seis meses mostraría "categoría desconocida" sólo porque el usuario
      // archivó esa categoría después.
      categoryById: indexById(categories),
      subcategoryById: indexById(subcategories),
    }),
    [categories, subcategories],
  );
}
