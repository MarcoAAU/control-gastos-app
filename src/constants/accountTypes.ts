import type { AccountType, IconRef } from '@/models';

/**
 * Etiquetas y metadatos de los tipos de cuenta.
 *
 * ⚠️ Las CADENAS de la izquierda de `legacyLabel` son las que v1 guardaba tal
 * cual en `account.type` (texto libre del `<select>` de index.html:195-199).
 * La migración las traduce a la unión cerrada. Cambiarlas rompería esa
 * traducción para los datos ya guardados.
 */
interface AccountTypeMeta {
  label: string;
  icon: IconRef;
  /** Texto exacto que usaba v1, o `null` si el tipo es nuevo. */
  legacyLabel: string | null;
  /**
   * Si un saldo negativo es lo NORMAL para este tipo. Una tarjeta de crédito
   * con -420.000 no está en números rojos: es deuda esperada. La UI lo usa
   * para no alarmar con rojo donde no toca.
   */
  negativeIsExpected: boolean;
}

export const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  savings: {
    label: 'Cuenta de ahorros',
    icon: 'savings',
    legacyLabel: 'Cuenta de ahorros',
    negativeIsExpected: false,
  },
  checking: {
    label: 'Cuenta corriente',
    icon: 'bank',
    legacyLabel: 'Cuenta corriente',
    negativeIsExpected: false,
  },
  credit: {
    label: 'Tarjeta de crédito',
    icon: 'card',
    legacyLabel: 'Tarjeta de crédito',
    negativeIsExpected: true,
  },
  cash: {
    label: 'Efectivo',
    icon: 'cash',
    legacyLabel: 'Efectivo',
    negativeIsExpected: false,
  },
  other: {
    label: 'Otro',
    icon: 'wallet',
    legacyLabel: 'Otro',
    negativeIsExpected: false,
  },
};

/** Tipo de una cuenta nueva si el usuario no elige. */
export const DEFAULT_ACCOUNT_TYPE: AccountType = 'savings';
