import { describe, expect, it, vi } from 'vitest';
import { noopSecurityProvider } from './NoopSecurityProvider';
import { security } from './index';

/**
 * El criterio de aceptación de la Fase 19 es que la app se comporte
 * exactamente igual que sin la costura. Eso se reduce a una afirmación
 * comprobable: el proveedor activo nunca dice `'locked'`.
 *
 * `AuthGate` sólo interrumpe cuando el estado es `'locked'`. Mientras estos
 * tests pasen, la pasarela es transparente por construcción y no hace falta
 * probar el componente.
 */
describe('proveedor de seguridad no-op', () => {
  it('nunca bloquea', () => {
    expect(noopSecurityProvider.getStatus()).toBe('disabled');
    noopSecurityProvider.lock();
    // Incluso después de pedir el bloqueo: no hay nada que bloquear.
    expect(noopSecurityProvider.getStatus()).toBe('disabled');
  });

  it('es el proveedor que usa la app', () => {
    // Si esto falla es que alguien cambió la línea de `index.ts`. No es un
    // error en sí —es justo el punto por donde se activa el bloqueo— pero
    // debe ser una decisión consciente, no un descuido.
    expect(security).toBe(noopSecurityProvider);
  });

  it('suscribirse no notifica nada y devuelve una baja utilizable', () => {
    const listener = vi.fn();
    const unsubscribe = noopSecurityProvider.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });

  it('desbloquear no falla, porque no hay puerta que abrir', async () => {
    await expect(noopSecurityProvider.unlock('lo-que-sea')).resolves.toEqual({ ok: true });
  });
});
