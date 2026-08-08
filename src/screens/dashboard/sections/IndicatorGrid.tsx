import type { Transaction } from '@/models';
import type { CategorySlice } from '@/services/metrics/categoryBreakdown';
import type { FlowTotals } from '@/services/metrics/periodTotals';
import { useId } from 'react';
import { Card, Icon } from '@/components/ui';
import { useAppStore } from '@/store';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import styles from './IndicatorGrid.module.css';

export interface IndicatorGridProps {
  totals: FlowTotals;
  /** Gasto medio por día transcurrido. `null` = todavía no se puede decir. */
  averageDaily: number | null;
  topCategory: CategorySlice | null;
  largestExpense: Transaction | null;
  /** Porcentaje de lo ingresado que no se gastó. `null` = sin ingresos. */
  savingsRate: number | null;
  /** El periodo dicho dentro de una frase: "hoy", "esta semana". */
  periodPhrase: string;
}

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Las cinco tarjetas indicadoras del Inicio.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── LAS CINCO SON FLUJO. NINGUNA ES UN SALDO ──────────────────────────────
 * Es la regla que gobierna esta sección entera. El saldo total vive arriba, en
 * `FinancialSummary`, solo y rotulado como lo que es. Aquí abajo todo responde
 * a "qué pasó durante el periodo", y por eso todas las cifras cambian al
 * cambiar de pestaña — mientras que el saldo no. Meter un stock en esta
 * rejilla reproduciría el error de v1 en pequeño: una cifra que baja con cada
 * gasto bajo un rótulo que no habla de gastos (ADR-003).
 *
 * ── NADA SE CALCULA AQUÍ ──────────────────────────────────────────────────
 * Las cinco cifras llegan calculadas desde `services/metrics`. Este componente
 * decide únicamente cómo se ven, incluido el caso de "no se puede decir".
 *
 * ── `null` NO ES CERO ─────────────────────────────────────────────────────
 * Un promedio sin días transcurridos y una tasa de ahorro sin ingresos no
 * valen 0: no se pueden calcular. Se pintan «—». Escribir "0%" ahí sería
 * afirmar algo falso —"no ahorraste nada"— cuando lo cierto es que no entró
 * dinero que ahorrar.
 */
