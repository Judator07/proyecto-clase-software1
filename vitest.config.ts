import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  // Las pruebas de integración no cargan los 25.000 históricos (0004): usan precios deterministas.
  const migraciones = (await readD1Migrations(path.join(import.meta.dirname, 'migrations'))).filter(
    (m) => !m.name.includes('historicos'),
  );
  return {
    test: {
      coverage: {
        provider: 'v8' as const,
        include: ['src/dominio/**/*.ts'],
        reporter: ['text', 'html', 'json-summary'],
        thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
      },
      projects: [
        // Pruebas unitarias de la capa de dominio (Node.js).
        { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
        // Pruebas de integración de la API dentro del runtime de Workers con D1 en Miniflare.
        {
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.jsonc' },
              miniflare: {
                bindings: { TEST_MIGRATIONS: migraciones, PBKDF2_ITERACIONES: '1000' },
              },
            }),
          ],
          test: {
            name: 'integracion',
            include: ['tests/integracion/**/*.test.ts'],
            setupFiles: ['./tests/integracion/preparar.ts'],
          },
        },
      ],
    },
  };
});
