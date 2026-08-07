import type { Category, ID, Transaction } from '@/models';
import type { DateRange } from './periodTotals';

/**
 * Reparto del GASTO por categoría. Alimenta la dona del Inicio.
 *
 * ⚠️ Es FLUJO: sólo mira movimientos, nunca saldos. Los ajustes quedan fuera,
 * igual que en `periodTotals` — un ajuste no es un gasto en ninguna categoría,
 * y colarlo aquí pintaría una porción "Ajuste de saldo" gigante que no
 * corresponde a nada que el usuario haya comprado.
 */

export interface CategorySlice {
  categoryId: ID;
  name: string;
  color: string;
  icon: string;
  total: number;
  /** Porcentaje sobre el total del periodo, 0-100. Sin redondear. */
  percentage: number;
}

export interface BreakdownOptions {
  range?: DateRange;
  /** `'expense'` por defecto: la dona de v1 mostraba gastos. */
  type?: 'income' | 'expense';
}

/**
 * Devuelve las categorías con gasto en el periodo, de mayor a menor.
 *
 * Las categorías SIN movimientos no aparecen: una leyenda con quince entradas
 * a 0% no informa de nada y en móvil ocupa media pantalla.
 */
export function categoryBreakdown(
  transactions: readonly Transaction[],
  categoryById: Map<ID, Category>,
  options: BreakdownOptions = {},
): CategorySlice[] {
  const { range, type = 'expense' } = options;

  const totals = new Map<ID, number>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.isAdjustment) continue;
    if (tx.type !== type) continue;
    if (range && (tx.date < range.from || tx.date > range.to)) continue;

    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
    grandTotal += tx.amount;
  }

  const slices: CategorySlice[] = [];
  for (const [categoryId, total] of totals) {
    const category = categoryById.get(categoryId);
    slices.push({
      categoryId,
      // Una categoría borrada no debe dejar la porción sin nombre: se degrada
      // a un rótulo legible en vez de a `undefined`.
      name: category?.name ?? 'Sin categoría',
      color: category?.color ?? '#93a2c6',
      icon: category?.icon ?? 'cat-otros',
      total,
      // `grandTotal` no puede ser 0 aquí: si no hubo movimientos, el mapa está
      // vacío y no se entra al bucle.
      percentage: (total / grandTotal) * 100,
    });
  }

  return slices.sort((a, b) => b.total - a.total);
}

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

/**
 * Serie diaria para la gráfica de tendencia.
 *
 * Recibe los días ya construidos (`eachDayInRange`) en vez de calcularlos:
 * así los días sin movimientos aparecen a cero en lugar de desaparecer, que es
 * lo que hace que el eje horizontal sea honesto.
 *
 * Una sola pasada sobre los movimientos, O(días + movimientos). v1 recorría
 * TODOS los movimientos una vez por día (`app.js:322`): con 14 días y varios
 * años de historial, catorce recorridos completos en cada render.
 */
export function dailySeries(
  transactions: readonly Transaction[],
  days: readonly string[],
): DailyPoint[] {
  const index = new Map<string, DailyPoint>();
  const series = days.map((date) => {
    const point: DailyPoint = { date, income: 0, expense: 0 };
    index.set(date, point);
    return point;
  });

  for (const tx of transactions) {
    if (tx.isAdjustment) continue;
    const point = index.get(tx.date);
    if (!point) continue; // fuera de la ventana
    if (tx.type === 'income') point.income += tx.amount;
    else point.expense += tx.amount;
  }

  return series;
}
