import { PERIOD_LABELS, type Period } from '@/constants';
import { cn } from '@/utils/cn';
import styles from './PeriodTabs.module.css';

export interface PeriodTabsProps {
  value: Period;
  onChange: (period: Period) => void;
  /** Qué pestañas ofrecer. El Inicio da tres; Seguimiento, cuatro. */
  periods: readonly Period[];
}

/**
 * Pestañas de periodo (Hoy / Semana / Mes). Porta `.period-tabs` de v1.
 *
 * Es un `radiogroup` de verdad y no una fila de divs con una clase `.active`:
 * las flechas del teclado navegan entre opciones y un lector de pantalla
 * anuncia cuál está seleccionada. En v1 eran divs con `dataset.period` y no
 * existían para nadie que no usara el ratón o el dedo.
 */
export function PeriodTabs({ value, onChange, periods }: PeriodTabsProps) {
  return (
    <div className={styles.tabs} role="radiogroup" aria-label="Periodo">
      {periods.map((period) => {
        const active = period === value;
        return (
          <button
            key={period}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(styles.tab, active && styles.tabActive)}
            onClick={() => onChange(period)}
          >
            {PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
