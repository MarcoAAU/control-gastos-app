import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// La app se sirve desde https://marcoaau.github.io/control-gastos-app/
// El `base` NO puede cambiar: el APK (TWA) apunta a esa URL exacta y el
// localStorage del usuario vive en ese origen. Ver ADR-001 y docs/DESPLIEGUE.md.
const BASE_PATH = '/control-gastos-app/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      // ⚠️ MISMO NOMBRE DE ARCHIVO QUE v1. El navegador identifica un Service
      // Worker por su URL: si el nuevo se llamara `service-worker.js`, el de
      // v1 seguiría registrado y activo, sirviendo la app antigua desde caché
      // para siempre. Con el mismo nombre, el navegador detecta el cambio de
      // bytes y lo reemplaza.
      filename: 'sw.js',
      registerType: 'autoUpdate',
      // Borra las cachés generadas por revisiones anteriores de Workbox.
      workbox: {
        cleanupOutdatedCaches: true,
        // El SW nuevo toma el control sin esperar a que se cierren todas las
        // pestañas. Sin esto, tras desplegar el usuario podría seguir viendo
        // la versión vieja hasta cerrar la app del todo.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Cualquier navegación cae en index.html: es lo que hace que las URL
        // con hash funcionen sin conexión.
        navigateFallback: `${BASE_PATH}index.html`,
        // Borra la caché `mis-gastos-v3` que creó a mano el sw.js de v1.
        // Workbox limpia las suyas, pero no sabe nada de aquélla.
        importScripts: ['purge-legacy-cache.js'],
      },
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Mis Gastos',
        short_name: 'Mis Gastos',
        description:
          'Administrador de gastos personales: cuentas, movimientos, reportes y seguimiento diario, semanal, mensual y anual.',
        // `start_url` y `scope` se conservan respecto a v1 (con el hash de la
        // ruta raíz). Cambiarlos haría que Android tratara la PWA instalada
        // como una app DISTINTA y el usuario acabaría con dos iconos.
        start_url: `${BASE_PATH}#/`,
        scope: BASE_PATH,
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#0f172a',
        orientation: 'portrait',
        lang: 'es-CO',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: {
        // Desactivado en desarrollo: un SW cacheando durante el desarrollo
        // sirve código viejo y hace perder horas persiguiendo fantasmas.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Presupuesto de bundle (ADR-005): la carga inicial debe quedar <= 100 kB gz.
    // Recharts viaja en su propio chunk lazy, así que este aviso salta si algo
    // pesado se cuela en el chunk inicial por error.
    chunkSizeWarningLimit: 600,
  },
});
