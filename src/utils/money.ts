import { AMOUNT_DECIMALS, CURRENCY_SYMBOL, LOCALE } from '@/constants';

/**
 * Formato de dinero. Portado literalmente de `app.js:39-66`.
 *
 * Se conserva byte a byte el comportamiento de v1 porque el usuario ya está
 * acostumbrado a ver sus cifras así, y porque un cambio de formato en una app
 * de dinero se lee como un error de cálculo aunque no lo sea.
 */

/**
 * `1250000` → `"$1.250.000"`, `-420000` → `"-$420.000"`.
 *
 * El signo va DELANTE del símbolo, como en v1. El peso colombiano no usa
 * céntimos en la práctica, de ahí el redondeo (`AMOUNT_DECIMALS = 0`).
 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL}0`;
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(
    AMOUNT_DECIMALS === 0 ? Math.round(value) : value,
  );
  return `${sign}${CURRENCY_SYMBOL}${absolute.toLocaleString(LOCALE, {
    minimumFractionDigits: AMOUNT_DECIMALS,
    maximumFractionDigits: AMOUNT_DECIMALS,
  })}`;
}

/**
 * Igual que `formatMoney` pero con signo explícito para movimientos:
 * `+$400.000` / `-$150.000`.
 */
export function formatSignedMoney(value: number, type: 'income' | 'expense'): string {
  return `${type === 'income' ? '+' : '-'}${formatMoney(Math.abs(value))}`;
}

/**
 * Formatea lo que el usuario está tecleando, conservando los separadores de
 * miles en vivo.
 *
 * ⚠️ REQUISITO EXPLÍCITO DEL USUARIO: *"cuando estoy ingresando los valores no
 * puedo ver los separadores de millares"*. Por eso el campo de importe es
 * `type="text"` y no `type="number"`: un input numérico no puede mostrar
 * "1.000.000" mientras se escribe. Portado de `attachThousandsInput`.
 *
 * Descarta todo lo que no sea dígito, así que da igual si el usuario pega
 * "$ 1.250.000" o "1250000".
 */
export function formatAmountInput(raw: string, allowNegative = false): string {
  const negative = allowNegative && raw.trim().startsWith('-');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return negative ? '-' : '';
  return (negative ? '-' : '') + Number.parseInt(digits, 10).toLocaleString(LOCALE);
}

/**
 * Lee el número de un campo formateado. `"1.250.000"` → `1250000`.
 *
 * Devuelve `null` y no `NaN` para que el llamador tenga que decidir qué hacer
 * con un campo vacío: `NaN` se propaga en silencio hasta acabar como "$NaN"
 * en pantalla.
 */
export function parseAmountInput(raw: string, allowNegative = false): number | null {
  const negative = allowNegative && raw.trim().startsWith('-');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/** Valor inicial de un campo de importe al editar. Portado de `setNumericInputValue`. */
export function toAmountInputValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString(LOCALE);
}
