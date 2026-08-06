import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Testing quirúrgico (ADR-010): solo lógica pura — migraciones y services.
// Sin tests de componentes ni E2E por decisión explícita de coste/beneficio.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    // Los primeros tests llegan en la Fase 4 (migración). Hasta entonces la
    // compuerta de calidad no debe fallar por ausencia de tests.
    passWithNoTests: true,
  },
});
