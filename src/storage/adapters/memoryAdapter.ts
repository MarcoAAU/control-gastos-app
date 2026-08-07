import { type StorageAdapter } from '../StorageAdapter';

/**
 * Adaptador en memoria.
 *
 * Dos usos, ambos reales:
 *  1. Los tests de migración corren en Node, donde no existe `localStorage`.
 *  2. Respaldo en caliente si el navegador no tiene almacenamiento (modo
 *     privado). La app funciona la sesión entera y avisa de que no se
 *     guardará — mucho mejor que una pantalla en blanco.
 */
export function createMemoryAdapter(seed?: Record<string, string>): StorageAdapter {
  const store = new Map<string, string>(Object.entries(seed ?? {}));

  return {
    isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    async keys() {
      return [...store.keys()];
    },
  };
}
