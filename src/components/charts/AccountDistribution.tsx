import type { AccountDistribution as Distribution } from '@/services/balance/accountDistribution';
import { Icon } from '@/components/ui';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './AccountDistribution.module.css';

export interface AccountDistributionProps {
  distribution: Distribution;
}

/**
 * Dónde está el dinero: una barra por cuenta.
 *
 * ── POR QUÉ NO ES UNA TARTA, Y POR QUÉ NO USA RECHARTS ────────────────────
 * Dos razones, y ninguna es estética.
 *
 * 1. **Una tarta no puede representar deudas.** Con +3.400.000 en ahorros y
 *    −420.000 en la tarjeta, la porción de la tarjeta sería negativa: las
 *    porciones sumarían más del 100% y el dibujo sería sencillamente falso.
 *    Con barras, la deuda se pinta hacia el otro lado y en rojo. Se ve, se
 *    lee, y no finge ser una fracción de un dinero que no existe.
 *
 * 2. **Ya hay una dona en esta pantalla** (gastos por categoría). Dos donas
 *    seguidas se confunden entre sí de un vistazo, y la segunda respondería a
 *    una pregunta distinta —stock, no flujo— con la misma forma.
 *
 * Al ser barras proporcionales, sale más barato y más accesible en HTML+CSS
 * que en SVG: cada fila es texto real con su importe, navegable y legible por
 * un lector de pantalla, y no añade ni un byte a la librería de gráficos.
 */
export function AccountDistribution({ distribution }: AccountDistributionProps) {
  const { entries, totalPositive, totalDebt } = distribution;

  // La barra se escala contra el saldo más grande en valor absoluto, para que
  // una deuda pequeña no se dibuje del mismo tamaño que un ahorro grande.
  const scale = entries.reduce((max, entry) => Math.max(max, Math.abs(entry.balance)), 0);

  return (
    <div>
      <ul className={styles.list}>
        {entries.map((entry) => {
          const width = scale > 0 ? (Math.abs(entry.balance) / scale) * 100 : 0;
          return (
            <li key={entry.accountId} className={styles.row}>
              <div className={styles.head}>
                <Icon name={entry.icon} size="sm" className={styles.icon} />
                <span className={styles.name}>{entry.name}</span>
                <span className={cn(styles.amount, entry.isDebt && styles.debt)}>
                  {formatMoney(entry.balance)}
                </span>
              </div>

              <div className={styles.track}>
                <div
                  className={cn(styles.bar, entry.isDebt && styles.barDebt)}
                  // El color de la cuenta lo elige el usuario: es un dato.
                  style={{
                    width: `${width}%`,
                    ...(entry.isDebt ? {} : { background: entry.color }),
                  }}
                />
              </div>

              {/* El porcentaje sólo se muestra cuando significa algo. En una
                  deuda no hay "parte del total" que enseñar. */}
              <span className={styles.share}>
                {entry.isDebt ? 'Deuda' : `${Math.round(entry.share)}% de lo disponible`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <span>
          Disponible <strong>{formatMoney(totalPositive)}</strong>
        </span>
        {totalDebt > 0 && (
          <span className={styles.debt}>
            Deuda <strong>{formatMoney(totalDebt)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
