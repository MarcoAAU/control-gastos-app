import type { AppSettings } from '@/models';
import { CURRENCY, LOCALE, WEEK_STARTS_ON } from './locale';

/**
 * Ajustes de una instalación nueva.
 *
 * Es una FUNCIÓN y no un objeto constante a propósito: devolver siempre el
 * mismo objeto permitiría que un `setState` lo mutara y contaminara la
 * siguiente lectura. Un fallo así aparece semanas después y es dificilísimo
 * de rastrear.
 */
export function createDefaultSettings(): AppSettings {
  return {
    // 'dark' y no 'system': es el aspecto que el usuario ya tiene instalado, y
    // cambiárselo solo al actualizar sería una sorpresa. El selector llega en
    // la Fase 18.
    theme: 'dark',
    // Desplegados de entrada: es como se ha visto siempre el Inicio, y plegar
    // algo por defecto esconde información que el usuario no ha pedido esconder.
    showTodayIndicators: true,
    weekStartsOn: WEEK_STARTS_ON,
    currency: CURRENCY,
    locale: LOCALE,
    security: {
      pinEnabled: false,
      biometricsEnabled: false,
      autoLockMinutes: null,
    },
    backup: {
      lastExportedAt: null,
      cloudSyncEnabled: false,
    },
  };
}
