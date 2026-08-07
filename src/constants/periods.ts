/**
 * Periodos de agregación.
 *
 * v1 sólo tenía tres pestañas (`hoy` / `semana` / `mes`). El spec nuevo añade
 * `year` para la pantalla de Seguimiento.
 */
export const PERIODS = ['day', 'week', 'month', 'year'] as const;

export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

/**
 * El periodo dicho DENTRO de una frase.
 *
 * ⚠️ NO ES `PERIOD_LABELS` EN MINÚSCULAS, y confundirlos produce castellano
 * roto. Las pestañas se rotulan "Hoy / Semana / Mes / Año" porque tienen que
 * caber en cuatro botones, pero esos mismos rótulos metidos en una frase dan
 * "Sin gastos en semana" o "Indicadores de mes". Una app en la que se lee eso
 * parece traducida a máquina, y el usuario deja de confiar en lo que dice
 * exactamente donde más necesita confiar: al lado de sus cifras.
 *
 * Van sin preposición delante a propósito: "esta semana" ya la lleva
 * implícita, y "en esta semana" sobra. Quien las use escribe
 * `Sin gastos ${frase}`, nunca `Sin gastos en ${frase}`.
 */
export const PERIOD_PHRASES: Record<Period, string> = {
  day: 'hoy',
  week: 'esta semana',
  month: 'este mes',
  year: 'este año',
};

/** Rótulo de la comparación con el periodo anterior. */
export const PERIOD_COMPARISON_LABELS: Record<Period, string> = {
  day: 'vs. ayer',
  week: 'vs. semana pasada',
  // "mismos días" y no "mes pasado": un mes en curso se compara contra el
  // mismo tramo del anterior, no contra un mes completo. Comparar 6 días
  // contra 31 daría siempre una caída falsa del 80%. Ver Fase 16.
  month: 'vs. mismos días del mes pasado',
  year: 'vs. mismos días del año pasado',
};

/** Pestaña seleccionada al abrir la app. La misma que en v1. */
export const DEFAULT_PERIOD: Period = 'day';

/** Periodos que ofrece el Inicio (Seguimiento ofrece los cuatro). */
export const DASHBOARD_PERIODS: readonly Period[] = ['day', 'week', 'month'];
