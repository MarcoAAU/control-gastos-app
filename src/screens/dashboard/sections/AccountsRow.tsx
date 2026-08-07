import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import type { Account, ID } from '@/models';
import { Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import styles from './AccountsRow.module.css';

export interface AccountsRowProps {
  accounts: readonly Account[];
  /** Saldos DERIVADOS, calculados una vez por la pantalla. */
  balances: Map<ID, number>;
}

/**
 * Fila horizontal de cuentas con su saldo. Porta `#accountsRow` de v1.
 *
 * Es scroll horizontal y no una rejilla: con cinco cuentas, una rejilla en
 * 390px deja tarjetas de 120px donde no cabe "$1.250.000". El carrusel deja
 * cada cifra legible y sugiere que hay más deslizando.
 */
export function AccountsRow({ accounts, balances }: AccountsRowProps) {
  if (accounts.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Tus cuentas">
      <div className={styles.header}>
        <h2 className={styles.title}>Cuentas</h2>
        <Link to={ROUTES.accounts} className={styles.link}>
          Ver todas
          <Icon name="chevron-right" size="sm" />
        </Link>
      </div>

      <div className={styles.row}>
        {accounts.map((account) => (
          <Link
            key={account.id}
            to={ROUTES.accounts}
            className={styles.chip}
            style={{ borderColor: `${account.color}55` }}
          >
            <span className={styles.chipName}>
              <Icon name={account.icon} size="sm" />
              {account.name}
            </span>
            <span className={styles.chipBalance}>
              {formatMoney(balances.get(account.id) ?? account.initialBalance)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
