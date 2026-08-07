/**
 * Borra la caché que dejó el Service Worker de v1.
 *
 * Workbox limpia SUS propias cachés antiguas (`cleanupOutdatedCaches`), pero
 * no sabe nada de `mis-gastos-v3`, que creó a mano el `sw.js` de v1
 * (`const CACHE = "mis-gastos-v3"`). Sin esto, esa caché se quedaría para
 * siempre en el dispositivo del usuario ocupando espacio con los archivos de
 * una aplicación que ya no existe — y, peor, podría responder a alguna
 * petición con el `app.js` viejo.
 *
 * Se inyecta en el SW generado mediante `workbox.importScripts`.
 */

const LEGACY_CACHE_NAME = 'mis-gastos-v3';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key === LEGACY_CACHE_NAME).map((key) => caches.delete(key))),
      )
      .catch(() => {
        // Si el borrado falla no se aborta la activación: quedarse con una
        // caché huérfana es mucho menos grave que dejar la app sin SW.
      }),
  );
});
