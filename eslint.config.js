import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      '.wrangler',
      'node_modules',
      'worker-configuration.d.ts',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,ts}', 'tests/**/*.{ts,mjs}', '*.config.{js,ts}'],
    // Las pruebas E2E ejecutan código en el navegador (page.evaluate).
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Las pruebas inspeccionan respuestas JSON arbitrarias de la API.
    files: ['tests/**/*.{ts,mjs}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
