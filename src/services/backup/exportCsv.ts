import { AMOUNT_DECIMALS, CSV_DELIMITER } from '@/constants';
import type { Account, Category, ID, Subcategory, Transaction } from '@/models';
import type { CategorySlice } from '@/services/metrics/categoryBreakdown';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Exportación a CSV para Excel en español (es-CO).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Generar un CSV parece trivial y tiene tres trampas. Las tres producen un
 * archivo que ABRE sin error y muestra basura, que es el peor de los fallos
 * posibles: el usuario no sabe que tiene que desconfiar.
 *
 * ── 1. EL SEPARADOR NO ES LA COMA ─────────────────────────────────────────
 * Excel usa como separador de columnas el de la configuración regional. En
 * español es el PUNTO Y COMA, porque la coma es el separador decimal. Un CSV
 * con comas se abre en es-CO con todo amontonado en la columna A. Por eso
 * `CSV_DELIMITER` es `';'` desde la Fase 1.
 *
 * ── 2. SIN BOM, LAS TILDES SE ROMPEN ──────────────────────────────────────
 * Excel para Windows no detecta UTF-8 al abrir un `.csv` por doble clic:
 * asume la codificación del sistema (Windows-1252) y "Café" sale como "CafÃ©".
 * El BOM (U+FEFF al principio) es lo que le dice que es UTF-8. Son tres
 * bytes y son la diferencia entre un archivo legible y uno que parece
 * corrupto — en una app en español, con nombres como "Farmacia El Peñón",
 * afecta a casi todas las filas.
 *
 * ── 3. INYECCIÓN DE FÓRMULAS (el que sí es un riesgo, no una molestia) ────
 * Una celda que empieza por `=`, `+`, `-` o `@` la interpreta Excel como
 * FÓRMULA, no como texto. Una descripción escrita como `=1+1` aparecería como
 * `2`; una más maliciosa puede invocar funciones externas. Aquí el texto lo
 * escribe el propio usuario, así que el escenario de ataque es remoto — pero
 * el de accidente no: quien anote un gasto como "-500 de descuento" vería su
 * descripción convertida en un número negativo. Se antepone un apóstrofo, que
 * Excel usa justamente para forzar texto y no se muestra en la celda.
 *
 * ── SALTOS DE LÍNEA ───────────────────────────────────────────────────────
 * Se usa CRLF porque es lo que dice el RFC 4180 y lo que Excel espera. Y las
 * observaciones del usuario PUEDEN contener saltos de línea (el campo es un
 * textarea desde la Fase 13), así que el entrecomillado no es opcional.
 */

/** Marca de orden de bytes. Sin ella Excel no reconoce el UTF-8. */
const BOM = '\uFEFF';

const EOL = '\r\n';

/** Caracteres con los que Excel interpreta la celda como fórmula. */
const FORMULA_STARTERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Convierte un valor en una celda segura.
 *
 * ── LOS NÚMEROS NO PASAN POR LA GUARDA ANTI-FÓRMULA ───────────────────────
 * ⚠️ Y ES LA LÍNEA MÁS IMPORTANTE DE ESTE ARCHIVO. La primera versión
 * aplicaba la guarda a todo, así que un gasto de −47.000 salía como `'-47000`
 * y Excel lo trataba como TEXTO: `SUMA()` devolvía cero — exactamente el
 * fallo que la exportación existe para evitar. Lo detectó el test de
 * consistencia con la pantalla, no la revisión del código.
 *
 * La guarda protege del TEXTO QUE ESCRIBE EL USUARIO. Los números los genera
 * la app y no pueden contener una fórmula, así que se distinguen por tipo y no
 * por su aspecto: pasar el número crudo y dejar que esta función lo formatee
 * hace imposible equivocarse en el sitio de la llamada.
 *
 * Para el texto: entrecomilla siempre que haya delimitador, comillas o saltos
 * de línea, y duplica las comillas interiores (`"` → `""`), como el RFC 4180.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return csvNumber(value);

  let text = value;

  // El apóstrofo va ANTES del entrecomillado: dentro de las comillas seguiría
  // siendo el primer carácter de la celda para Excel.
  if (text.length > 0 && FORMULA_STARTERS.includes(text[0]!)) {
    text = `'${text}`;
  }

  const needsQuotes =
    text.includes(CSV_DELIMITER) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r');

  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Número para una celda numérica.
 *
 * ⚠️ SIN SEPARADOR DE MILES. "1.250.000" no lo lee Excel como número en
 * ninguna configuración: lo trataría como texto y `SUMA()` daría cero, que es
 * justo lo que el usuario iba a hacer al exportar.
 *
 * Con `AMOUNT_DECIMALS = 0` (el peso colombiano no usa céntimos en la
 * práctica) los importes son enteros y la cuestión del separador decimal no
 * llega a plantearse. La rama de la coma está escrita igualmente para que
 * activar decimales algún día no rompa silenciosamente los exports.
 */
