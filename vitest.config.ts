import { defineConfig } from 'vitest/config';

// Pruebas unitarias de la capa de dominio (funciones puras, sin dependencias de Cloudflare).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/dominio/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
