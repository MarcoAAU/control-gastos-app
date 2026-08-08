import type { ThemePreference } from '@/models';
import { Card, SegmentedControl, type SegmentedOption } from '@/components/ui';
import { useSystemColorScheme } from '@/hooks/useSystemColorScheme';
import { useAppStore } from '@/store';
import styles from '../SettingsScreen.module.css';

const OPTIONS: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
];

/**
 * Selector de tema.
 *
 * ── POR QUÉ "SISTEMA" NECESITA UNA LÍNEA DE EXPLICACIÓN ───────────────────
 * Las otras dos opciones se explican solas: se toca y se ve el resultado.
 * "Sistema" no: si el teléfono ya está en oscuro, elegirla no cambia nada en
 * pantalla y parece que el botón no funciona. La frase de abajo dice qué está
 * pidiendo el teléfono ahora mismo, y así el usuario entiende que el ajuste sí
 * hizo algo — y que cambiará solo cuando el teléfono cambie.
 *
 * Vive en su propio archivo porque `SettingsScreen` ya rondaba las 340 líneas
 * con cuatro tarjetas y tres hojas de confirmación.
 */
export function ThemeSetting() {
  const theme = useAppStore((state) => state.settings.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const system = useSystemColorScheme();

  return (
    <Card className={styles.card}>
      <h2 className={styles.sectionTitle}>Apariencia</h2>
      <p className={styles.sectionText}>
        {theme === 'system'
          ? `Sigue a tu teléfono, que ahora mismo pide el modo ${
              system === 'dark' ? 'oscuro' : 'claro'
            }.`
          : 'El tema queda fijo aunque tu teléfono cambie de modo por la noche.'}
      </p>
      <SegmentedControl
        value={theme}
        onChange={setTheme}
        options={OPTIONS}
        label="Tema de la aplicación"
      />
    </Card>
  );
}
