import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { useSystemColorScheme, type ColorScheme } from './useSystemColorScheme';

/**
 * Sincroniza el color de la barra de estado de Android con el tema.
 *
 * ── POR QUÉ SE LEE EL TOKEN EN VEZ DE ESCRIBIR EL HEX A MANO ──────────────
 * `<meta name="theme-color">` es lo que pinta la franja del sistema encima de
 * la app instalada. Si aquí hubiera un hex literal, cambiar la paleta en
 * `themes/*.css` dejaría esa franja con el color viejo: un borde de otro color
 * pegado al borde superior de la app, imposible de encontrar leyendo el CSS
 * porque el valor culpable estaría en un `.ts`.
 *
 * Leyendo el valor calculado justo después de poner `data-theme`, el token es
 * la única fuente de verdad y la franja no puede desincronizarse nunca.
 */
function syncThemeColor(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-surface')
    .trim();
  if (surface !== '') meta.content = surface;
}

/**
 * Resuelve la preferencia del usuario a un tema concreto y lo aplica.
 *
 * ── LAS DOS COSAS QUE NO SON LO MISMO ─────────────────────────────────────
 * `settings.theme` es lo que el usuario PIDIÓ (`'dark' | 'light' | 'system'`);
 * lo que se aplica es un tema REAL (`'dark' | 'light'`). `'system'` no es un
 * tema: es una instrucción para preguntarle al sistema operativo. Mantenerlos
 * separados es lo que permite que la app siga al modo nocturno del teléfono
 * sin escribir nada en los ajustes guardados — si al elegir "Sistema" se
 * guardara el valor resuelto, la preferencia dejaría de seguir al sistema en
 * cuanto éste cambiara.
 *
 * Es el ÚNICO sitio de la app que toca `data-theme`. Los componentes leen
 * roles de color (`--color-surface`), nunca el tema.
 */
export function useAppliedTheme(): ColorScheme {
  const preference = useAppStore((state) => state.settings.theme);
  const system = useSystemColorScheme();
  const resolved: ColorScheme = preference === 'system' ? system : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    syncThemeColor();
  }, [resolved]);

  return resolved;
}
