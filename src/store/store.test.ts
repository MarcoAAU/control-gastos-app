import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  SYSTEM_BANK_NONE,
  SYSTEM_CATEGORY_ADJUSTMENT,
  SYSTEM_CATEGORY_UNCATEGORIZED,
} from '@/constants';
import { computeAccountBalance } from '@/services/balance/computeAccountBalance';
import { solveAdjustment } from '@/services/balance/solveAdjustment';
import { AppDataRepository } from '@/storage/AppDataRepository';
import { createMemoryAdapter } from '@/storage/adapters/memoryAdapter';
import { StorageError, type StorageAdapter } from '@/storage/StorageAdapter';
import { createEmptyAppData } from '@/storage/migrations';
import { useAppStore } from './index';
import { startPersistence } from './persistence';
import { selectPersisted } from './types';

/** Deja el store como recién arrancado, sin residuos del test anterior. */
function resetStore(): void {
  const empty = createEmptyAppData();
  useAppStore.setState({
    schemaVersion: empty.schemaVersion,
    banks: empty.banks,
    accounts: [],
    categories: empty.categories,
    subcategories: [],
    transactions: [],
    history: [],
    settings: empty.settings,
    meta: empty.meta,
    status: 'ready',
    startupWarnings: [],
    persistenceError: null,
    filters: { transactions: {}, reports: {} },
    search: { transactions: '', reports: '' },
    toasts: [],
  });
}

function addTestAccount(initialBalance = 1000000): string {
  return useAppStore.getState().addAccount({
    name: 'Cuenta principal',
    initialBalance,
    initialBalanceDate: '2026-01-01',
  });
}

beforeEach(() => {
  resetStore();
});

describe('cuentas — el saldo es derivado, no almacenado', () => {
  it('no expone ninguna acción para escribir un saldo directamente', () => {
    const state = useAppStore.getState() as unknown as Record<string, unknown>;
    // Si algún día aparece un setBalance, el descuadre de v1 puede volver.
    expect(state['setBalance']).toBeUndefined();
    expect(state['setAccountBalance']).toBeUndefined();
  });

  it('usa el saldo inicial que da el usuario, sin inventar ninguno', () => {
    // v1 asignaba un valor automático al crear la cuenta y el usuario lo
    // reportó como error.
    const id = addTestAccount(2500000);
    const account = useAppStore.getState().accounts.find((a) => a.id === id);
    expect(account?.initialBalance).toBe(2500000);
  });

  it('crear una cuenta NO genera movimientos automáticos', () => {
    // Otra queja explícita del usuario sobre v1.
    addTestAccount();
    expect(useAppStore.getState().transactions).toEqual([]);
  });

  it('el saldo refleja los movimientos sin que ninguna acción lo actualice', () => {
    const id = addTestAccount(1000000);
    const { addTransaction } = useAppStore.getState();
    addTransaction({ type: 'expense', amount: 150000, date: '2026-06-01', accountId: id, categoryId: 'comida' });
    addTransaction({ type: 'income', amount: 400000, date: '2026-06-02', accountId: id, categoryId: 'salario' });

    const state = useAppStore.getState();
    const account = state.accounts.find((a) => a.id === id)!;
    expect(computeAccountBalance(account, state.transactions)).toBe(1250000);
  });

  it('borrar un movimiento devuelve el saldo a su valor anterior', () => {
    const id = addTestAccount(500000);
    const txId = useAppStore.getState().addTransaction({
      type: 'expense', amount: 80000, date: '2026-06-01', accountId: id, categoryId: 'comida',
    });

    useAppStore.getState().deleteTransaction(txId);

    const state = useAppStore.getState();
    expect(computeAccountBalance(state.accounts[0]!, state.transactions)).toBe(500000);
  });

  it('archivar una cuenta no la borra ni pierde sus movimientos', () => {
    const id = addTestAccount();
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 1000, date: '2026-06-01', accountId: id, categoryId: 'comida',
    });

    useAppStore.getState().archiveAccount(id);

    const state = useAppStore.getState();
    expect(state.accounts).toHaveLength(1);
    expect(state.accounts[0]?.archivedAt).not.toBeNull();
    expect(state.transactions).toHaveLength(1);
  });
});

