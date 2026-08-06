import {
  ACCOUNT_TYPE_META,
  DEFAULT_ACCOUNT_TYPE,
  DEFAULT_COLOR,
  LEGACY_MANUAL_BANK_ID,
  SEED_BANKS,
  SEED_CATEGORIES,
  SEED_SUBCATEGORIES,
  SYSTEM_ACCOUNT_UNASSIGNED,
  SYSTEM_BANK_NONE,
  SYSTEM_CATEGORY_UNCATEGORIZED,
  createDefaultSettings,
} from '@/constants';
import {
  ACCOUNT_TYPES,
  CURRENT_SCHEMA_VERSION,
  type Account,
  type AccountType,
  type AppData,
  type Bank,
  type Category,
  type HistoryEntry,
  type ID,
  type Subcategory,
  type Transaction,
} from '@/models';
import { computeAccountBalance } from '@/services/balance/computeAccountBalance';
import { createSlugId } from '@/services/id/createId';
import {
  asFiniteNumber,
  asHexColor,
  asISODate,
  asOneOf,
  asPositiveAmount,
  asString,
} from '../validation/coerce';
import { readLegacyCollections, type LegacyBlob } from '../validation/legacy';
import type { MigrationOutcome } from './types';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MIGRACIÓN v1 → v2. El código de mayor riesgo del proyecto.              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Convierte el blob de v1 en un `AppData` v2. Opera SOBRE UNA COPIA en
 * memoria: no lee ni escribe almacenamiento (de eso se encarga el
 * repositorio, que además respalda el original antes de llamar aquí). Eso la
 * hace una función pura y, por tanto, testeable de verdad.
 *
 * ── LAS TRES GARANTÍAS ────────────────────────────────────────────────────
 *
 * 1. NO SE PIERDE NINGÚN MOVIMIENTO RECUPERABLE.
 *    Un `accountId` que ya no existe no descarta el movimiento: se reasigna a
 *    la cuenta "Sin asignar". Una categoría desconocida no lo descarta: cae en
 *    "Sin categoría". Sólo se descartan los registros literalmente
 *    irrecuperables (sin importe válido o sin fecha válida) y siempre con
 *    aviso nominal.
 *
 * 2. EL SALDO VISIBLE NO CAMBIA.
 *    v1 guardaba el saldo como un campo; v2 lo deriva del libro. Para que el
 *    usuario no vea sus cifras cambiar solas al actualizar, se despeja hacia
 *    atrás el saldo inicial:
 *
 *        initialBalance = balanceViejo − Σ(ingresos) + Σ(gastos)
 *
 *    Así `computeAccountBalance()` devuelve el día 1 exactamente el mismo
 *    número que mostraba v1, sea cual sea la forma en que v1 llegó a él.
 *
 * 3. EL ORIGINAL NO SE TOCA.
 *    Esta función no borra nada. `gastos_app_data_v1` sigue intacto para
 *    siempre.
 */

const LEGACY_SOURCE_MAP: Record<string, Transaction['source']> = {
  manual: 'manual',
  bank: 'imported', // v1 llamaba "bank" a los movimientos de la demo.
};

function nowInstant(): string {
  return new Date().toISOString();
}

/** Traduce el `type` de texto libre de v1 a la unión cerrada de v2. */
function mapAccountType(legacyType: unknown): AccountType {
  const label = asString(legacyType).trim().toLowerCase();
  for (const type of ACCOUNT_TYPES) {
    const legacy = ACCOUNT_TYPE_META[type].legacyLabel;
    if (legacy && legacy.toLowerCase() === label) return type;
  }
  // "Billetera digital" y cualquier otro texto que no estuviera en el
  // <select>: se conserva la cuenta como 'other' en vez de perderla.
  return label === '' ? DEFAULT_ACCOUNT_TYPE : 'other';
}

