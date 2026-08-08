import type { AppDataRepository } from '@/storage/AppDataRepository';
import type { PersistenceHandle } from './persistence';
import { useAppStore } from './index';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Releer los datos del disco y rehidratar el estado.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── QUÉ SIGNIFICA "REFRESCAR" EN UNA APP SIN SERVIDOR ─────────────────────
 * No hay nada que descargar: la fuente de datos es el `localStorage` de este
 * dispositivo. Refrescar es volver a leerlo y recalcular todo lo derivado
 * —saldos, indicadores, gráficas, agrupaciones—. Sirve de verdad en dos casos:
 * cuando otra pestaña del navegador modificó los datos, y cuando algo dejó al
 * estado en memoria desincronizado de lo guardado.
 *
 * ── ⚠️ EL ORDEN NO ES NEGOCIABLE: VACIAR ANTES DE LEER ────────────────────
 * La escritura va con 300 ms de rebote. Si el usuario anota un gasto y toca
 * refrescar antes de que ese rebote venza, releer el disco traería el estado
 * ANTERIOR y **el movimiento recién escrito desaparecería de la pantalla y del
 * disco**. Un botón de refrescar que borra el último apunte es mucho peor que
 * no tener botón. Por eso `flush()` va primero, siempre.
 *
 * ── POR QUÉ NO ES `location.reload()` ─────────────────────────────────────
 * El botón anterior del Inicio borraba TODAS las cachés y recargaba la página
 * entera. Eso servía para forzar una versión nueva de la app, no para
 * refrescar datos: tarda, saca al usuario de la pantalla en la que estaba y,
 * sin conexión, deja la app sin sus archivos precacheados. Releer del
 * repositorio es instantáneo y no mueve al usuario de sitio.
 *
 * ── POR QUÉ VIVE AQUÍ Y NO EN UN COMPONENTE ───────────────────────────────
 * El repositorio y el manejador de persistencia se crean en `bootstrapApp()`.
 * Las pantallas no pueden importar `storage/**` (regla de ESLint, ADR-008), y
 * con razón. El arranque deposita aquí las dos referencias y la interfaz llama
 * a `refreshFromStorage()` sin saber que existe un repositorio.
 */

interface Wiring {
  repository: AppDataRepository;
  persistence: PersistenceHandle;
}

let wiring: Wiring | null = null;

/** Lo llama `bootstrapApp()` una sola vez, al arrancar. */
export function registerRefresh(next: Wiring): void {
  wiring = next;
}

export type RefreshOutcome = 'ok' | 'unavailable' | 'error';

export async function refreshFromStorage(): Promise<RefreshOutcome> {
  if (wiring === null) return 'unavailable';

  try {
    // 1. Lo pendiente se escribe. Ver la nota de arriba: sin esto, refrescar
    //    puede borrar el último movimiento anotado.
    await wiring.persistence.flush();

    // 2. Ahora sí, el disco es la verdad.
    const result = await wiring.repository.load();

    // 3. Una sola escritura de estado, igual que en el arranque: la pantalla
    //    se repinta una vez y no pasa por estados intermedios.
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
    });

    // Los avisos que traiga la lectura (por ejemplo, catálogo repuesto) se
    // muestran igual que en el arranque.
    if (result.warnings.length > 0) {
      useAppStore.getState().setStartupWarnings(result.warnings);
    }

    return 'ok';
  } catch {
    // No se relanza: un refresco fallido no debe tumbar la interfaz, y sobre
    // todo NO se toca el estado —lo que hay en pantalla sigue siendo válido—.
    return 'error';
  }
}
