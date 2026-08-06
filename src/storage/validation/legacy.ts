import { asArray, isRecord } from './coerce';

/**
 * Forma del blob de v1 (`gastos_app_data_v1`).
 *
 * Todo es opcional y de tipo laxo A PROPÓSITO: es el reflejo honesto de lo que
 * puede haber ahí. v1 no validaba nada, así que un movimiento puede no tener
 * `type`, un importe puede ser texto y una cuenta puede apuntar a un banco
 * inexistente. Declararlo `LegacyTransaction { type: 'income' | 'expense' }`
 * sería mentirle al compilador sobre datos que no controlamos.
 *
 * Forma real observada en `app.js`:
 *   account: { id, bankId, bankName, type, nickname, balance, emoji }
 *   tx:      { id, date, amount, desc, categoryId, accountId, source, type }
 *   history: { id, name, startDate, endDate, savedAt, income?, expense?,
 *              balance?, transactions[] }
 */
export interface LegacyBlob {
  accounts?: unknown;
  transactions?: unknown;
  history?: unknown;
}

/**
 * ¿Esto parece el blob de v1?
 *
 * Criterio deliberadamente laxo: basta con ser un objeto que tenga al menos
 * una de las tres colecciones. Si fuésemos estrictos, un usuario con datos
 * parcialmente corruptos vería su app "vacía" en lugar de recuperar lo que sí
 * se puede recuperar.
 */
export function looksLikeLegacyBlob(value: unknown): value is LegacyBlob {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value['accounts']) ||
    Array.isArray(value['transactions']) ||
    Array.isArray(value['history'])
  );
}

/** Registros del blob, ya normalizados a arrays de objetos. */
export function readLegacyCollections(blob: LegacyBlob): {
  accounts: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  history: Record<string, unknown>[];
} {
  const pick = (value: unknown) => asArray(value).filter(isRecord);
  return {
    accounts: pick(blob.accounts),
    transactions: pick(blob.transactions),
    history: pick(blob.history),
  };
}
