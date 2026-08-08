import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Qué se está eligiendo. Lo anuncia el lector de pantalla al entrar. */
  label: string;
  className?: string | undefined;
}

/** Cuánto avanzar por tecla. Arriba/abajo también, porque el grupo se lee
 *  como una lista y no todo el mundo asume que es horizontal. */
const STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Grupo de opciones excluyentes en una píldora (Hoy/Semana/Mes, tema…).
 *
 * ── POR QUÉ ES UN PRIMITIVO Y NO SE COPIA ─────────────────────────────────
 * Nació como `PeriodTabs`. Al añadir el selector de tema en Ajustes había dos
 * controles idénticos, y con dos copias el teclado sólo funciona bien en la
 * que alguien se acuerde de arreglar. Se extrajo entonces, no antes (ADR-011:
 * un componente compartido se crea cuando aparece el segundo uso real).
 *
 * ── EL TECLADO NO ES GRATIS CON ARIA ──────────────────────────────────────
 * Poner `role="radio"` en un `<button>` le dice al lector de pantalla que es
 * una opción, pero NO le da el comportamiento: sin esto, Tab pasaría por las
 * tres opciones una a una y las flechas no harían nada. Un `radiogroup` de
 * verdad se recorre con flechas y ocupa UNA parada de Tab. Eso son dos cosas
 * concretas:
 *
 *  1. `tabIndex` móvil: sólo la opción marcada vale 0; las demás, −1. Así Tab
 *     entra al grupo y sale, en vez de recorrerlo.
 *  2. Las flechas mueven selección Y foco a la vez, con vuelta al principio.
 *     Es lo que hace un grupo de radios nativo, y aquí importa más porque el
 *     control ya no parece un radio.
 *
 * `Home`/`End` van al primero y al último: con cuatro periodos, ir de "Hoy" a
 * "Año" son tres pulsaciones o una.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const selected = options.findIndex((option) => option.value === value);
  // Si el valor no está entre las opciones, la primera queda alcanzable con
  // Tab. Sin esto el grupo entero se saldría del recorrido del teclado: nadie
  // podría llegar a él, ni siquiera para arreglar el valor inválido.
  const tabbable = selected === -1 ? 0 : selected;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = STEP[event.key];
    const isEdgeKey = event.key === 'Home' || event.key === 'End';
    if (step === undefined && !isEdgeKey) return;

    // Se parte de la opción ENFOCADA, no de la marcada. Normalmente son la
    // misma —la selección sigue al foco—, pero si alguna vez dejan de serlo
    // (un foco puesto por código, un valor que no está entre las opciones),
    // partir de la marcada haría que la flecha saltara a un sitio que no está
    // al lado de lo que el usuario tiene delante.
    const focused = [...(groupRef.current?.querySelectorAll('button') ?? [])].indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const current = focused !== -1 ? focused : selected === -1 ? 0 : selected;

    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (current + step! + options.length) % options.length;

    const target = options[next];
    if (!target) return;

    // Se impide el desplazamiento de la página: las flechas ya significan algo
    // dentro del grupo, y que además haga scroll el fondo desorienta.
    event.preventDefault();
    // El foco se mueve SIEMPRE, aunque la opción ya estuviera marcada: si no,
    // una flecha que cae sobre la opción actual no haría nada y el recorrido
    // se quedaría atascado ahí.
    groupRef.current?.querySelectorAll('button')[next]?.focus();
    if (target.value !== value) onChange(target.value);
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={cn(styles.group, className)}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === tabbable ? 0 : -1}
            className={cn(styles.option, active && styles.optionActive)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