describe('movimientos', () => {
  it('normaliza el importe a positivo: el signo lo lleva el tipo', () => {
    const id = addTestAccount();
    const txId = useAppStore.getState().addTransaction({
      type: 'expense', amount: -50000, date: '2026-06-01', accountId: id, categoryId: 'comida',
    });
    expect(useAppStore.getState().transactions.find((t) => t.id === txId)?.amount).toBe(50000);
  });

  it('duplica un movimiento con id nuevo y fecha nueva', () => {
    const id = addTestAccount();
    const original = useAppStore.getState().addTransaction({
      type: 'expense', amount: 45000, date: '2026-06-01', accountId: id,
      categoryId: 'comida', description: 'Mercado',
    });

    const copia = useAppStore.getState().duplicateTransaction(original, '2026-07-01');

    const state = useAppStore.getState();
    expect(copia).not.toBe(original);
    expect(state.transactions).toHaveLength(2);
    const nueva = state.transactions.find((t) => t.id === copia)!;
    expect(nueva.description).toBe('Mercado');
    expect(nueva.date).toBe('2026-07-01');
  });

  it('duplicar algo inexistente devuelve null sin romper nada', () => {
    expect(useAppStore.getState().duplicateTransaction('no_existe')).toBeNull();
    expect(useAppStore.getState().transactions).toEqual([]);
  });
});

describe('ajuste de saldo (ADR-004)', () => {
  it('cuadra la cuenta creando un movimiento marcado como ajuste', () => {
    const id = addTestAccount(1000000);
    const { adjustAccountBalance } = useAppStore.getState();

    adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1200000, date: '2026-06-15',
    });

    const state = useAppStore.getState();
    const ajuste = state.transactions[0]!;
    expect(ajuste.isAdjustment).toBe(true);
    expect(ajuste.source).toBe('adjustment');
    expect(ajuste.categoryId).toBe(SYSTEM_CATEGORY_ADJUSTMENT);
    expect(ajuste.type).toBe('income');
    expect(ajuste.amount).toBe(200000);
    expect(computeAccountBalance(state.accounts[0]!, state.transactions)).toBe(1200000);
  });

  it('un ajuste a la baja se registra como gasto', () => {
    const id = addTestAccount(1000000);
    useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 700000, date: '2026-06-15',
    });
    const state = useAppStore.getState();
    expect(state.transactions[0]?.type).toBe('expense');
    expect(computeAccountBalance(state.accounts[0]!, state.transactions)).toBe(700000);
  });

  it('BORRAR el ajuste deshace el cambio: es reversible', () => {
    const id = addTestAccount(1000000);
    const ajusteId = useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1200000, date: '2026-06-15',
    })!;

    useAppStore.getState().deleteTransaction(ajusteId);

    const state = useAppStore.getState();
    expect(computeAccountBalance(state.accounts[0]!, state.transactions)).toBe(1000000);
  });

  it('no crea nada si el saldo ya es el correcto', () => {
    const id = addTestAccount(1000000);
    const result = useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1000000, date: '2026-06-15',
    });
    expect(result).toBeNull();
    expect(useAppStore.getState().transactions).toEqual([]);
  });

  it('el ajuste que registra el store coincide con el que calcula solveAdjustment', () => {
    // Este test es el que mantiene unidas las dos mitades del ajuste: el
    // importe que la pantalla ANUNCIA al usuario sale de `solveAdjustment`, y
    // el que se REGISTRA sale del store. Si alguna vez dejaran de coincidir,
    // la app diría "se registró un ajuste de $200.000" y guardaría otra cosa.
    const id = addTestAccount(1000000);
    const plan = solveAdjustment(1000000, 1200000);

    useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1200000, date: '2026-06-15',
    });

    const registrado = useAppStore.getState().transactions[0]!;
    expect(registrado.type).toBe(plan.direction);
    expect(registrado.amount).toBe(plan.amount);
  });

  it('ignora una diferencia de céntimos en vez de guardar un ajuste de $0', () => {
    const id = addTestAccount(1000000);
    const result = useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1000000.4, date: '2026-06-15',
    });
    expect(result).toBeNull();
    expect(useAppStore.getState().transactions).toEqual([]);
  });

  it('NO reescribe el saldo inicial: el pasado queda intacto', () => {
    // Reescribir `initialBalance` cambiaría retroactivamente todos los
    // reportes y la curva de evolución del saldo.
    const id = addTestAccount(1000000);
    useAppStore.getState().adjustAccountBalance({
      accountId: id, currentBalance: 1000000, targetBalance: 1200000, date: '2026-06-15',
    });
    expect(useAppStore.getState().accounts[0]?.initialBalance).toBe(1000000);
  });
});

