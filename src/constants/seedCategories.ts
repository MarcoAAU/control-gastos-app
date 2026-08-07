import type { Category, Subcategory } from '@/models';
import {
  SYSTEM_CATEGORY_ADJUSTMENT,
  SYSTEM_CATEGORY_UNCATEGORIZED,
} from './systemIds';

/** Categoría sin los campos de auditoría, que se rellenan al sembrar. */
export type CategorySeed = Omit<Category, 'createdAt' | 'updatedAt' | 'archivedAt'>;
export type SubcategorySeed = Omit<Subcategory, 'createdAt' | 'updatedAt' | 'archivedAt'>;

/**
 * Categorías que trae la app.
 *
 * ⚠️ LOS `id` SON CONTRATO, NO NOMBRES BONITOS.
 *
 * Cada movimiento guardado por el usuario en v1 apunta a uno de estos ids
 * (`categoryId: "comida"`). Si aquí se escribiera `food` o `comidas`, TODOS
 * los movimientos de esa categoría quedarían huérfanos al migrar y aparecerían
 * como "Sin categoría". Los ids se copian literalmente de `app.js:5-22` y
 * `seedCategories.test.ts` lo verifica contra una lista congelada.
 *
 * Los nombres y colores sí se pueden cambiar sin romper nada.
 *
 * CAMBIO ESTRUCTURAL: v1 tenía dos constantes separadas (`CATEGORIES` e
 * `INCOME_CATEGORIES`); aquí es una sola colección discriminada por `kind`,
 * porque a partir de la Fase 11 el usuario puede crear las suyas y necesitan
 * vivir en el mismo sitio.
 */
export const SEED_CATEGORIES: readonly CategorySeed[] = [
  // ── Gastos (ids literales de app.js:5-13) ────────────────────────────────
  { id: 'comida', name: 'Comida', color: '#ff8a5c', icon: 'cat-comida', kind: 'expense', isBuiltIn: true, isSystem: false, order: 10 },
  { id: 'transporte', name: 'Transporte', color: '#6c8dff', icon: 'cat-transporte', kind: 'expense', isBuiltIn: true, isSystem: false, order: 20 },
  { id: 'vivienda', name: 'Vivienda', color: '#4bd9c0', icon: 'cat-vivienda', kind: 'expense', isBuiltIn: true, isSystem: false, order: 30 },
  { id: 'entretenimiento', name: 'Entretenimiento', color: '#c084fc', icon: 'cat-entretenimiento', kind: 'expense', isBuiltIn: true, isSystem: false, order: 40 },
  { id: 'salud', name: 'Salud', color: '#ff6b7a', icon: 'cat-salud', kind: 'expense', isBuiltIn: true, isSystem: false, order: 50 },
  { id: 'compras', name: 'Compras', color: '#ffd166', icon: 'cat-compras', kind: 'expense', isBuiltIn: true, isSystem: false, order: 60 },
  { id: 'servicios', name: 'Servicios', color: '#5eead4', icon: 'cat-servicios', kind: 'expense', isBuiltIn: true, isSystem: false, order: 70 },
  { id: 'otros', name: 'Otros', color: '#93a2c6', icon: 'cat-otros', kind: 'expense', isBuiltIn: true, isSystem: false, order: 80 },

  // ── Ingresos (ids literales de app.js:16-22) ─────────────────────────────
  { id: 'salario', name: 'Salario', color: '#4bd9c0', icon: 'cat-salario', kind: 'income', isBuiltIn: true, isSystem: false, order: 110 },
  { id: 'freelance', name: 'Freelance', color: '#6c8dff', icon: 'cat-freelance', kind: 'income', isBuiltIn: true, isSystem: false, order: 120 },
  { id: 'regalo', name: 'Regalo', color: '#ffd166', icon: 'cat-regalo', kind: 'income', isBuiltIn: true, isSystem: false, order: 130 },
  { id: 'inversion', name: 'Inversión', color: '#5eead4', icon: 'cat-inversion', kind: 'income', isBuiltIn: true, isSystem: false, order: 140 },
  { id: 'otro_ingreso', name: 'Otro ingreso', color: '#93a2c6', icon: 'cat-otro-ingreso', kind: 'income', isBuiltIn: true, isSystem: false, order: 150 },

  // ── Sistema (no editables, no borrables) ─────────────────────────────────
  {
    id: SYSTEM_CATEGORY_ADJUSTMENT,
    name: 'Ajuste de saldo',
    color: '#93a2c6',
    icon: 'cat-ajuste',
    kind: 'both',
    isBuiltIn: true,
    isSystem: true,
    order: 900,
  },
  {
    id: SYSTEM_CATEGORY_UNCATEGORIZED,
    name: 'Sin categoría',
    color: '#93a2c6',
    icon: 'cat-otros',
    kind: 'both',
    isBuiltIn: true,
    isSystem: true,
    order: 910,
  },
];

/**
 * v1 no tenía subcategorías. Se siembra vacío a propósito: inventarlas por el
 * usuario ("Comida > Restaurantes"?) sería adivinar, y el spec pide que las
 * cree él desde la Fase 11.
 */
export const SEED_SUBCATEGORIES: readonly SubcategorySeed[] = [];

/** Ids de categoría que existían en v1, congelados para el test de migración. */
export const LEGACY_CATEGORY_IDS: readonly string[] = [
  'comida',
  'transporte',
  'vivienda',
  'entretenimiento',
  'salud',
  'compras',
  'servicios',
  'otros',
  'salario',
  'freelance',
  'regalo',
  'inversion',
  'otro_ingreso',
];
