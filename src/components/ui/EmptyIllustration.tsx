import type { ReactElement } from 'react';
import styles from './EmptyIllustration.module.css';

export type IllustrationKey = 'movements' | 'accounts' | 'search' | 'history';

export interface EmptyIllustrationProps {
  name: IllustrationKey;
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Ilustraciones de estado vacío.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── POR QUÉ SVG ESCRITO A MANO Y NO ARCHIVOS NI UNA LIBRERÍA ──────────────
 * Un PNG por ilustración serían cuatro peticiones más y, sobre todo, cuatro
 * imágenes con un color de fondo cocido dentro: al cambiar a tema claro
 * quedarían como recortes oscuros pegados sobre blanco. Escritas en línea,
 * los rellenos son los MISMOS tokens que el resto de la app, así que siguen al
 * tema sin que exista una segunda versión de cada dibujo.
 *
 * Pesan ~1,2 kB en total, menos que un solo PNG.
 *
 * ── POR QUÉ SÓLO CUATRO ───────────────────────────────────────────────────
 * Se ilustran los vacíos que ocupan una pantalla entera —cuentas,
 * movimientos, búsqueda sin resultados, historial—, que es donde el hueco se
 * nota y donde el usuario nuevo decide si la app está rota o simplemente
 * vacía. Los vacíos pequeños dentro de una tarjeta siguen con su icono: una
 * ilustración de 96 px dentro de una tarjeta de 120 px es ruido.
 *
 * `aria-hidden`: son decorativas. Lo que se anuncia es el título de al lado;
 * un lector de pantalla que además describiera el dibujo diría dos veces lo
 * mismo.
 */
export function EmptyIllustration({ name }: EmptyIllustrationProps) {
  return (
    <svg
      className={styles.root}
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Halo común: da peso al dibujo y evita que floten cuatro trazos
          sueltos en medio de la pantalla. */}
      <ellipse cx="60" cy="84" rx="42" ry="7" className={styles.shadow} />
      {SHAPES[name]}
    </svg>
  );
}

const SHAPES: Record<IllustrationKey, ReactElement> = {
  /** Dos recibos apilados con sus renglones. */
  movements: (
    <>
      <rect x="26" y="14" width="58" height="62" rx="8" className={styles.back} />
      <rect x="36" y="22" width="58" height="62" rx="8" className={styles.front} />
      <rect x="46" y="34" width="30" height="5" rx="2.5" className={styles.line} />
      <rect x="46" y="46" width="38" height="5" rx="2.5" className={styles.line} />
      <rect x="46" y="58" width="22" height="5" rx="2.5" className={styles.accentLine} />
    </>
  ),

  /** Una cartera con una tarjeta asomando. */
  accounts: (
    <>
      <rect x="30" y="30" width="60" height="20" rx="6" className={styles.accent} />
      <rect x="22" y="38" width="76" height="40" rx="10" className={styles.front} />
      <rect x="70" y="52" width="20" height="12" rx="6" className={styles.accent} />
      <circle cx="80" cy="58" r="3" className={styles.dot} />
    </>
  ),

  /** Una lupa sobre una lista: nada coincide. */
  search: (
    <>
      <rect x="24" y="18" width="52" height="58" rx="8" className={styles.front} />
      <rect x="34" y="30" width="26" height="5" rx="2.5" className={styles.line} />
      <rect x="34" y="42" width="18" height="5" rx="2.5" className={styles.line} />
      <circle cx="76" cy="52" r="18" className={styles.lens} />
      <rect
        x="86"
        y="64"
        width="18"
        height="7"
        rx="3.5"
        transform="rotate(42 86 64)"
        className={styles.accent}
      />
    </>
  ),

  /** Una caja de archivo con la tapa puesta. */
  history: (
    <>
      <rect x="24" y="26" width="72" height="16" rx="5" className={styles.accent} />
      <rect x="30" y="42" width="60" height="36" rx="7" className={styles.front} />
      <rect x="50" y="54" width="20" height="5" rx="2.5" className={styles.line} />
    </>
  ),
};