export function legacyToV2(input: unknown): MigrationOutcome {
  const warnings: string[] = [];
  const timestamp = nowInstant();
  const blob = (input ?? {}) as LegacyBlob;
  const legacy = readLegacyCollections(blob);

  // ── 1. Bancos ───────────────────────────────────────────────────────────
  // Se siembran los de la app y se CREAN los que el usuario escribió a mano en
  // v1, que allí eran sólo un texto dentro de la cuenta y no se podían
  // reutilizar. Un id derivado del nombre garantiza que dos cuentas del mismo
  // banco apunten al mismo registro en vez de duplicarlo.
  const banks: Bank[] = SEED_BANKS.map((seed) => ({
    ...seed,
    createdAt: timestamp,
    archivedAt: null,
  }));
  const bankIds = new Set(banks.map((b) => b.id));

  function resolveBankId(rawBankId: unknown, rawBankName: unknown): ID {
    const legacyId = asString(rawBankId).trim();
    if (legacyId && legacyId !== LEGACY_MANUAL_BANK_ID && bankIds.has(legacyId)) {
      return legacyId;
    }

    const name = asString(rawBankName).trim();
    // 'Manual' era la etiqueta interna de v1 para "sin entidad", no un banco.
    if (!name || name.toLowerCase() === 'manual') return SYSTEM_BANK_NONE;

    const id = createSlugId('bank', name);
    if (!bankIds.has(id)) {
      banks.push({
        id,
        name,
        color: DEFAULT_COLOR,
        icon: 'bank',
        isBuiltIn: false,
        createdAt: timestamp,
        archivedAt: null,
      });
      bankIds.add(id);
    }
    return id;
  }

  // ── 2. Categorías ───────────────────────────────────────────────────────
  // v1 las tenía en constantes del código, no en los datos: no hay nada que
  // migrar, sólo sembrar. Lo crítico es que los ids coincidan literalmente
  // (`seedCategories.test.ts` lo protege).
  const categories: Category[] = SEED_CATEGORIES.map((seed) => ({
    ...seed,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  }));
  const categoryIds = new Set(categories.map((c) => c.id));
  const subcategories: Subcategory[] = SEED_SUBCATEGORIES.map((seed) => ({
    ...seed,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  }));

  // ── 3. Cuentas (primera pasada: identidad, sin saldo) ───────────────────
  // El saldo inicial necesita conocer los movimientos, así que se calcula
  // después. Aquí sólo se fija quién es cada cuenta.
  const legacyBalances = new Map<ID, number>();
  const accounts: Account[] = [];
  const seenAccountIds = new Set<ID>();

  for (const raw of legacy.accounts) {
    const id = asString(raw['id']).trim();
    if (!id) {
      warnings.push('Se omitió una cuenta sin identificador.');
      continue;
    }
    if (seenAccountIds.has(id)) {
      warnings.push(`Se omitió una cuenta duplicada (${asString(raw['nickname']) || id}).`);
      continue;
    }
    seenAccountIds.add(id);

    const name = asString(raw['nickname']).trim() || 'Cuenta sin nombre';
    const rawBalance = raw['balance'];
    const balance = asFiniteNumber(rawBalance, Number.NaN);
    if (!Number.isFinite(balance)) {
      warnings.push(`La cuenta "${name}" tenía un saldo ilegible; se tomó como $0.`);
    }
    legacyBalances.set(id, Number.isFinite(balance) ? balance : 0);

    accounts.push({
      id,
      name,
      bankId: resolveBankId(raw['bankId'], raw['bankName']),
      type: mapAccountType(raw['type']),
      color: asHexColor(raw['color'], DEFAULT_COLOR),
      // El emoji de v1 se conserva TAL CUAL: <Icon> lo renderiza como texto al
      // no encontrarlo en el registro. Cero traducción, cero riesgo (ADR-011).
      icon: asString(raw['emoji']) || 'wallet',
      initialBalance: 0, // se despeja en el paso 5
      initialBalanceDate: '1970-01-01', // se ajusta en el paso 5
      includeInTotals: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    });
  }

  // ── 4. Movimientos ──────────────────────────────────────────────────────
  let unassignedNeeded = false;

  function migrateTransaction(
    raw: Record<string, unknown>,
    context: string,
  ): Transaction | null {
    const description = asString(raw['desc']).trim();
    const label = description || asString(raw['id']) || 'sin descripción';

    const amount = asPositiveAmount(raw['amount']);
    if (amount === null) {
      warnings.push(`${context}: se descartó "${label}" porque su importe no era válido.`);
      return null;
    }

    const date = asISODate(raw['date']);
    if (date === null) {
      // Inventar una fecha (hoy, por ejemplo) metería un movimiento antiguo en
      // los totales del día actual y falsearía el resumen sin que se note.
      // Preferimos descartarlo y decirlo con nombre y apellidos.
      warnings.push(`${context}: se descartó "${label}" porque su fecha no era válida.`);
      return null;
    }

    let accountId = asString(raw['accountId']).trim();
    if (!seenAccountIds.has(accountId)) {
      accountId = SYSTEM_ACCOUNT_UNASSIGNED;
      unassignedNeeded = true;
      warnings.push(`${context}: "${label}" apuntaba a una cuenta inexistente; se movió a "Sin asignar".`);
    }

    let categoryId = asString(raw['categoryId']).trim();
    if (!categoryIds.has(categoryId)) {
      warnings.push(`${context}: "${label}" tenía una categoría desconocida; se marcó como "Sin categoría".`);
      categoryId = SYSTEM_CATEGORY_UNCATEGORIZED;
    }

    return {
      id: asString(raw['id']).trim() || createSlugId('tx', `${date}_${label}`),
      // Sin `type` (movimientos muy antiguos de v1) se asume gasto: era el
      // caso mayoritario y el único que existía antes de añadir los ingresos.
      type: asOneOf(raw['type'], ['income', 'expense'] as const, 'expense'),
      amount,
      date,
      time: '00:00', // v1 no guardaba hora
      accountId,
      categoryId,
      subcategoryId: null,
      description,
      notes: '',
      source: LEGACY_SOURCE_MAP[asString(raw['source'])] ?? 'manual',
      isAdjustment: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  const transactions: Transaction[] = [];
  for (const raw of legacy.transactions) {
    const tx = migrateTransaction(raw, 'Movimientos');
    if (tx) transactions.push(tx);
  }

  // ── 5. Saldos iniciales despejados hacia atrás ──────────────────────────
  // GARANTÍA 2. Se usa la fecha del movimiento más antiguo de cada cuenta como
  // `initialBalanceDate`: el saldo inicial es, por definición, el que había
  // justo antes del primer movimiento conocido.
  const earliestDate = new Map<ID, string>();
  for (const tx of transactions) {
    const current = earliestDate.get(tx.accountId);
    if (current === undefined || tx.date < current) earliestDate.set(tx.accountId, tx.date);
  }

  for (const account of accounts) {
    const legacyBalance = legacyBalances.get(account.id);
    if (legacyBalance === undefined) continue; // cuenta sintética "Sin asignar"

    let net = 0;
    for (const tx of transactions) {
      if (tx.accountId !== account.id) continue;
      net += tx.type === 'income' ? tx.amount : -tx.amount;
    }

    const initial = legacyBalance - net;
    if (!Number.isFinite(initial)) {
      account.initialBalance = legacyBalance;
      warnings.push(`No se pudo recalcular el saldo inicial de "${account.name}"; se usó su saldo tal cual.`);
    } else {
      account.initialBalance = initial;
    }
    account.initialBalanceDate = earliestDate.get(account.id) ?? asISODate(timestamp.slice(0, 10)) ?? '1970-01-01';
  }

  // ── 6. Historial ────────────────────────────────────────────────────────
  // Los totales congelados NO se recalculan: un snapshot es una foto. Los de
  // v1 se copian tal cual y se marcan `origin: 'legacy'` para que la pantalla
  // de detalle avise de que allí "Ingresos" significaba otra cosa
  // (`app.js:221`). Ver nota 1 del checklist de regresión.
  const history: HistoryEntry[] = [];
  for (const raw of legacy.history) {
    const name = asString(raw['name']).trim() || 'Historial sin nombre';
    const startDate = asISODate(raw['startDate']);
    const endDate = asISODate(raw['endDate']);
    if (!startDate || !endDate) {
      warnings.push(`Se omitió el historial "${name}" porque su rango de fechas era inválido.`);
      continue;
    }

    const snapshotTxs: Transaction[] = [];
    for (const rawTx of readLegacyCollections({ transactions: raw['transactions'] }).transactions) {
      const tx = migrateTransaction(rawTx, `Historial "${name}"`);
      if (tx) snapshotTxs.push(tx);
    }

    // Entradas guardadas antes de que v1 congelara los totales (commit
    // 66c59af): no hay foto que respetar, así que se derivan de la copia.
    const hasFrozen = typeof raw['income'] === 'number' && typeof raw['expense'] === 'number';
    const income = hasFrozen
      ? asFiniteNumber(raw['income'])
      : snapshotTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = hasFrozen
      ? asFiniteNumber(raw['expense'])
      : snapshotTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    history.push({
      id: asString(raw['id']).trim() || createSlugId('hist', `${startDate}_${name}`),
      name,
      startDate,
      endDate,
      savedAt: asString(raw['savedAt']) || timestamp,
      totals: {
        income,
        expense,
        balance: typeof raw['balance'] === 'number' ? asFiniteNumber(raw['balance']) : income - expense,
      },
      transactions: snapshotTxs,
      origin: 'legacy',
    });
  }

  // ── 7. Cuenta "Sin asignar" ─────────────────────────────────────────────
  // Se crea AL FINAL, cuando ya se sabe si hizo falta — y hace falta tanto si
  // el huérfano estaba en los movimientos como si estaba dentro de una foto
  // del historial. Crearla antes de procesar el historial dejaría referencias
  // rotas en las entradas antiguas.
  //
  // No lleva saldo inicial ni entra en el "Saldo total": lo que contiene no es
  // dinero real del usuario, es el residuo pendiente de reasignar.
  if (unassignedNeeded) {
    accounts.push({
      id: SYSTEM_ACCOUNT_UNASSIGNED,
      name: 'Sin asignar',
      bankId: SYSTEM_BANK_NONE,
      type: 'other',
      color: DEFAULT_COLOR,
      icon: 'warning',
      initialBalance: 0,
      initialBalanceDate: earliestDate.get(SYSTEM_ACCOUNT_UNASSIGNED) ?? timestamp.slice(0, 10),
      includeInTotals: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    });
    seenAccountIds.add(SYSTEM_ACCOUNT_UNASSIGNED);
  }

  // ── 8. Verificación de integridad ───────────────────────────────────────
  // Comprueba la GARANTÍA 2 antes de devolver nada. Sólo avisa, no aborta:
  // llegados aquí, unos datos con un saldo desviado siguen siendo mucho mejor
  // que ningún dato.
  for (const account of accounts) {
    const legacyBalance = legacyBalances.get(account.id);
    if (legacyBalance === undefined) continue;
    const derived = computeAccountBalance(account, transactions);
    if (Math.abs(derived - legacyBalance) > 1) {
      warnings.push(
        `El saldo de "${account.name}" no coincide tras migrar (antes ${legacyBalance}, ahora ${derived}). Revísalo.`,
      );
    }
  }

  const data: AppData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    banks,
    accounts,
    categories,
    subcategories,
    transactions,
    history,
    settings: createDefaultSettings(),
    meta: {
      createdAt: timestamp,
      updatedAt: timestamp,
      migratedFrom: 'legacy',
      migrationWarnings: warnings,
    },
  };

  return { data, warnings };
}
