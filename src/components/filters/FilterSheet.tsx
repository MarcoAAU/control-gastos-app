import { useMemo } from 'react';
import type {
  Account,
  Category,
  FilterPatch,
  ID,
  Subcategory,
  TransactionFilters,
  TransactionType,
} from '@/models';
import { AmountField, Button, Chip, Sheet, TextField } from '@/components/ui';
import { PERIOD_LABELS, PERIODS, type Period } from '@/constants';
import { getPeriodRange } from '@/services/periods/getPeriodRange';
import { formatAmountInput, parseAmountInput, toAmountInputValue } from '@/utils/money';
import styles from './FilterSheet.module.css';

export interface FilterSheetProps {
  open: boolean;
  onClose(): void;
  filters: TransactionFilters;
  onPatch(patch: FilterPatch): void;
  onClearAll(): void;
  accounts: readonly Account[];
  categories: readonly Category[];
  subcategories: readonly Subcategory[];
  /** Movimientos que quedan con los criterios actuales. Va en el botón. */
  resultCount: number;
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Hoja de filtros combinables.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── APLICA EN VIVO, NO HAY "ACEPTAR / CANCELAR" ───────────────────────────
 * Cada toque modifica los criterios de inmediato y el botón inferior va
 * contando cuántos movimientos quedan ("Ver 12 movimientos"). Es información
 * que el usuario necesita MIENTRAS elige, no después: con un botón "Aplicar"
 * hay que cerrar, mirar, volver a abrir y corregir por cada criterio de más.
 * Aquí el número cambia bajo el dedo y filtrar de menos a más deja de ser
 * prueba y error.
 *
 * El precio es que no hay "Cancelar". Se compensa con "Limpiar todo" siempre a
 * mano y con que cada ficha se desmarca sola: nada de lo que se hace aquí es
 * destructivo ni afecta a un solo dato guardado.
 *
 * ── EL COMPONENTE NO GUARDA ESTADO ────────────────────────────────────────
 * Ni un `useState`. Todo lo que se ve sale de `filters`, y todo lo que se toca
 * sale por `onPatch`. Si tuviera una copia propia habría dos versiones de la
 * verdad y bastaría con abrir la hoja con filtros ya puestos para verlas
 * discrepar.
 */
export function FilterSheet({
  open,
  onClose,
  filters,
  onPatch,
  onClearAll,
  accounts,
  categories,
  subcategories,
  resultCount,
}: FilterSheetProps) {
  /**
   * Subcategorías ofrecidas: sólo las de las categorías marcadas.
   *
   * Sin este recorte la sección mostraría las cuarenta y pico subcategorías de
   * todas las categorías a la vez, una lista imposible de recorrer en un
   * móvil, y con parejas contradictorias a un toque de distancia ("Gasolina"
   * junto a "Mercado"). Con ninguna categoría marcada la sección no aparece:
   * afinar por subcategoría sin haber elegido la categoría no es un paso que
   * nadie dé.
   */
  const visibleSubcategories = useMemo(() => {
    const selected = filters.categoryIds ?? [];
    if (selected.length === 0) return [];
    return subcategories.filter((sub) => selected.includes(sub.categoryId));
  }, [subcategories, filters.categoryIds]);

  function toggleIn<T>(list: readonly T[] | undefined, value: T): T[] | undefined {
    const current = list ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    // Lista vacía → se borra el criterio. Dejar `[]` lo mantendría "puesto"
    // sin filtrar nada, y la insignia del botón contaría un filtro fantasma.
    return next.length === 0 ? undefined : next;
  }

  function toggleCategory(categoryId: ID): void {
    const nextCategories = toggleIn(filters.categoryIds, categoryId);
    // Al desmarcar una categoría, sus subcategorías dejan de ser alcanzables:
    // si se quedaran en el filtro seguirían descartando movimientos desde una
    // sección que ya no se ve. Un filtro invisible que no devuelve nada es el
    // fallo que más se parece a "la app perdió mis datos".
    const stillReachable = (filters.subcategoryIds ?? []).filter((subId) => {
      const sub = subcategories.find((s) => s.id === subId);
      return sub !== undefined && (nextCategories ?? []).includes(sub.categoryId);
    });

    onPatch({
      categoryIds: nextCategories,
      subcategoryIds: stillReachable.length === 0 ? undefined : stillReachable,
    });
  }

  function applyPeriod(period: Period): void {
    const range = getPeriodRange(period);
    // `month`/`year` se limpian: son atajos del mismo eje y combinarlos con un
    // rango daría una intersección que nadie pidió.
    onPatch({ dateFrom: range.from, dateTo: range.to, month: undefined, year: undefined });
  }

  function isPeriodActive(period: Period): boolean {
    const range = getPeriodRange(period);
    return filters.dateFrom === range.from && filters.dateTo === range.to;
  }

  /**
   * El campo de importe no guarda estado propio: se muestra reformateando el
   * número que hay en el filtro. Así borrar los filtros desde fuera vacía
   * también estos dos campos, en vez de dejar dentro un texto huérfano que ya
   * no filtra nada.
   */
  function patchAmountMin(raw: string): void {
    const parsed = parseAmountInput(formatAmountInput(raw));
    onPatch({ amountMin: parsed === null ? undefined : parsed });
  }

  function patchAmountMax(raw: string): void {
    const parsed = parseAmountInput(formatAmountInput(raw));
    onPatch({ amountMax: parsed === null ? undefined : parsed });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <>
          <Button variant="tonal" onClick={onClearAll}>
            Limpiar todo
          </Button>
          <Button onClick={onClose}>
            {resultCount === 1 ? 'Ver 1 movimiento' : `Ver ${resultCount} movimientos`}
          </Button>
        </>
      }
    >
      <div className={styles.sections}>
        <Section title="Tipo">
          {(['income', 'expense'] as const).map((type: TransactionType) => (
            <Chip
              key={type}
              label={type === 'income' ? 'Ingresos' : 'Gastos'}
              selected={(filters.types ?? []).includes(type)}
              onClick={() => onPatch({ types: toggleIn(filters.types, type) })}
            />
          ))}
        </Section>

        <Section title="Periodo">
          {PERIODS.map((period) => (
            <Chip
              key={period}
              label={PERIOD_LABELS[period]}
              selected={isPeriodActive(period)}
              onClick={() =>
                isPeriodActive(period)
                  ? onPatch({ dateFrom: undefined, dateTo: undefined })
                  : applyPeriod(period)
              }
            />
          ))}
        </Section>

        {/* Fechas exactas. Van juntas y debajo de los atajos porque el atajo
            resuelve el 90% de los casos; escribir dos fechas a mano es el
            recurso para el 10% restante. */}
        <div className={styles.pair}>
          <TextField
            label="Desde"
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(value) => onPatch({ dateFrom: value === '' ? undefined : value })}
          />
          <TextField
            label="Hasta"
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(value) => onPatch({ dateTo: value === '' ? undefined : value })}
          />
        </div>

        {accounts.length > 0 && (
          <Section title="Cuentas">
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                icon={account.icon}
                color={account.color}
                selected={(filters.accountIds ?? []).includes(account.id)}
                onClick={() => onPatch({ accountIds: toggleIn(filters.accountIds, account.id) })}
              />
            ))}
          </Section>
        )}

        <Section title="Categorías">
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              icon={category.icon}
              color={category.color}
              selected={(filters.categoryIds ?? []).includes(category.id)}
              onClick={() => toggleCategory(category.id)}
            />
          ))}
        </Section>

        {visibleSubcategories.length > 0 && (
          <Section title="Subcategorías">
            {visibleSubcategories.map((sub) => (
              <Chip
                key={sub.id}
                label={sub.name}
                selected={(filters.subcategoryIds ?? []).includes(sub.id)}
                onClick={() => onPatch({ subcategoryIds: toggleIn(filters.subcategoryIds, sub.id) })}
              />
            ))}
          </Section>
        )}

        <div className={styles.pair}>
          <AmountField
            label="Importe mínimo"
            value={toAmountInputValue(filters.amountMin)}
            onChange={patchAmountMin}
          />
          <AmountField
            label="Importe máximo"
            value={toAmountInputValue(filters.amountMax)}
            onChange={patchAmountMax}
          />
        </div>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {/* `role="group"` en vez de una lista: son interruptores relacionados,
          y el rótulo los nombra para el lector de pantalla. */}
      <div className={styles.chips} role="group" aria-label={title}>
        {children}
      </div>
    </section>
  );
}
