import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import styles from './ChartCard.module.css';

export interface ChartCardProps {
  title: string;
  /** Cifra o rótulo a la derecha del título (p. ej. el total del periodo). */
  aside?: ReactNode;
  /** Mensaje cuando no hay datos. Si se pasa, sustituye a la gráfica. */
  emptyMessage?: string | undefined;
  children: ReactNode;
}

/**
 * Marco común de las gráficas: título, cifra auxiliar y estado vacío.
 *
 * Existe para que el estado vacío se resuelva UNA vez. En v1 cada gráfica lo
 * dibujaba por su cuenta escribiendo texto dentro del propio canvas
 * (`app.js:365`), lo que además dejaba el mensaje invisible para un lector de
 * pantalla: un canvas es un mapa de bits, no texto.
 */
export function ChartCard({ title, aside, emptyMessage, children }: ChartCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>

      {emptyMessage ? <p className={styles.empty}>{emptyMessage}</p> : children}
    </Card>
  );
}
