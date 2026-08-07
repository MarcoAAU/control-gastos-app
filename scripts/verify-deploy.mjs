import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Comprueba que `dist/` es publicable ANTES de subirlo a Pages.
 *
 * ── POR QUÉ HACE FALTA ESTO ─────────────────────────────────────────────────
 * Cada cosa que se verifica aquí es un fallo que NO se nota en desarrollo y
 * que rompe la app publicada o el APK ya instalado:
 *
 *  · `base` mal puesto → las rutas de los assets sólo fallan en producción,
 *    porque en `vite dev` todo se sirve desde la raíz.
 *  · `sw.js` con otro nombre → el Service Worker viejo de v1 sigue vivo en su
 *    ruta y sigue sirviendo la app antigua indefinidamente.
 *  · `scope`/`start_url` cambiados → el APK (TWA) apunta a una URL que ya no
 *    está dentro del alcance, y Android lo abre con barra de direcciones o
 *    directamente en el navegador.
 *  · Falta `.nojekyll` → GitHub Pages procesa el sitio con Jekyll, que IGNORA
 *    todo archivo o carpeta que empiece por guion bajo. Vite no genera esos
 *    nombres hoy, pero si algún día lo hiciera, el fallo sería un 404 suelto
 *    y muy difícil de atribuir.
 *
 * Ninguno de estos avisa: la app simplemente no arranca, o arranca la vieja.
 */

const DIST = 'dist';
const BASE = '/control-gastos-app/';

const errors = [];
const checks = [];

function ok(label) {
  checks.push(`  ✓ ${label}`);
}

function fail(label, detail) {
  errors.push(`  ✗ ${label}\n      ${detail}`);
}

function requireFile(path, why) {
  if (existsSync(join(DIST, path))) {
    ok(`${path} presente`);
    return true;
  }
  fail(`Falta ${path}`, why);
  return false;
}

// ── 1. Archivos que tienen que existir ──────────────────────────────────────
requireFile('index.html', 'Sin él no hay app.');
requireFile(
  '.nojekyll',
  'Sin este archivo, GitHub Pages pasa el sitio por Jekyll y descarta lo que empiece por "_".',
);
requireFile(
  'sw.js',
  'Debe llamarse igual que en v1 para reemplazar al Service Worker antiguo en su misma ruta.',
);
requireFile(
  'purge-legacy-cache.js',
  'Es lo que borra la caché heredada "mis-gastos-v3" al activarse el SW nuevo.',
);
requireFile('manifest.webmanifest', 'Sin manifest la PWA no es instalable.');

// ── 2. El `base` tiene que estar aplicado ───────────────────────────────────
if (existsSync(join(DIST, 'index.html'))) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const local = assetRefs.filter((url) => url.startsWith('/'));
  const wrong = local.filter((url) => !url.startsWith(BASE));

  if (local.length === 0) {
    fail('index.html no referencia ningún asset absoluto', 'El build parece vacío.');
  } else if (wrong.length > 0) {
    fail(
      `index.html apunta fuera de ${BASE}`,
      `Rutas incorrectas: ${wrong.join(', ')}. Revisa "base" en vite.config.ts.`,
    );
  } else {
    ok(`index.html referencia ${local.length} assets, todos bajo ${BASE}`);
  }
}

// ── 3. El manifest tiene que conservar lo que el APK ya instalado espera ────
if (existsSync(join(DIST, 'manifest.webmanifest'))) {
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'));

  if (manifest.scope !== BASE) {
    fail(
      `El "scope" del manifest cambió`,
      `Es "${manifest.scope}" y debe ser "${BASE}". El APK (TWA) dejaría de abrirse a pantalla completa.`,
    );
  } else {
    ok(`scope = ${manifest.scope}`);
  }

  if (!manifest.start_url?.startsWith(BASE)) {
    fail(
      `El "start_url" del manifest salió del alcance`,
      `Es "${manifest.start_url}" y debe empezar por "${BASE}".`,
    );
  } else {
    ok(`start_url = ${manifest.start_url}`);
  }

  if (manifest.display !== 'standalone') {
    fail(
      `"display" ya no es standalone`,
      `Es "${manifest.display}". La app instalada se abriría con la interfaz del navegador.`,
    );
  } else {
    ok('display = standalone');
  }

  const icons = manifest.icons ?? [];
  const missing = icons.filter((icon) => !existsSync(join(DIST, icon.src)));
  if (missing.length > 0) {
    fail(
      'El manifest declara iconos que no están en dist',
      missing.map((i) => i.src).join(', '),
    );
  } else if (icons.length === 0) {
    fail('El manifest no declara iconos', 'Android no podrá instalar la app.');
  } else {
    ok(`${icons.length} iconos declarados y presentes`);
  }
}

// ── 4. Que no se haya colado la app vieja ───────────────────────────────────
for (const legacy of ['app.js', 'style.css', 'manifest.json']) {
  if (existsSync(join(DIST, legacy))) {
    fail(
      `dist contiene ${legacy}, de la versión anterior`,
      'Publicarlo junto a v2 deja dos apps distintas servidas desde el mismo sitio.',
    );
  }
}
ok('Sin restos de la versión anterior');

// ── Resultado ───────────────────────────────────────────────────────────────
console.log('[despliegue] Comprobaciones del build:');
console.log(checks.join('\n'));

if (errors.length > 0) {
  console.error('\n[despliegue] El build NO es publicable:\n');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('\n[despliegue] Build verificado: se puede publicar.');
