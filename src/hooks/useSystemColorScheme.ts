import { useSyncExternalStore } from 'react';

/**
 * Se consulta por CLARO y no por oscuro, y no es lo mismo.
 *
 * `(prefers-color-scheme: dark)` y `(prefers-color-scheme: light)` fallan LAS
 * DOS cuando el sistema no expresa preferencia o el navegador no soporta la
 * característica. Preguntando por claro, ese caso indeterminado cae en oscuro
 * — que es el tema por defecto de la app y el que el usuario ya tiene
 * instalado. Preguntando por oscuro, caería en claro: un cambio de aspecto
 * repentino en dispositivos que no dijeron nada.
 */
const QUERY = '(prefers-color-scheme: light)';

export type ColorScheme = 'dark' | 'light';

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot(): ColorScheme {
  if (typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(QUERY).matches ? 'light' : 'dark';
}

/**
 * El esquema de color que pide el sistema operativo, EN VIVO.
 *
 * Que sea en vivo es el motivo de usar `useSyncExternalStore` en vez de leer
 * `matchMedia` una vez al montar: Android cambia a oscuro por la noche con la
 * app abierta, y sin la suscripción la app se quedaría en claro hasta que
 * alguien la reiniciara. `useSyncExternalStore` además evita el desgarro
 * (tearing) que tendría un `useState` + `useEffect` en un render concurrente.
 */
export function useSystemColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'dark');
}
