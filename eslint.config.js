import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 'public' contiene scripts que corren en el Service Worker, no en la app:
  // otro entorno global (self, caches) y otras reglas.
  { ignores: ['dist', 'node_modules', 'coverage', 'public'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // ── Reglas de aislamiento de capas ────────────────────────────────────────
  // No son cosmética: son la defensa mecánica contra los dos bugs estructurales
  // que tuvo v1. Ver ADR-003 y ADR-008 en docs/DECISIONES-TECNICAS.md.

  // 1. localStorage solo puede tocarse desde su adaptador.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/storage/adapters/localStorageAdapter.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Prohibido acceder a localStorage directamente. Usa AppDataRepository (ADR-008). El único archivo autorizado es storage/adapters/localStorageAdapter.ts.',
        },
      ],
    },
  },

  // 2. Pantallas y componentes no conocen la capa de almacenamiento.
  {
    files: ['src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/storage/*', '**/storage/*'],
              message:
                'Las pantallas y componentes no acceden al almacenamiento. Lee del store (ADR-008).',
            },
          ],
        },
      ],
    },
  },

  // 3. Las métricas de FLUJO (ingresos/gastos de un periodo) no pueden leer
  //    saldos de cuenta (STOCK). Confundir ambos fue exactamente la causa raíz
  //    del bug "los gastos vacían Ingresos" en v1 (app.js:221). Ver ADR-003.
  {
    files: ['src/services/metrics/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/balance/*', '**/services/balance/*'],
              message:
                'services/metrics calcula FLUJO (ingresos/gastos del periodo) y no puede leer saldos (STOCK). Mezclarlos causó el bug de v1 (ADR-003).',
            },
          ],
        },
      ],
    },
  },

  // 4. Los slices del store no persisten por su cuenta: existe un único
  //    suscriptor que llama a repository.save() (ADR-002/ADR-008).
  {
    files: ['src/store/slices/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/storage/AppDataRepository*', '**/storage/AppDataRepository*'],
              message:
                'Los slices no guardan datos. La persistencia la hace un único suscriptor en store/persistence.ts (ADR-002).',
            },
          ],
        },
      ],
    },
  },

  // Los tests pueden saltarse algunas restricciones de tipos.
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
