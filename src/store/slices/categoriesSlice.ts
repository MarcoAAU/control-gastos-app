import { DEFAULT_COLOR, SYSTEM_CATEGORY_UNCATEGORIZED } from '@/constants';
import type { Category, CategoryKind, HexColor, ID, Subcategory } from '@/models';
import { createId } from '@/services/id/createId';
import { mapItems, updateById } from '@/utils/collections';
import type { SliceCreator } from '../types';

/**
 * Categorías y subcategorías.
 *
 * Las de sistema (`isSystem`) no se editan ni se archivan: la app depende de
 * que sus ids existan. Las que trae la app (`isBuiltIn`) sí se pueden renombrar
 * y recolorear, pero no borrar físicamente — los movimientos las referencian.
 */

export interface CategoryDraft {
  name: string;
  kind?: CategoryKind;
  color?: HexColor;
  icon?: string;
}

export interface SubcategoryDraft {
  categoryId: ID;
  name: string;
  color?: HexColor | null;
  icon?: string | null;
}

export interface CategoriesSlice {
  categories: Category[];
  subcategories: Subcategory[];

  addCategory(draft: CategoryDraft): ID;
  updateCategory(id: ID, patch: Partial<CategoryDraft>): void;
  /**
   * Archiva la categoría y, opcionalmente, reasigna sus movimientos.
   *
   * NUNCA borra físicamente: dejaría movimientos apuntando a un id
   * inexistente. Si no se indica destino, los movimientos van a "Sin
   * categoría" — el usuario no pierde el gasto, sólo su clasificación.
   */
  archiveCategory(id: ID, reassignTo?: ID): void;
  restoreCategory(id: ID): void;

  addSubcategory(draft: SubcategoryDraft): ID;
  updateSubcategory(id: ID, patch: Partial<SubcategoryDraft>): void;
  archiveSubcategory(id: ID): void;
}

function nextOrder(items: readonly { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 10;
}

export const createCategoriesSlice: SliceCreator<CategoriesSlice> = (set, get) => ({
  categories: [],
  subcategories: [],

  addCategory(draft) {
    const id = createId();
    const now = new Date().toISOString();
    set((state) => ({
      categories: [
        ...state.categories,
        {
          id,
          name: draft.name.trim() || 'Categoría sin nombre',
          color: draft.color ?? DEFAULT_COLOR,
          icon: draft.icon ?? 'cat-otros',
          kind: draft.kind ?? 'expense',
          isBuiltIn: false,
          isSystem: false,
          order: nextOrder(state.categories),
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        },
      ],
    }));
    return id;
  },

  updateCategory(id, patch) {
    set((state) => ({
      categories: updateById(state.categories, id, (category) =>
        category.isSystem
          ? category
          : {
              ...category,
              ...patch,
              ...(patch.name !== undefined ? { name: patch.name.trim() || category.name } : {}),
              updatedAt: new Date().toISOString(),
            },
      ),
    }));
  },

  archiveCategory(id, reassignTo) {
    const category = get().categories.find((c) => c.id === id);
    if (!category || category.isSystem) return;

    const destination = reassignTo ?? SYSTEM_CATEGORY_UNCATEGORIZED;
    const now = new Date().toISOString();

    set((state) => ({
      categories: updateById(state.categories, id, (c) => ({
        ...c,
        archivedAt: now,
        updatedAt: now,
      })),
      // Reasignar es obligatorio, no opcional: dejar movimientos apuntando a
      // una categoría archivada los volvería invisibles en los reportes.
      transactions: mapItems(state.transactions, (tx) =>
        tx.categoryId === id
          ? { ...tx, categoryId: destination, subcategoryId: null, updatedAt: now }
          : tx,
      ),
      subcategories: mapItems(state.subcategories, (sub) =>
        sub.categoryId === id && sub.archivedAt === null
          ? { ...sub, archivedAt: now, updatedAt: now }
          : sub,
      ),
    }));
  },

  restoreCategory(id) {
    set((state) => ({
      categories: updateById(state.categories, id, (category) =>
        category.archivedAt === null
          ? category
          : { ...category, archivedAt: null, updatedAt: new Date().toISOString() },
      ),
    }));
  },

  addSubcategory(draft) {
    const id = createId();
    const now = new Date().toISOString();
    set((state) => ({
      subcategories: [
        ...state.subcategories,
        {
          id,
          categoryId: draft.categoryId,
          name: draft.name.trim() || 'Subcategoría sin nombre',
          icon: draft.icon ?? null,
          color: draft.color ?? null,
          order: nextOrder(state.subcategories.filter((s) => s.categoryId === draft.categoryId)),
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        },
      ],
    }));
    return id;
  },

  updateSubcategory(id, patch) {
    set((state) => ({
      subcategories: updateById(state.subcategories, id, (sub) => ({
        ...sub,
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() || sub.name } : {}),
        updatedAt: new Date().toISOString(),
      })),
    }));
  },

  archiveSubcategory(id) {
    const now = new Date().toISOString();
    set((state) => ({
      subcategories: updateById(state.subcategories, id, (sub) =>
        sub.archivedAt !== null ? sub : { ...sub, archivedAt: now, updatedAt: now },
      ),
      // Los movimientos conservan su categoría; sólo pierden el nivel 2.
      transactions: mapItems(state.transactions, (tx) =>
        tx.subcategoryId === id ? { ...tx, subcategoryId: null, updatedAt: now } : tx,
      ),
    }));
  },
});
