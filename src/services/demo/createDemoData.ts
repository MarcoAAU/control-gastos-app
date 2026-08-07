import { SEED_BANKS, SEED_CATEGORIES, SEED_SUBCATEGORIES } from '@/constants';
import { CURRENT_SCHEMA_VERSION, type Account, type AppData, type Transaction } from '@/models';
import { createDefaultSettings } from '@/constants';

/**
 * Datos de ejemplo para probar la app sin datos propios. Porta
 * "Restablecer datos de demo" de v1 (`app.js:861`).
 *
 * ── DOS DIFERENCIAS CON v1, Y LAS DOS IMPORTAN ────────────────────────────
 *
 * 1. **Los importes son fijos, no aleatorios.** v1 generaba movimientos con
 *    `Math.random()`, así que dos personas mirando "los mismos" datos de demo
 *    veían cifras distintas y no se podía verificar nada. Con importes fijos,
 *    los totales de esta función son comprobables y sirven de ejemplo estable.
 *
 * 2. **Nunca se invocan solas.** En v1, arrancar sin datos generaba una demo
 *    automáticamente (`loadState() || makeDemoState()`), y el usuario acabó
 *    con saldos que él no había escrito. Aquí sólo se cargan si el usuario
 *    pulsa el botón y confirma. La app vacía se queda vacía.
 *
 * ⚠️ ESTOS DATOS SON FICTICIOS. Existen para enseñar cómo se ve la app llena,
 * no para representar dinero de nadie.
 */

const DEMO_ACCOUNTS: ReadonlyArray<Omit<Account, 'createdAt' | 'updatedAt' | 'archivedAt'>> = [
  {
    id: 'demo_ahorros',
    name: 'Cuenta de ejemplo',
    bankId: 'bancolombia',
    type: 'savings',
    color: '#ffd166',
    icon: '🏦',
    initialBalance: 1_200_000,
    initialBalanceDate: '2026-07-01',
    includeInTotals: true,
  },
  {
    id: 'demo_efectivo',
    name: 'Efectivo de ejemplo',
    bankId: 'sys_bank_none',
    type: 'cash',
    color: '#4bd9c0',
    icon: '💵',
    initialBalance: 80_000,
    initialBalanceDate: '2026-07-01',
    includeInTotals: true,
  },
];

/** `[díasAtrás, tipo, importe, categoría, descripción, cuenta]` */
const DEMO_MOVEMENTS: ReadonlyArray<
  [number, 'income' | 'expense', number, string, string, string]
> = [
  [30, 'income', 2_500_000, 'salario', 'Salario', 'demo_ahorros'],
  [28, 'expense', 950_000, 'vivienda', 'Arriendo', 'demo_ahorros'],
  [25, 'expense', 180_000, 'comida', 'Mercado', 'demo_ahorros'],
  [20, 'expense', 45_000, 'transporte', 'Gasolina', 'demo_ahorros'],
  [14, 'expense', 62_000, 'servicios', 'Internet', 'demo_ahorros'],
  [10, 'income', 400_000, 'freelance', 'Proyecto', 'demo_ahorros'],
  [7, 'expense', 28_000, 'comida', 'Almuerzo', 'demo_efectivo'],
  [5, 'expense', 120_000, 'compras', 'Ropa', 'demo_ahorros'],
  [3, 'expense', 15_000, 'transporte', 'Bus', 'demo_efectivo'],
  [1, 'expense', 55_000, 'entretenimiento', 'Cine', 'demo_ahorros'],
];

function isoDaysAgo(days: number, from: Date): string {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Documento completo de ejemplo, listo para `replaceAllData`.
 *
 * Las fechas son relativas a hoy para que las pestañas Hoy/Semana/Mes y la
 * gráfica de 14 días tengan algo que mostrar. Con fechas fijas, la demo se
 * quedaría vacía en cuanto pasara un mes.
 */
export function createDemoData(now = new Date()): AppData {
  const timestamp = now.toISOString();

  const accounts: Account[] = DEMO_ACCOUNTS.map((account) => ({
    ...account,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  }));

  const transactions: Transaction[] = DEMO_MOVEMENTS.map(
    ([daysAgo, type, amount, categoryId, description, accountId], index) => ({
      id: `demo_tx_${index + 1}`,
      type,
      amount,
      date: isoDaysAgo(daysAgo, now),
      time: '12:00',
      accountId,
      categoryId,
      subcategoryId: null,
      description,
      notes: '',
      source: 'manual',
      isAdjustment: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    banks: SEED_BANKS.map((seed) => ({ ...seed, createdAt: timestamp, archivedAt: null })),
    accounts,
    categories: SEED_CATEGORIES.map((seed) => ({
      ...seed,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    })),
    subcategories: SEED_SUBCATEGORIES.map((seed) => ({
      ...seed,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    })),
    transactions,
    history: [],
    settings: createDefaultSettings(),
    meta: {
      createdAt: timestamp,
      updatedAt: timestamp,
      // Deja rastro de que estos datos son ficticios: si alguien los reporta
      // como un error de cálculo, esto lo explica.
      migratedFrom: 'demo',
      migrationWarnings: [],
    },
  };
}