describe('cambiar el saldo inicial (ADR-020) — reescribe el pasado, a diferencia del ajuste', () => {
  it('mueve el saldo actual exactamente lo que se movió el inicial', () => {
    const id = addTestAccount(1000000);
    const { addTransaction, updateAccount } = useAppStore.getState();
    addTransaction({ type: 'expense', amount: 200000, date: '2026-06-01', accountId: id, categoryId: 'comida' });

    const antes = computeAccountBalance(
      useAppStore.getState().accounts[0]!,
      useAppStore.getState().transactions,
    );
    expect(antes).toBe(800000);

    updateAccount(id, { initialBalance: 1500000 });

    const despues = computeAccountBalance(
      useAppStore.getState().accounts[0]!,
      useAppStore.getState().transactions,
    );
    // +500.000 en el inicial ⇒ +500.000 en el actual. Los movimientos de
    // encima no se tocan.
    expect(despues).toBe(1300000);
  });

  it('NO registra ningún movimiento: por eso no deja rastro', () => {
    // Ésta es la diferencia observable con "Ajustar saldo", que sí crea uno.
    const id = addTestAccount(1000000);
    useAppStore.getState().updateAccount(id, { initialBalance: 2000000 });
    expect(useAppStore.getState().transactions).toEqual([]);
  });

  it('no altera los movimientos existentes', () => {
    const id = addTestAccount(1000000);
    const txId = useAppStore.getState().addTransaction({
      type: 'expense', amount: 200000, date: '2026-06-01', accountId: id, categoryId: 'comida',
    });
    const antes = { ...useAppStore.getState().transactions.find((t) => t.id === txId)! };

    useAppStore.getState().updateAccount(id, { initialBalance: 9000000 });

    const despues = useAppStore.getState().transactions.find((t) => t.id === txId)!;
    expect(despues.amount).toBe(antes.amount);
    expect(despues.date).toBe(antes.date);
  });

  it('acepta un saldo inicial negativo (una tarjeta que arrancaba con deuda)', () => {
    const id = addTestAccount(0);
    useAppStore.getState().updateAccount(id, { initialBalance: -420000 });
    expect(useAppStore.getState().accounts[0]?.initialBalance).toBe(-420000);
  });
});

describe('bancos personalizados', () => {
  it('renombrar el banco cambia el rótulo de TODAS sus cuentas a la vez', () => {
    // En v1 el nombre se copiaba dentro de cada cuenta (`bankName`), así que
    // renombrar exigía editar una por una — y era imposible reutilizarlo.
    const { addBank, addAccount, updateBank } = useAppStore.getState();
    const bankId = addBank({ name: 'Banco Agrario' });
    addAccount({ name: 'Ahorros', bankId, initialBalance: 100000, initialBalanceDate: '2026-01-01' });
    addAccount({ name: 'Corriente', bankId, initialBalance: 200000, initialBalanceDate: '2026-01-01' });

    updateBank(bankId, { name: 'Banco Agrario de Colombia' });

    const state = useAppStore.getState();
    const bank = state.banks.find((b) => b.id === bankId);
    expect(bank?.name).toBe('Banco Agrario de Colombia');
    // Las cuentas referencian el id, no una copia del nombre.
    expect(state.accounts.every((a) => a.bankId === bankId)).toBe(true);
  });

  it('no deja renombrar el banco de sistema "Sin banco"', () => {
    useAppStore.getState().updateBank(SYSTEM_BANK_NONE, { name: 'Otro nombre' });
    const bank = useAppStore.getState().banks.find((b) => b.id === SYSTEM_BANK_NONE);
    expect(bank?.name).toBe('Sin banco');
  });

  it('escribir dos veces el mismo banco no lo duplica', () => {
    const { addBank } = useAppStore.getState();
    const primero = addBank({ name: 'Banco Agrario' });
    const segundo = addBank({ name: 'banco agrario' }); // otra capitalización
    expect(segundo).toBe(primero);
    expect(useAppStore.getState().banks.filter((b) => b.name.toLowerCase().includes('agrario')))
      .toHaveLength(1);
  });
});

