import { AppDataRepository } from '@/storage/AppDataRepository';
import { createLocalStorageAdapter } from '@/storage/adapters/localStorageAdapter';
import { useAppStore } from './index';
import { startPersistence, type PersistenceHandle } from './persistence';

/**
 * Arranque de la aplicación: leer → migrar → hidratar → empezar a persistir.
 *
 * ORDEN OBLIGATORIO. `startPersistence()` va DESPUÉS de hidratar; al revés, la
 * propia hidratación se vería como un cambio y volvería a escribir en disco lo
 * que se acaba de leer — inofensivo en el caso normal, catastrófico si la
 * lectura fue parcial.
 */

export interface Bootstrap {
  persistence: PersistenceHandle;
  repository: AppDataRepository;
}

export async function bootstrapApp(): Promise<Bootstrap> {
  const repository = new AppDataRepository(createLocalStorageAdapter());
  const store = useAppStore.getState();

  const warnings: string[] = [];

  try {
    const result = await repository.load();

    // Una sola escritura de estado: la app pasa de "cargando" a "lista" en un
    // único render, sin estados intermedios visibles.
    useAppStore.setState({
      schemaVersion: result.data.schemaVersion,
      banks: result.data.banks,
      accounts: result.data.accounts,
      categories: result.data.categories,
      subcategories: result.data.subcategories,
      transactions: result.data.transactions,
      history: result.data.history,
      settings: result.data.settings,
      meta: result.data.meta,
      status: 'ready',
    });

    warnings.push(...result.warnings);

    if (!repository.isPersistent) {
      warnings.push(
        'Tu navegador no permite guardar datos (¿modo privado?). Podrás usar la app, pero los cambios se perderán al cerrarla.',
      );
    }
  } catch {
    // Llegar aquí significa un fallo inesperado, no un dato corrupto (de eso
    // se ocupa el repositorio). La app arranca vacía y lo dice; nada se borra.
    useAppStore.setState({ status: 'error' });
    warnings.push(
      'No se pudieron cargar tus datos. No se ha borrado nada: cierra y vuelve a abrir la app.',
    );
  }

  if (warnings.length > 0) store.setStartupWarnings(warnings);

  const persistence = startPersistence(repository);
  return { persistence, repository };
}
