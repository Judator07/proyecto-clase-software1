import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo (RNF-03, RNF-06, RNF-07, RNF-08, RNF-12).
 * Por defecto prueban el servidor local; con URL_BASE se ejecutan contra producción.
 */
const urlBase = process.env.URL_BASE ?? 'http://localhost:5173';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: urlBase, locale: 'es-CO', timezoneId: 'America/Bogota', trace: 'retain-on-failure' },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } } },
  ],
  webServer: process.env.URL_BASE
    ? undefined
    : { command: 'npm run dev -- --port 5173 --strictPort', url: `${urlBase}/api/salud`, reuseExistingServer: true },
});
