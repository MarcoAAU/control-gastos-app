import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

/**
 * Comprueba el presupuesto de carga inicial. Se ejecuta tras cada `build`.
 *
 * POR QUÉ UN SCRIPT Y NO UNA NOTA EN LA DOCUMENTACIÓN
 * Un presupuesto que nadie mide se incumple en tres semanas sin que nadie se
 * entere. La app arranca dentro de un APK (TWA), donde cada kilobyte de la
 * carga inicial es tiempo de pantalla en blanco tras tocar el icono. Esto
 * falla la compilación en cuanto algo pesado se cuela en el chunk principal.
 *
 * Sólo cuenta los archivos `index-*`: son los que el navegador descarga SÍ o SÍ
 * antes de pintar. Las pantallas y los gráficos van en chunks diferidos y no
 * computan — que es justo lo que hace viable meter Recharts (~95 kB) más
 * adelante.
 */

const BUDGET_KB = 100;
const ASSETS_DIR = 'dist/assets';

const initial = readdirSync(ASSETS_DIR).filter((file) => /^index-.*\.(js|css)$/.test(file));

if (initial.length === 0) {
  console.error('[presupuesto] No se encontró ningún chunk inicial en dist/assets.');
  process.exit(1);
}

let totalBytes = 0;
const rows = initial.map((file) => {
  const gz = gzipSync(readFileSync(join(ASSETS_DIR, file))).length;
  totalBytes += gz;
  return { archivo: file, 'kB gz': +(gz / 1024).toFixed(2) };
});

const totalKb = totalBytes / 1024;
const pct = Math.round((totalKb / BUDGET_KB) * 100);

console.table(rows);
console.log(`[presupuesto] Carga inicial: ${totalKb.toFixed(2)} kB gz de ${BUDGET_KB} (${pct}%)`);

if (totalKb > BUDGET_KB) {
  console.error(
    `\n[presupuesto] ❌ Excedido en ${(totalKb - BUDGET_KB).toFixed(2)} kB.\n` +
      'Antes de subir el límite, comprueba que lo pesado esté en un chunk diferido:\n' +
      '  · Recharts sólo debe cargarse desde Inicio y Reportes, vía React.lazy.\n' +
      '  · Las pantallas se importan desde src/router/LazyRoutes.ts, nunca de forma estática.\n',
  );
  process.exit(1);
}

if (pct >= 90) {
  console.warn(`[presupuesto] ⚠️  Al ${pct}% del límite. Queda poco margen.`);
}
