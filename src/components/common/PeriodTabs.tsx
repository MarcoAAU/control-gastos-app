import { useMemo } from 'react';
import { PERIOD_LABELS, type Period } from '@/constants';
import { SegmentedControl, type SegmentedOption } from '@/components/ui';
import styles from './PeriodTabs.module.css';

export interface PeriodTabsProps {
  value: Period;
  onChange: (period: Period) => void;
  /** Qué pestañas ofrecer. El Inicio da tres; Seguimiento, cuatro. */
  periods: readonly Period[];
}

/**
 * Pestañas de periodo (Hoy / Semana / Mes / Año).
 *
 * Ya no dibuja nada: traduce periodos a opciones y deja el control a
 * `SegmentedControl`. La diferencia se nota en el teclado — la versión propia
 * anunciaba ser un `radiogroup` pero no se recorría con las flechas, porque
 * los roles ARIA describen el widget y no lo implementan. Ese comportamiento
 * ahora está escrito una sola vez y lo comparte con el selector de tema.
 */
export function PeriodTabs({ value, onChange, periods }: PeriodTabsProps) {
  const options = useMemo<SegmentedOption<Period>[]>(
    () => periods.map((period) => ({ value: period, label: PERIOD_LABELS[period] })),
    [periods],
  );

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      label="Periodo"
      className={styles.tabs}
    />
  );
}
