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

    /**
     * ── EL AVISO QUE CIERRA EL CÍRCULO DE TODA LA REESCRITURA ─────────────
     * `migratedNow` sólo es `true` en el arranque en que la conversión v1 → v2
     * ocurre de verdad. A partir del siguiente, `gastos_app_data_v2` ya existe
     * y no se migra nada, así que esto se muestra EXACTAMENTE UNA VEZ sin
     * necesidad de guardar ninguna marca de "ya lo vio".
     *
     * ⚠️ No es un detalle de cortesía. Al actualizar, la cifra rotulada
     * "Ingresos" en el Inicio **cambia de valor**, porque en v1 mostraba por
     * error el saldo total de las cuentas (`app.js:221`) y ahora muestra lo
     * que realmente entró en el periodo. Sin este aviso, el usuario abre la app
     * y ve un número distinto del que recordaba, en una app de finanzas, sin
     * ninguna explicación: indistinguible de que la actualización le rompió
     * los datos. Es justo la confusión que originó la reescritura, reaparecida
     * en el peor momento.
     *
     * Va PRIMERO en la lista: los otros avisos son incidencias de registros
     * sueltos; éste explica por qué la pantalla entera se ve distinta.
     */
    if (result.migratedNow) {
      warnings.push(
        'Tus saldos NO han cambiado: son exactamente los mismos que veías antes.',
        'La cifra de «Ingresos» del Inicio sí cambia. Antes mostraba, por error, el saldo total de tus cuentas; ahora muestra lo que de verdad entró durante el periodo.',
        'Tus datos anteriores siguen guardados intactos. Aun así, descarga un respaldo desde Ajustes.',
      );
    }

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
