/* eslint-disable no-restricted-globals -- ESTE es el único archivo autorizado. */

import { StorageError, type StorageAdapter } from '../StorageAdapter';

/**
 * ⚠️ EL ÚNICO ARCHIVO DE TODO `src/` QUE PUEDE TOCAR `localStorage`.
 *
 * La regla `no-restricted-globals` de `eslint.config.js` prohíbe el acceso
 * directo en cualquier otro sitio y este archivo es su única excepción. No es
 * ceremonia: en v1 el estado se leía y escribía desde cualquier parte, así que
 * era imposible saber quién había guardado qué, ni interponer una migración,
 * ni detectar un fallo de escritura. Con una sola puerta, todo eso es
 * localizable en 60 líneas.
 *
 * Si algún día los datos van a IndexedDB, se escribe un adaptador hermano y no
 * se toca nada más.
 */

function detectAvailability(): boolean {
  try {
    // No basta con comprobar que el objeto existe: en modo privado de Safari
    // `localStorage` está presente pero cualquier escritura lanza. La única
    // prueba fiable es escribir de verdad.
    const probe = '__gastos_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  // Los nombres y códigos varían entre navegadores; se cubren todos.
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

export function createLocalStorageAdapter(): StorageAdapter {
  const available = detectAvailability();

  return {
    isAvailable() {
      return available;
    },

    async getItem(key) {
      if (!available) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        // Una lectura que falla se trata como "no hay dato", nunca como un
        // error fatal: la app debe poder arrancar igualmente.
        return null;
      }
    },

    async setItem(key, value) {
      if (!available) {
        throw new StorageError(
          'unavailable',
          'El almacenamiento del navegador no está disponible. Los cambios no se guardarán.',
        );
      }
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        if (isQuotaError(error)) {
          throw new StorageError(
            'quota-exceeded',
            'No queda espacio de almacenamiento. Exporta una copia de seguridad y borra historiales antiguos.',
            { cause: error },
          );
        }
        throw new StorageError('unknown', 'No se pudo guardar la información.', { cause: error });
      }
    },

    async removeItem(key) {
      if (!available) return;
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignorado a propósito: no poder borrar no debe romper nada.
      }
    },

    async keys() {
      if (!available) return [];
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    },
  };
}
