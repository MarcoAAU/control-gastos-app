import type { ISOInstant } from './common';
import type { Account } from './Account';
import type { AppSettings } from './AppSettings';
import type { Bank } from './Bank';
import type { Category, Subcategory } from './Category';
import type { HistoryEntry } from './HistoryEntry';
import type { Transaction } from './Transaction';

/**
 * Versión del esquema persistido. Se incrementa cuando cambia la FORMA de los
 * datos, y cada incremento exige una migración con su test (ADR-009).
 *
 * 1 = v1 vanilla (implícita: el blob de v1 no llevaba versión)
 * 2 = este modelo
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Raíz de todo lo persistido. Un único documento: lo que devuelve
 * `AppDataRepository.load()` y lo que se escribe entero al guardar.
 *
 * Las colecciones son arrays planos y no mapas anidados. Motivo: se serializan
 * a JSON sin transformación, se recorren sin `Object.entries`, y las
 * relaciones se resuelven por id en `services/` — donde se pueden indexar y
 * memoizar una sola vez, en lugar de fijar una estructura de acceso en el
 * formato de almacenamiento.
 */
export interface AppData {
  schemaVersion: number;

  banks: Bank[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  history: HistoryEntry[];

  settings: AppSettings;

  meta: {
    createdAt: ISOInstant;
    updatedAt: ISOInstant;
    /**
     * De dónde salió este documento.
     *  · `'legacy'` — migrado del blob de v1.
     *  · `'demo'` — datos de EJEMPLO cargados a propósito por el usuario. Deja
     *    rastro de que las cifras son ficticias: sin esta marca, un usuario que
     *    cargó la demo y luego reporta "mis saldos están mal" sería
     *    indistinguible de un fallo real de cálculo.
     *  · `null` — datos propios del usuario desde el principio.
     */
    migratedFrom: 'legacy' | 'demo' | null;
    /**
     * Incidencias no fatales de la migración ("se descartó 1 movimiento con
     * importe inválido"). Se muestran al usuario una vez. Nunca se aborta una
     * migración entera por un registro malo: perder 400 movimientos buenos
     * por uno corrupto es peor que perder ese uno.
     */
    migrationWarnings: string[];
  };
}
