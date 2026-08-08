import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_TYPE_META } from './accountTypes';
import { ICON_REGISTRY, PICKABLE_ICONS } from './icons';
import { BOTTOM_NAV_ITEMS } from './routes';
import { SEED_BANKS } from './seedBanks';
import { SEED_CATEGORIES, SEED_SUBCATEGORIES } from './seedCategories';

const REGISTERED = new Set(Object.keys(ICON_REGISTRY));

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Consistencia de iconografía.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── EL FALLO QUE ESTO IMPIDE ──────────────────────────────────────────────
 * `<Icon>` tiene un respaldo deliberado: si la clave no está en el registro,
 * pinta la cadena tal cual. Existe para que los emojis que v1 guardó en los
 * datos del usuario ("🍔", "🏦") sigan viéndose sin migrar nada.
 *
 * El precio de ese respaldo es que una clave MAL ESCRITA no falla: se dibuja.
 * Ya ocurrió — la fila de saldo de Seguimiento mostró la palabra «scale» en
 * texto plano durante toda la Fase 16, porque el icono no estaba registrado y
 * el respaldo hizo su trabajo demasiado bien. No hubo error en consola ni
 * fallo de compilación; sólo una palabra suelta en inglés en medio de la
 * interfaz, que sólo se ve mirando esa pantalla concreta.
 */
describe('registro de iconos', () => {
  it('el registro no está vacío', () => {
    expect(REGISTERED.size).toBeGreaterThan(40);
  });

  it('cada icono elegible existe en el registro', () => {
    for (const key of PICKABLE_ICONS) {
      expect(REGISTERED.has(key), `PICKABLE_ICONS: "${key}"`).toBe(true);
    }
  });

  it('los catálogos semilla sólo usan iconos registrados', () => {
    const referenced: [string, string][] = [
      ...SEED_BANKS.map((bank): [string, string] => [bank.icon, `banco ${bank.id}`]),
      ...SEED_CATEGORIES.map((cat): [string, string] => [cat.icon, `categoría ${cat.id}`]),
      ...SEED_SUBCATEGORIES.map((sub): [string, string] => [
        sub.icon ?? 'tag',
        `subcategoría ${sub.id}`,
      ]),
      ...Object.entries(ACCOUNT_TYPE_META).map(([type, meta]): [string, string] => [
        meta.icon,
        `tipo de cuenta ${type}`,
      ]),
      ...BOTTOM_NAV_ITEMS.map((item): [string, string] => [item.icon, `pestaña ${item.label}`]),
    ];

    for (const [icon, where] of referenced) {
      expect(REGISTERED.has(icon), `${where} usa "${icon}"`).toBe(true);
    }
  });
});

/**
 * Barrido del código fuente.
 *
 * ── POR QUÉ SE LEEN LOS ARCHIVOS Y NO BASTA CON LOS TIPOS ─────────────────
 * `<Icon name>` es un `string` y no `IconKey`, y tiene que serlo: el nombre
 * llega de datos guardados que pueden traer un emoji. Ese hueco en el tipado
 * es exactamente por donde entró «scale».
 *
 * Lo que sí se puede afirmar es más estricto: una clave ESCRITA A MANO en el
 * código nunca es un emoji heredado, así que tiene que estar registrada. Eso
 * no lo puede comprobar el compilador, pero sí un barrido de 20 líneas.
 *
 * Si este test falla, hay dos salidas legítimas: registrar el icono en
 * `ICON_REGISTRY`, o corregir la errata. Silenciarlo devuelve la app al estado
 * en que una palabra en inglés puede aparecer en medio de la pantalla.
 */
describe('iconos usados en el código', () => {
  const SRC = fileURLToPath(new URL('..', import.meta.url));

  function collectFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) collectFiles(full, out);
      // Los propios tests quedan fuera: este archivo cita `<Icon name="…">`
      // en un comentario y se acusaría a sí mismo.
      else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full);
    }
    return out;
  }

  it('toda clave literal está registrada', () => {
    const unknown: string[] = [];

    for (const file of collectFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      const relative = file.slice(SRC.length).replace(/\\/g, '/');

      // Dos formas de escribirlo: la prop `icon` de cualquier componente
      // (Button, EmptyState, Fab, StatTile…) y `<Icon name="…">` directo.
      const literals = [
        ...source.matchAll(/\bicon="([^"]+)"/g),
        ...source.matchAll(/<Icon\s+name="([^"]+)"/g),
      ];

      for (const match of literals) {
        const key = match[1]!;
        if (!REGISTERED.has(key)) unknown.push(`${relative}: "${key}"`);
      }
    }

    expect(unknown).toEqual([]);
  });
});
