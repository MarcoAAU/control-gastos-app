import type { AppDataRepository } from '@/storage/AppDataRepository';
import { StorageError } from '@/storage/StorageAdapter';
import { debounce } from '@/utils/debounce';
import { useAppStore } from './index';
import { selectPersisted, type AppState, type PersistedState } from './types';

/**
 * ⚠️ EL ÚNICO SITIO DE TODA LA APP QUE ESCRIBE EN DISCO.
 *
 * Un solo `store.subscribe()` observa el estado y guarda. Ningún slice llama a
 * `save()` (ESLint lo impide), ninguna pantalla lo hace tampoco. Eso satisface
 * literalmente el requisito de *"todo cambio de información debe pasar por una
 * única capa"* y hace que "¿quién guardó esto?" tenga siempre una respuesta.
 *
 * En v1 `saveState()` se llamaba desde catorce sitios distintos y un fallo de
 * escritura pasaba desapercibido.
 */

/** Tiempo de reposo antes de escribir. */
const DEBOUNCE_MS = 300;

/**
 * ¿Cambió algo de lo que se guarda?
 *
 * Comparación superficial por REFERENCIA, no profunda. Es correcta y barata
 * porque las acciones son inmutables: si un array cambió, su referencia cambió;
 * si no cambió, `updateById`/`mapItems` devuelven el original a propósito.
 * Una comparación profunda de miles de movimientos en cada tecla sería mucho
 * más cara que la escritura que intenta evitar.
 */
function hasChanged(a: PersistedState, b: PersistedState): boolean {
  return (
    a.banks !== b.banks ||
    a.accounts !== b.accounts ||
    a.categories !== b.categories ||
    a.subcategories !== b.subcategories ||
    a.transactions !== b.transactions ||
    a.history !== b.history ||
    a.settings !== b.settings ||
    a.meta !== b.meta ||
    a.schemaVersion !== b.schemaVersion
  );
}

export interface PersistenceHandle {
  /** Fuerza una escritura inmediata (al cerrar la app, antes de exportar). */
  flush(): Promise<void>;
  /** Cancela la suscripción. Sólo lo usan los tests. */
  stop(): void;
}

export function startPersistence(repository: AppDataRepository): PersistenceHandle {
  let lastSaved: PersistedState = selectPersisted(useAppStore.getState());
  let pending: PersistedState | null = null;

  async function write(snapshot: PersistedState): Promise<void> {
    try {
      const { nearLimit } = await repository.save({
        ...snapshot,
        meta: { ...snapshot.meta, updatedAt: new Date().toISOString() },
      });
      lastSaved = snapshot;
      pending = null;

      const { setPersistenceError, showToast, persistenceError } = useAppStore.getState();
      if (persistenceError !== null) setPersistenceError(null);
      if (nearLimit) {
        showToast('El almacenamiento está casi lleno. Exporta una copia de seguridad.', 'error');
      }
    } catch (error) {
      // Nunca se relanza: un fallo al guardar no debe tumbar la interfaz. Se
      // deja constancia en el estado para que la UI pueda avisar — que es
      // justo lo que faltaba en v1.
      const message =
        error instanceof StorageError
          ? error.message
          : 'No se pudieron guardar los cambios. Exporta una copia de seguridad.';
      useAppStore.getState().setPersistenceError(message);
    }
  }

  const scheduleWrite = debounce((snapshot: PersistedState) => {
    void write(snapshot);
  }, DEBOUNCE_MS);

  const unsubscribe = useAppStore.subscribe((state: AppState) => {
    const snapshot = selectPersisted(state);
    // Sin este corte, cambiar de pestaña o escribir en el buscador —cosas de
    // `uiSlice`, que no se persiste— provocaría una escritura.
    if (!hasChanged(snapshot, lastSaved)) return;
    pending = snapshot;
    scheduleWrite(snapshot);
  });

  return {
    async flush() {
      scheduleWrite.cancel();
      if (pending !== null) await write(pending);
    },
    stop() {
      scheduleWrite.cancel();
      unsubscribe();
    },
  };
}
