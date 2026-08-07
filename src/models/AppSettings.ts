import type { ISOInstant } from './common';

export type ThemePreference = 'dark' | 'light' | 'system';

/**
 * Preferencias del usuario. No son datos financieros: se pueden perder sin
 * consecuencias, por eso van en su propio sub-objeto y no mezcladas con las
 * colecciones.
 */
export interface AppSettings {
  theme: ThemePreference;
  /** Día en que empieza la semana. 1 = lunes (convenio es-CO). */
  weekStartsOn: 0 | 1;
  /** Reservado para multimoneda; hoy siempre `'COP'`. */
  currency: string;
  locale: string;

  /**
   * COSTURA DE SEGURIDAD — SÓLO ESTRUCTURA, NADA IMPLEMENTADO.
   *
   * El usuario pidió explícitamente dejar preparada la arquitectura de PIN,
   * biometría, respaldos y sincronización sin implementarlos todavía. Estos
   * campos existen para que activarlos en la Fase 19 sea añadir código nuevo
   * y no una migración del modelo de datos con los datos reales dentro.
   *
   * Ninguna pantalla los lee todavía. `services/security/` expone una
   * implementación no-op.
   */
  security: {
    pinEnabled: boolean;
    biometricsEnabled: boolean;
    /** Minutos de inactividad antes de bloquear. `null` = nunca. */
    autoLockMinutes: number | null;
  };

  backup: {
    /** Marca de la última exportación manual, para poder avisar si es vieja. */
    lastExportedAt: ISOInstant | null;
    /** Reservado para sincronización en la nube. Hoy siempre `false`. */
    cloudSyncEnabled: boolean;
  };
}
