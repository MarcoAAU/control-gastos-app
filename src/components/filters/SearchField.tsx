import { useId } from 'react';
import { Icon } from '@/components/ui';
import styles from './SearchField.module.css';

export interface SearchFieldProps {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  /** Se muestra bajo el campo mientras hay texto: "12 de 340". */
  resultHint?: string | undefined;
}

/**
 * Cuadro de búsqueda.
 *
 * ── NO USA `Field.module.css` ─────────────────────────────────────────────
 * Los demás campos son de FORMULARIO: rótulo encima, borde recto, se rellenan
 * para guardar algo. Este es una barra de búsqueda: sin rótulo, redondeada,
 * y lo que escribes no se guarda en ningún sitio. Compartir estilos los haría
 * parecer lo mismo y el usuario intentaría "guardar" la búsqueda.
 *
 * ── EL BOTÓN DE BORRAR ────────────────────────────────────────────────────
 * Sólo aparece con texto dentro. Es la salida rápida: sin él, deshacer una
 * búsqueda en un móvil significa mantener pulsado el retroceso, y quien no lo
 * consigue acaba creyendo que sus movimientos desaparecieron.
 *
 * ── `type="search"` A PROPÓSITO ───────────────────────────────────────────
 * En móvil cambia la tecla Intro por una lupa y activa el "buscar" del
 * teclado. La X nativa de WebKit se oculta por CSS: convive mal con la
 * nuestra y no se puede estilar.
 */
export function SearchField({ value, onChange, placeholder, resultHint }: SearchFieldProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.control}>
        <Icon name="search" size="md" className={styles.icon} />
        <input
          id={inputId}
          type="search"
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? 'Buscar…'}
          aria-label="Buscar movimientos"
          {...(resultHint ? { 'aria-describedby': hintId } : {})}
          autoComplete="off"
          // Los nombres propios y las descripciones de gastos no se benefician
          // del autocorrector: "Éxito" (el supermercado) acabaría como "Exito"
          // o peor. Y la mayúscula automática desvirtúa la búsqueda.
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        {value !== '' && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange('')}
            aria-label="Borrar la búsqueda"
          >
            <Icon name="close" size="sm" />
          </button>
        )}
      </div>

      {/* `aria-live` para que un lector de pantalla anuncie cuántos resultados
          quedan: sin esto, quien no ve la lista no percibe que la búsqueda
          hizo algo. */}
      {resultHint && (
        <span id={hintId} className={styles.hint} aria-live="polite">
          {resultHint}
        </span>
      )}
    </div>
  );
}
