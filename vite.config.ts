import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// La app se sirve desde https://marcoaau.github.io/control-gastos-app/
// El `base` NO puede cambiar: el APK (TWA) apunta a esa URL exacta y el
// localStorage del usuario vive en ese origen. Ver ADR-001 y docs/DESPLIEGUE.md.
const BASE_PATH = '/control-gastos-app/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
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
