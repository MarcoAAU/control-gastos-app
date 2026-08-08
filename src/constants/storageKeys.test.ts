import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from './defaultSettings';
import { STORAGE_KEY } from './storageKeys';

const INDEX_HTML = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  El script anti-parpadeo de `index.html` no puede quedarse atrás.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Ese script aplica el tema antes del primer píxel y, por vivir en el HTML, no
 * puede importar nada: repite la clave de almacenamiento, el tema por defecto
 * y la regla de `'system'`.
 *
 * Una duplicación que nadie vigila se rompe sola. El día que cambie
 * `STORAGE_KEY` —una migración v2→v3, por ejemplo— el script seguiría leyendo
 * la clave vieja y el fallo sería de los peores: no rompe nada, no da error,
 * sólo devuelve el parpadeo negro en cada arranque. Nadie lo relacionaría con
 * un cambio en las constantes meses después.
 *
 * Estos tests son baratos y convierten ese fallo silencioso en rojo.
 */
describe('script de tema en index.html', () => {
  it('lee la clave de almacenamiento vigente', () => {
    expect(INDEX_HTML).toContain(`localStorage.getItem('${STORAGE_KEY}')`);
  });

  it('cae en el mismo tema por defecto que la app', () => {
    // Si el defecto pasara a 'light', el script tendría que cambiar con él: si
    // no, el primer arranque pintaría oscuro y saltaría a claro.
    expect(createDefaultSettings().theme).toBe('dark');
    expect(INDEX_HTML).toContain("data-theme', pref === 'light' ? 'light' : 'dark'");
  });

  it("resuelve 'system' preguntando por claro, igual que el hook", () => {
    // Mismo criterio que `useSystemColorScheme`: preguntar por claro hace que
    // "sin preferencia" caiga en oscuro. Si las dos consultas divergieran, el
    // arranque y el hook podrían elegir temas distintos y el parpadeo volvería
    // sólo para quien tenga el sistema sin preferencia declarada.
    expect(INDEX_HTML).toContain("matchMedia('(prefers-color-scheme: light)')");
  });
});