describe('categorías', () => {
  it('archivar una categoría reasigna sus movimientos en vez de dejarlos huérfanos', () => {
    const accountId = addTestAccount();
    const catId = useAppStore.getState().addCategory({ name: 'Mascotas' });
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 30000, date: '2026-06-01', accountId, categoryId: catId,
    });

    useAppStore.getState().archiveCategory(catId, 'otros');

    const state = useAppStore.getState();
    expect(state.transactions[0]?.categoryId).toBe('otros');
    expect(state.categories.find((c) => c.id === catId)?.archivedAt).not.toBeNull();
  });

  it('no permite editar ni archivar una categoría de sistema', () => {
    const { updateCategory, archiveCategory } = useAppStore.getState();
    updateCategory(SYSTEM_CATEGORY_ADJUSTMENT, { name: 'Renombrada' });
    archiveCategory(SYSTEM_CATEGORY_ADJUSTMENT);

    const cat = useAppStore.getState().categories.find((c) => c.id === SYSTEM_CATEGORY_ADJUSTMENT);
    expect(cat?.name).toBe('Ajuste de saldo');
    expect(cat?.archivedAt).toBeNull();
  });

  it('sin destino, los movimientos caen en "Sin categoría" y NO se pierden', () => {
    // El caso por defecto: el usuario archiva sin elegir a dónde. Nunca puede
    // quedar un movimiento apuntando a una categoría archivada, porque
    // desaparecería de todos los desgloses por categoría.
    const accountId = addTestAccount();
    const catId = useAppStore.getState().addCategory({ name: 'Efímera' });
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 12000, date: '2026-06-01', accountId, categoryId: catId,
    });

    useAppStore.getState().archiveCategory(catId);

    const state = useAppStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0]?.categoryId).toBe(SYSTEM_CATEGORY_UNCATEGORIZED);
  });

  it('archivar una categoría archiva también sus subcategorías', () => {
    // Una subcategoría viva colgando de una categoría archivada se ofrecería
    // en el formulario sin que su categoría exista ya.
    const catId = useAppStore.getState().addCategory({ name: 'Comida' });
    const subId = useAppStore.getState().addSubcategory({ categoryId: catId, name: 'Mercado' });

    useAppStore.getState().archiveCategory(catId);

    const sub = useAppStore.getState().subcategories.find((s) => s.id === subId);
    expect(sub?.archivedAt).not.toBeNull();
  });

  it('los movimientos pierden la subcategoría al reasignarse, no la arrastran', () => {
    // Mantener "Mercado" tras mover el gasto a "Otros" dejaría una
    // subcategoría que no pertenece a su nueva categoría.
    const accountId = addTestAccount();
    const catId = useAppStore.getState().addCategory({ name: 'Comida' });
    const subId = useAppStore.getState().addSubcategory({ categoryId: catId, name: 'Mercado' });
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 50000, date: '2026-06-01', accountId,
      categoryId: catId, subcategoryId: subId,
    });

    useAppStore.getState().archiveCategory(catId, 'otros');

    const tx = useAppStore.getState().transactions[0];
    expect(tx?.categoryId).toBe('otros');
    expect(tx?.subcategoryId).toBeNull();
  });

  it('archivar SÓLO una subcategoría conserva la categoría del movimiento', () => {
    const accountId = addTestAccount();
    const catId = useAppStore.getState().addCategory({ name: 'Comida' });
    const subId = useAppStore.getState().addSubcategory({ categoryId: catId, name: 'Mercado' });
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 50000, date: '2026-06-01', accountId,
      categoryId: catId, subcategoryId: subId,
    });

    useAppStore.getState().archiveSubcategory(subId);

    const tx = useAppStore.getState().transactions[0];
    expect(tx?.categoryId).toBe(catId); // el nivel 1 se mantiene
    expect(tx?.subcategoryId).toBeNull(); // sólo se pierde el nivel 2
  });

  it('una categoría archivada desaparece de las activas pero sigue existiendo', () => {
    // Borrado LÓGICO: los movimientos antiguos deben poder resolver su nombre.
    const catId = useAppStore.getState().addCategory({ name: 'Temporal' });
    useAppStore.getState().archiveCategory(catId);

    const state = useAppStore.getState();
    expect(state.categories.some((c) => c.id === catId)).toBe(true);
    expect(state.categories.find((c) => c.id === catId)?.archivedAt).not.toBeNull();
  });

  it('restaurar una categoría la devuelve a la circulación', () => {
    const catId = useAppStore.getState().addCategory({ name: 'Temporal' });
    useAppStore.getState().archiveCategory(catId);
    useAppStore.getState().restoreCategory(catId);

    expect(useAppStore.getState().categories.find((c) => c.id === catId)?.archivedAt).toBeNull();
  });
});

