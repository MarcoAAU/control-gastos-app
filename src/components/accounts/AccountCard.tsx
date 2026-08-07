import { ACCOUNT_TYPE_META } from '@/constants';
import type { Account, Bank } from '@/models';
import { Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountCard.module.css';

export interface AccountCardProps {
  account: Account;
  /** Saldo DERIVADO del libro. La cuenta no guarda ninguno (ADR-003). */
  balance: number;
  bank: Bank | undefined;
  onPress: (account: Account) => void;
}

/**
 * Una cuenta con su saldo. Porta `.account-card` de v1.
 *
 * ── EL SALDO LLEGA POR PROPS, Y ESO ES EL PUNTO ───────────────────────────
 * Este componente no sabe calcular un saldo ni tiene de dónde sacarlo: se lo
 * dan ya derivado del libro de movimientos. En v1 pintaba `acc.balance`, un
 * campo que había que acordarse de actualizar en cada alta, edición y borrado
 * de movimiento — y ahí es donde se descuadraba.
 *
 * ── DIFERENCIA CON v1: LAS ACCIONES ───────────────────────────────────────
 * v1 ponía en cada tarjeta un enlace "Ajustar saldo" y una ✕ de borrar, ambos
 * pequeños y a 8px de distancia. Con el pulgar, la ✕ se pulsa sin querer.
 * Aquí la tarjeta entera es el objetivo y las acciones viven en una hoja, el
 * mismo patrón que ya usan los movimientos (Fase 7).
 */
export function AccountCard({ account, balance, bank, onPress }: AccountCardProps) {
  const meta = ACCOUNT_TYPE_META[account.type];

  // Una tarjeta de crédito en -420.000 no está en números rojos: es la deuda
  // que se espera que tenga. Pintarla de rojo alarmaría sin motivo.
  const alarming = balance < 0 && !meta.negativeIsExpected;

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onPress(account)}
      aria-label={`${account.name}, saldo ${formatMoney(balance)}`}
    >
      <span
        className={styles.icon}
        // El color lo elige el usuario: es un dato, no un token del tema.
        style={{ background: `${account.color}22`, color: account.color }}
      >
        <Icon name={account.icon} size="md" />
      </span>

      <span className={styles.info}>
        <span className={styles.name}>{account.name}</span>
        <span className={styles.meta}>
          {bank?.name ?? 'Sin banco'} · {meta.label}
        </span>
      </span>

      <span className={styles.balanceWrap}>
        <span className={cn(styles.balance, alarming && styles.balanceNegative)}>
          {formatMoney(balance)}
        </span>
        {!account.includeInTotals && (
          // Sin esto, el usuario sumaría las tarjetas a mano y no le cuadraría
          // con el "Saldo total" de arriba.
          <span className={styles.excluded}>Fuera del total</span>
        )}
      </span>

      <Icon name="chevron-right" size="sm" className={styles.chevron} />
    </button>
  );
}
