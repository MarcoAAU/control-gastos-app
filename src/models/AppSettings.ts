import type { ISOInstant } from './common';

export type ThemePreference = 'dark' | 'light' | 'system';

/**
 * Preferencias del usuario. No son datos financieros: se pueden perder sin
 * consecuencias, por eso van en su propio sub-objeto y no mezcladas con las
 * colecciones.
 */
export interface AppSettings {
  theme: ThemePreference;

  /**
   * ¿Se ven desplegados los indicadores del Inicio?
   *
   * ⚠️ OPCIONAL Y PLANO A PROPÓSITO. Los documentos v2 que ya están guardados
   * en los dispositivos no pasan por ningún merge de valores por defecto
   * (`runMigrations` devuelve el documento actual tal cual), así que este campo
   * llegará como `undefined` en todas las instalaciones existentes. Se lee
   * siempre con `?? true`.
   *
   * Si fuera un objeto anidado —`ui: { showIndicators }`— leerlo en un
   * documento antiguo lanzaría al intentar acceder a una propiedad de
   * `undefined`, y el fallo aparecería sólo en los dispositivos que ya tenían
   * datos: justo donde no se prueba.
   */
  showTodayIndicators?: boolean;
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