describe('bancos', () => {
  it('reutiliza el banco existente en vez de duplicarlo', () => {
    const { addBank } = useAppStore.getState();
    const primero = addBank({ name: 'Scotiabank Colpatria' });
    const segundo = addBank({ name: 'scotiabank colpatria' }); // mismo, otro caso

    expect(segundo).toBe(primero);
    expect(useAppStore.getState().banks.filter((b) => !b.isBuiltIn)).toHaveLength(1);
  });

  it('el id coincide con el que genera la migración desde v1', () => {
    // Así un banco creado a mano y el mismo migrado convergen al mismo registro.
    const id = useAppStore.getState().addBank({ name: 'Scotiabank Colpatria' });
    expect(id).toBe('bank_scotiabank_colpatria');
  });
});

describe('historial', () => {
  it('congela los totales y excluye los ajustes', () => {
    const accountId = addTestAccount();
    const { addTransaction, adjustAccountBalance } = useAppStore.getState();
    addTransaction({ type: 'income', amount: 1000000, date: '2026-06-05', accountId, categoryId: 'salario' });
    addTransaction({ type: 'expense', amount: 300000, date: '2026-06-06', accountId, categoryId: 'comida' });
    adjustAccountBalance({ accountId, currentBalance: 0, targetBalance: 999999, date: '2026-06-07' });

    const state = useAppStore.getState();
    state.saveHistoryEntry({
      name: 'Junio', startDate: '2026-06-01', endDate: '2026-06-30',
      transactions: state.transactions,
    });

    const entry = useAppStore.getState().history[0]!;
    // El ajuste de 999.999 NO debe aparecer en los ingresos.
    expect(entry.totals).toEqual({ income: 1000000, expense: 300000, balance: 700000 });
    expect(entry.origin).toBe('v2');
  });

  it('los totales NO cambian aunque después se edite un movimiento', () => {
    const accountId = addTestAccount();
    const txId = useAppStore.getState().addTransaction({
      type: 'expense', amount: 100000, date: '2026-06-01', accountId, categoryId: 'comida',
    });
    const state = useAppStore.getState();
    state.saveHistoryEntry({
      name: 'Junio', startDate: '2026-06-01', endDate: '2026-06-30', transactions: state.transactions,
    });

    useAppStore.getState().updateTransaction(txId, { amount: 999999 });

    expect(useAppStore.getState().history[0]?.totals.expense).toBe(100000);
  });
});

