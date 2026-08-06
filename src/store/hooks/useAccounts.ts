import { useMemo } from 'react';
import type { Account, Bank, ID } from '@/models';
import {
  computeAllAccountBalances,
  computeTotalBalance,
} from '@/services/balance/computeAccountBalance';
import { activeOnly, indexById } from '@/utils/collections';
import { useAppStore } from '../index';

/**
 * Lectura de cuentas y sus saldos DERIVADOS.
 *
 * ⚠️ PATRÓN OBLIGATORIO EN TODOS LOS HOOKS DEL STORE: el selector devuelve
 * SIEMPRE una referencia estable del store (`state.accounts`), y la derivación
 * se hace en un `useMemo`.
 *
 * Si el selector construyera el valor —`useAppStore(s => s.accounts.filter(…))`—
 * devolvería un array nuevo en cada comprobación, Zustand 5 lo vería siempre
 * como "cambiado" y el componente entraría en un bucle de renders. Es el error
 * más habitual al usar Zustand y es difícil de diagnosticar porque se
 * manifiesta como lentitud, no como excepción.
 */

/** Cuentas no archivadas, que es lo que ve el usuario. */
export function useAccounts(): Account[] {
  const accounts = useAppStore((state) => state.accounts);
  return useMemo(() => activeOnly(accounts), [accounts]);
}

export function useAccount(id: ID | undefined): Account | undefined {
  const accounts = useAppStore((state) => state.accounts);
  return useMemo(() => accounts.find((a) => a.id === id), [accounts, id]);
}

/**
 * Saldo actual de cada cuenta, en una sola pasada sobre el libro.
 *
 * Se recalcula sólo cuando cambian las cuentas o los movimientos, no en cada
 * render.
 */
export function useAccountBalances(): Map<ID, number> {
  const accounts = useAppStore((state) => state.accounts);
  const transactions = useAppStore((state) => state.transactions);
  return useMemo(
    () => computeAllAccountBalances(accounts, transactions),
    [accounts, transactions],
  );
}

/**
 * "Saldo total" del Inicio.
 *
 * ⚠️ Es un STOCK. NUNCA debe rotularse "Ingresos" — esa confusión fue el bug
 * de v1 (`app.js:221`). Los ingresos del periodo son otra cosa y salen de
 * `services/metrics`. Ver ADR-003 y la nota 1 del checklist de regresión.
 */
export function useTotalBalance(): number {
  const accounts = useAppStore((state) => state.accounts);
  const transactions = useAppStore((state) => state.transactions);
  return useMemo(
    () => computeTotalBalance(activeOnly(accounts), transactions),
    [accounts, transactions],
  );
}

/** Bancos activos, y un índice para resolver `account.bankId` sin bucles. */
export function useBanks(): { banks: Bank[]; byId: Map<ID, Bank> } {
  const banks = useAppStore((state) => state.banks);
  return useMemo(() => ({ banks: activeOnly(banks), byId: indexById(banks) }), [banks]);
}
