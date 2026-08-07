import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_CATEGORY_ADJUSTMENT, STORAGE_KEY } from '@/constants';
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
    filters: {},
    search: '',
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
    useAppStore.getState().setSearch('mercado');
    useAppStore.getState().setPeriod('month');
    useAppStore.getState().showToast('hola');
    useAppStore.getState().patchFilters({ types: ['expense'] });

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
    useAppStore.getState().setSearch('algo');
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