describe('persistencia — un único suscriptor', () => {
  it('escribe tras el debounce, no en cada acción', async () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const handle = startPersistence(new AppDataRepository(adapter));

    const id = addTestAccount();
    useAppStore.getState().addTransaction({
      type: 'expense', amount: 1000, date: '2026-06-01', accountId: id, categoryId: 'comida',
    });

    expect(await adapter.getItem(STORAGE_KEY)).toBeNull(); // aún nada

    await vi.advanceTimersByTimeAsync(400);
    const raw = await adapter.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).accounts).toHaveLength(1);

    handle.stop();
    vi.useRealTimers();
  });

  it('NO escribe cuando sólo cambia la interfaz', async () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const handle = startPersistence(new AppDataRepository(adapter));

    // Filtros, búsqueda, pestaña y toasts son estado efímero: no se persisten.
    useAppStore.getState().setSearch('transactions', 'mercado');
    useAppStore.getState().setPeriod('month');
    useAppStore.getState().showToast('hola');
    useAppStore.getState().patchFilters('transactions', { types: ['expense'] });

    await vi.advanceTimersByTimeAsync(400);
    expect(await adapter.getItem(STORAGE_KEY)).toBeNull();

    handle.stop();
    vi.useRealTimers();
  });

  it('flush() fuerza la escritura inmediata', async () => {
    const adapter = createMemoryAdapter();
    const handle = startPersistence(new AppDataRepository(adapter));

    addTestAccount();
    await handle.flush();

    expect(await adapter.getItem(STORAGE_KEY)).not.toBeNull();
    handle.stop();
  });

  it('un fallo de guardado NO tumba la app: lo deja visible en el estado', async () => {
    const failing: StorageAdapter = {
      ...createMemoryAdapter(),
      async setItem() {
        throw new StorageError('quota-exceeded', 'Sin espacio.');
      },
    };
    const handle = startPersistence(new AppDataRepository(failing));

    addTestAccount();
    await handle.flush();

    // En v1 esto pasaba en silencio y el usuario seguía escribiendo
    // movimientos que no se guardaban.
    expect(useAppStore.getState().persistenceError).toBe('Sin espacio.');
    expect(useAppStore.getState().accounts).toHaveLength(1); // la app sigue viva
    handle.stop();
  });

  it('el estado persistido es exactamente AppData, sin nada de la interfaz', () => {
    useAppStore.getState().setSearch('reports', 'algo');
    useAppStore.getState().showToast('hola');

    const persisted = selectPersisted(useAppStore.getState()) as unknown as Record<string, unknown>;

    expect(Object.keys(persisted).sort()).toEqual([
      'accounts', 'banks', 'categories', 'history', 'meta',
      'schemaVersion', 'settings', 'subcategories', 'transactions',
    ]);
    expect(persisted['search']).toBeUndefined();
    expect(persisted['toasts']).toBeUndefined();
    expect(persisted['filters']).toBeUndefined();
  });

  it('una acción que no cambia nada no dispara escritura', async () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const handle = startPersistence(new AppDataRepository(adapter));

    // Ninguna existe: las acciones devuelven la referencia original.
    useAppStore.getState().updateAccount('no_existe', { name: 'X' });
    useAppStore.getState().deleteTransaction('no_existe');
    useAppStore.getState().archiveAccount('no_existe');

    await vi.advanceTimersByTimeAsync(400);
    expect(await adapter.getItem(STORAGE_KEY)).toBeNull();

    handle.stop();
    vi.useRealTimers();
  });
});

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Borrar los datos NO puede dejar la app sin catálogo.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El fallo reportado: "Borrar todos los datos" vaciaba también categorías y
 * bancos —de 15 y 4 a cero—. Sin categorías no se clasifica un gasto y, sobre
 * todo, **sin bancos no se puede crear una cuenta**: el usuario pulsaba
 * "borrar mis datos" y se quedaba con una app inservible.
 */
describe('borrado de datos', () => {
  beforeEach(resetStore);

  it('borra cuentas, movimientos e historial', () => {
    const accountId = addTestAccount();
    useAppStore.getState().addTransaction({
      type: 'expense',
      amount: 50000,
      date: '2026-08-01',
      accountId,
      categoryId: 'comida',
    });

    useAppStore.getState().clearAllData();

    const state = useAppStore.getState();
    expect(state.accounts).toHaveLength(0);
    expect(state.transactions).toHaveLength(0);
    expect(state.history).toHaveLength(0);
  });

  it('CONSERVA las categorías y los bancos de fábrica', () => {
    const antesCategorias = useAppStore.getState().categories.length;
    const antesBancos = useAppStore.getState().banks.length;
    expect(antesCategorias).toBeGreaterThan(0);

    useAppStore.getState().clearAllData();

    const state = useAppStore.getState();
    expect(state.categories).toHaveLength(antesCategorias);
    expect(state.banks).toHaveLength(antesBancos);
  });

  it('conserva las categorías de sistema, de las que depende el ajuste de saldo', () => {
    useAppStore.getState().clearAllData();
    const ids = useAppStore.getState().categories.map((c) => c.id);
    expect(ids).toContain(SYSTEM_CATEGORY_ADJUSTMENT);
    expect(ids).toContain(SYSTEM_CATEGORY_UNCATEGORIZED);
  });

  it('deja la app en condiciones de crear una cuenta otra vez', () => {
    useAppStore.getState().clearAllData();
    expect(useAppStore.getState().banks.length).toBeGreaterThan(0);

    const id = addTestAccount(250000);
    expect(useAppStore.getState().accounts.find((a) => a.id === id)).toBeDefined();
  });

  it('no duplica nada al borrar dos veces seguidas', () => {
    useAppStore.getState().clearAllData();
    const despuesDeUna = useAppStore.getState().categories.length;
    useAppStore.getState().clearAllData();

    const ids = useAppStore.getState().categories.map((c) => c.id);
    expect(ids).toHaveLength(despuesDeUna);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las preferencias sobreviven: borrar datos no es reconfigurar la app', () => {
    useAppStore.getState().setTheme('light');
    useAppStore.getState().clearAllData();
    expect(useAppStore.getState().settings.theme).toBe('light');
  });
});