export function csvNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (AMOUNT_DECIMALS === 0) return String(Math.round(value));
  return value.toFixed(AMOUNT_DECIMALS).replace('.', ',');
}

function buildCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return BOM + rows.map((row) => row.map(csvCell).join(CSV_DELIMITER)).join(EOL) + EOL;
}

export interface CsvContext {
  accountById: Map<ID, Account>;
  categoryById: Map<ID, Category>;
  subcategoryById: Map<ID, Subcategory>;
}

const MOVEMENT_HEADERS = [
  'Fecha',
  'Hora',
  'Tipo',
  'Importe',
  'Cuenta',
  'Categoría',
  'Subcategoría',
  'Descripción',
  'Observaciones',
] as const;

/**
 * Movimientos, una fila por movimiento.
 *
 * ── EL IMPORTE VA CON SIGNO ───────────────────────────────────────────────
 * Negativo para los gastos. El modelo guarda siempre un importe positivo y el
 * signo en `type`, que es lo correcto para la app — pero quien exporta a Excel
 * lo hace para sumar, y una columna de positivos exige una fórmula con
 * condición antes de poder totalizar nada. Con el signo puesto, `SUMA()`
 * funciona en la primera celda que se pruebe. La columna `Tipo` sigue ahí para
 * poder filtrar.
 *
 * Los ajustes de saldo se marcan como tales en la columna Tipo en vez de
 * ocultarse: el archivo debe cuadrar con el saldo de la app, y si faltaran, la
 * suma del CSV no coincidiría con lo que muestra la pantalla de Cuentas.
 */
export function movementsToCsv(
  transactions: readonly Transaction[],
  context: CsvContext,
): string {
  const rows: (string | number | null | undefined)[][] = [[...MOVEMENT_HEADERS]];

  for (const tx of transactions) {
    rows.push([
      tx.date,
      // La hora de los movimientos migrados de v1 es '00:00' y no significa
      // medianoche, sino "sin hora". Exportarla mentiría sobre la precisión.
      tx.time === '00:00' ? '' : tx.time,
      tx.isAdjustment ? 'Ajuste' : tx.type === 'income' ? 'Ingreso' : 'Gasto',
      tx.type === 'income' ? tx.amount : -tx.amount,
      context.accountById.get(tx.accountId)?.name ?? '',
      context.categoryById.get(tx.categoryId)?.name ?? '',
      tx.subcategoryId === null
        ? ''
        : (context.subcategoryById.get(tx.subcategoryId)?.name ?? ''),
      tx.description,
      tx.notes,
    ]);
  }

  return buildCsv(rows);
}

/**
 * Resumen por categoría.
 *
 * ⚠️ NO CALCULA NADA. Recibe el reparto ya hecho por
 * `services/metrics/categoryBreakdown`, el mismo que pinta la pantalla. Es la
 * regla de esta fase: **Reportes no tiene matemática propia**. Si el CSV
 * sumara por su cuenta, tarde o temprano el archivo y la pantalla dirían
 * cifras distintas, y no habría forma de saber cuál creer.
 */
export function categorySummaryToCsv(slices: readonly CategorySlice[]): string {
  const rows: (string | number | null | undefined)[][] = [
    ['Categoría', 'Importe', 'Porcentaje'],
  ];

  for (const slice of slices) {
    rows.push([slice.name, slice.total, Math.round(slice.percentage)]);
  }

  return buildCsv(rows);
}

/** `mis-gastos-movimientos-2026-08-07.csv`. Con fecha, para no sobrescribir. */
export function csvFileName(prefix: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `mis-gastos-${prefix}-${yyyy}-${mm}-${dd}.csv`;
}