export function IndicatorGrid({
  totals,
  averageDaily,
  topCategory,
  largestExpense,
  savingsRate,
  periodPhrase,
}: IndicatorGridProps) {
  /**
   * La preferencia vive en `settings`, o sea en el documento persistido: al
   * cerrar y reabrir la app, los indicadores siguen como se dejaron.
   *
   * NO va en `uiSlice`, que es donde vive el resto del estado de interfaz,
   * porque `uiSlice` se excluye de lo que se guarda a propósito (ADR-002). Esa
   * exclusión es correcta para un filtro a medio poner —reabrir con un filtro
   * invisible se lee como "perdí mis movimientos"— pero no para esto: plegar
   * una sección es una decisión duradera, y volver a plegarla en cada arranque
   * sería el mismo tipo de olvido que molesta.
   *
   * `?? true` porque en cualquier instalación anterior a esta preferencia el
   * campo llega como `undefined`.
   */
  const visible = useAppStore((state) => state.settings.showTodayIndicators ?? true);
  const setVisible = useAppStore((state) => state.setShowTodayIndicators);

  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      {/*
        Es un `<button>` de verdad envolviendo al encabezado, no un `<div>` con
        onClick: así funciona con teclado y con lector de pantalla sin escribir
        nada más. El `<h2>` sigue dentro para que el índice de encabezados de la
        página no cambie.
      */}
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={visible}
        aria-controls={`${titleId}-panel`}
        onClick={() => setVisible(!visible)}
      >
        <h2 id={titleId} className={styles.heading}>
          Indicadores de {periodPhrase}
        </h2>
        <Icon
          name="chevron-down"
          size="sm"
          className={cn(styles.chevron, !visible && styles.chevronCollapsed)}
        />
      </button>

      {/*
        El panel NO se desmonta al plegarse: se colapsa a altura cero. Los datos
        siguen ahí —el usuario pidió ocultarlos, no borrarlos— y así la
        transición puede animarse en los dos sentidos. Con un desmontaje, al
        desplegar el contenido aparecería de golpe.

        `inert` y `aria-hidden` lo sacan del recorrido del teclado y del lector
        de pantalla mientras está plegado: si no, Tab se pararía en cinco
        tarjetas invisibles.
      */}
      <div
        id={`${titleId}-panel`}
        className={cn(styles.panel, !visible && styles.panelCollapsed)}
        aria-hidden={!visible}
        inert={!visible}
      >
        {/*
          Este envoltorio existe para que NO quede un hueco al plegar. La
          separación con la cabecera es el `padding-top` de `.grid`, y el
          relleno de un elemento no se colapsa aunque su altura sea cero: si
          `.grid` fuese el hijo directo, plegado seguiría midiendo 12 px.
          Metiéndolo un nivel más adentro, el recorte se lo lleva por delante.
        */}
        <div className={styles.clip}>
          <div className={styles.grid}>
        <Indicator
          icon="calendar"
          label="Gasto medio al día"
          value={averageDaily === null ? null : formatMoney(averageDaily)}
          hint={averageDaily === null ? 'El periodo no ha empezado' : 'Sobre los días transcurridos'}
        />

        <Indicator
          icon={topCategory?.icon ?? 'nav-categories'}
          iconColor={topCategory?.color}
          label="En lo que más gastas"
          value={topCategory === null ? null : topCategory.name}
          hint={
            topCategory === null
              ? 'Sin gastos todavía'
              : `${formatMoney(topCategory.total)} · ${Math.round(topCategory.percentage)}%`
          }
        />

        <Indicator
          icon="expense"
          label="Mayor gasto"
          value={largestExpense === null ? null : formatMoney(largestExpense.amount)}
          hint={
            largestExpense === null
              ? 'Sin gastos todavía'
              : // Muchos movimientos se anotan sin descripción; en ese caso el
                // hueco se queda sin explicar y una fecha dice más que nada.
                largestExpense.description || 'Sin descripción'
          }
        />

        <Indicator
          icon={savingsRate !== null && savingsRate < 0 ? 'down' : 'up'}
          label="Tasa de ahorro"
          value={savingsRate === null ? null : `${Math.round(savingsRate)}%`}
          hint={savingsRate === null ? 'Sin ingresos en el periodo' : 'De lo que entró'}
          tone={savingsRate === null ? 'neutral' : savingsRate < 0 ? 'expense' : 'income'}
        />

        <Indicator
          icon="nav-transactions"
          label="Movimientos"
          value={String(totals.count)}
            hint={totals.count === 0 ? 'Nada registrado' : 'Sin contar ajustes'}
          />
          </div>
        </div>
      </div>
    </section>
  );
}

interface IndicatorProps {
  icon: string;
  iconColor?: string | undefined;
  label: string;
  /** `null` se pinta como «—»: significa "no se puede calcular", no "cero". */
  value: string | null;
  hint: string;
  tone?: 'income' | 'expense' | 'neutral';
}

function Indicator({ icon, iconColor, label, value, hint, tone = 'neutral' }: IndicatorProps) {
  return (
    <Card className={styles.tile} padding="sm">
      <span className={styles.label}>
        <Icon name={icon} size="sm" {...(iconColor ? { color: iconColor } : {})} />
        {label}
      </span>
      <span
        className={cn(
          styles.value,
          value === null && styles.valueEmpty,
          tone === 'income' && styles.income,
          tone === 'expense' && styles.expense,
        )}
      >
        {value ?? '—'}
      </span>
      <span className={styles.hint}>{hint}</span>
    </Card>
  );
}
