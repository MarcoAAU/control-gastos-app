import type { Bank } from '@/models';
import { SYSTEM_BANK_NONE } from './systemIds';

export type BankSeed = Omit<Bank, 'createdAt' | 'archivedAt'>;

/**
 * Bancos que trae la app.
 *
 * Los ids se copian literalmente de `DEMO_BANKS` (`app.js:25-30`) porque las
 * cuentas de v1 los referencian (`bankId: "bancolombia"`).
 *
 * NOTA SOBRE EL NOMBRE "DEMO": en v1 se llamaban así porque la conexión
 * bancaria es simulada. Siguen siéndolo — la app NUNCA pide ni almacena
 * credenciales bancarias reales, y el aviso de Ajustes lo dice explícitamente.
 * Aquí son sólo etiquetas para clasificar cuentas que el usuario lleva a mano.
 */
export const SEED_BANKS: readonly BankSeed[] = [
  { id: 'bancolombia', name: 'Bancolombia', color: '#ffd166', icon: 'bank', isBuiltIn: true },
  { id: 'davivienda', name: 'Davivienda', color: '#ff6b7a', icon: 'bank', isBuiltIn: true },
  { id: 'bbva', name: 'BBVA', color: '#6c8dff', icon: 'bank-office', isBuiltIn: true },
  { id: 'nu', name: 'Nu', color: '#c084fc', icon: 'bank-nu', isBuiltIn: true },
  {
    id: SYSTEM_BANK_NONE,
    name: 'Sin banco',
    color: '#93a2c6',
    icon: 'wallet',
    isBuiltIn: true,
  },
];

/**
 * Valor que v1 guardaba en `bankId` cuando la cuenta no era de un banco de la
 * lista (efectivo, "otro banco"). La migración lo traduce a
 * `SYSTEM_BANK_NONE`, o a un banco nuevo creado a partir de `bankName`.
 */
export const LEGACY_MANUAL_BANK_ID = 'manual';
