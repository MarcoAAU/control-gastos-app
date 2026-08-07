import type { HexColor } from '@/models';

/**
 * Paleta que se ofrece al usuario al crear categorías, cuentas y bancos.
 *
 * Son colores de DATO, no de tema: se guardan dentro de cada entidad y se
 * pintan igual en claro y en oscuro, por eso son hex literales y no tokens.
 * Los ocho primeros son exactamente los que v1 asignaba a sus categorías
 * (`app.js:5-22`), para que nada cambie de color al migrar.
 */
export const PALETTE: readonly HexColor[] = [
  '#ff8a5c', // comida
  '#6c8dff', // transporte (= acento de la app)
  '#4bd9c0', // vivienda / ingresos
  '#c084fc', // entretenimiento
  '#ff6b7a', // salud / gastos
  '#ffd166', // compras
  '#5eead4', // servicios
  '#93a2c6', // otros (gris azulado)
  // Ampliación para que el usuario tenga de dónde elegir sin repetir.
  '#f472b6',
  '#a78bfa',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#818cf8',
  '#2dd4bf',
];

/** Color de una entidad nueva cuando el usuario no elige. */
export const DEFAULT_COLOR: HexColor = '#6c8dff';
