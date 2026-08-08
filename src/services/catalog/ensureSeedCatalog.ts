import { SEED_BANKS, SEED_CATEGORIES, SEED_SUBCATEGORIES } from '@/constants';
import type { Bank, Category, Subcategory } from '@/models';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Los catálogos que la app trae de fábrica no pueden desaparecer.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── EL FALLO QUE ESTO ARREGLA ─────────────────────────────────────────────
 * "Borrar todos los datos" vaciaba también las categorías y los bancos: de 15
 * categorías y 4 bancos a cero. El usuario se quedaba con una app que ya no
 * sabe clasificar un gasto y —peor— en la que **no se puede crear una cuenta**,
 * porque una cuenta necesita un banco. La app quedaba inservible tras una
 * operación que él creía que sólo borraba SUS movimientos.
 *
 * Y se llevaba por delante las categorías de SISTEMA (`sys_ajuste`,
 * `sys_sin_categoria`), de las que depende el ajuste de saldo. Eso no es una
 * molestia estética: es una referencia rota esperando a que alguien cuadre una
 * cuenta.
 *
 * ── POR QUÉ COMPLETAR Y NO REEMPLAZAR ─────────────────────────────────────
 * La tentación es "si faltan, se ponen todas". Eso borraría el color que el
 * usuario le puso a Comida, o el nombre que le cambió a Transporte. Se rellena
 * hueco por hueco: sólo entra lo que NO está.
 *
 * ── LA CLAVE ES EL `id`, Y POR ESO NO PUEDE DUPLICAR ──────────────────────
 * El riesgo evidente de "sembrar al arrancar" es acabar con Comida, Comida,
 * Comida… Aquí no puede pasar: se compara por `id`, que es contrato fijo
 * (`comida`, `salario`, `bancolombia`…), no por nombre. Si el id ya está, se
 * respeta lo que haya y no se toca nada.
 *
 * ── LO ARCHIVADO SIGUE ARCHIVADO ──────────────────────────────────────────
 * Un elemento archivado CONSERVA su id, así que esta función lo ve y lo deja
 * en paz. Es lo que hay que hacer: archivar una categoría que no usas es una
 * decisión deliberada, y verla reaparecer en cada arranque sería un fallo peor
 * que el que se está corrigiendo.
 *
 * ── PURA Y SIN FECHAS PROPIAS ─────────────────────────────────────────────
 * Recibe el instante como parámetro en vez de llamar a `new Date()`: así el
 * documento entero queda con una sola marca de tiempo coherente y la función
 * se puede probar sin trucar el reloj.
 */

export interface SeedCatalog {
  banks: Bank[];
  categories: Category[];
  subcategories: Subcategory[];
}

export interface EnsureResult extends SeedCatalog {
  /** Cuántos elementos hubo que reponer. `0` = no faltaba nada. */
  restored: number;
}

function completeById<TSeed extends { id: string }, TEntity extends { id: string }>(
  existing: readonly TEntity[],
  seeds: readonly TSeed[],
  build: (seed: TSeed) => TEntity,
): { items: TEntity[]; restored: number } {
  const present = new Set(existing.map((item) => item.id));
  const missing = seeds.filter((seed) => !present.has(seed.id));
  if (missing.length === 0) {
    // Se devuelve el array ORIGINAL, no una copia. La persistencia compara por
    // referencia (ver `store/persistence.ts`): devolver una copia idéntica
    // provocaría una escritura en disco en cada arranque sin que nada hubiera
    // cambiado.
    return { items: existing as TEntity[], restored: 0 };
  }
  // Lo repuesto va DETRÁS: si el usuario reordenó lo suyo, no se le cuela algo
  // por delante. El orden de presentación lo decide el campo `order`.
  return { items: [...existing, ...missing.map(build)], restored: missing.length };
}

export function ensureSeedCatalog(
  catalog: SeedCatalog,
  timestamp: string = new Date().toISOString(),
): EnsureResult {
  const banks = completeById(catalog.banks, SEED_BANKS, (seed) => ({
    ...seed,
    createdAt: timestamp,
    archivedAt: null,
  }));

  const categories = completeById(catalog.categories, SEED_CATEGORIES, (seed) => ({
    ...seed,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  }));

  const subcategories = completeById(catalog.subcategories, SEED_SUBCATEGORIES, (seed) => ({
    ...seed,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  }));

  return {
    banks: banks.items,
    categories: categories.items,
    subcategories: subcategories.items,
    restored: banks.restored + categories.restored + subcategories.restored,
  };
}
