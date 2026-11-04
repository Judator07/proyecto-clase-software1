import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const AVISO = 'Plataforma de simulación con fines educativos. No usa dinero real ni constituye asesoría financiera.';

async function registrar(page: Page) {
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill('Prueba E2E');
  await page.getByLabel('Correo electrónico').fill(`e2e${Date.now()}${Math.floor(Math.random() * 1e4)}@prueba.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('Segura123');
  await page.getByLabel('Confirmar contraseña').fill('Segura123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL('**/panel**');
}

test('RNF-08: un usuario nuevo se registra y hace su primera compra en menos de 5 minutos y en 3 pasos', async ({
  page,
}) => {
  const inicio = Date.now();
  await registrar(page);
  await page.goto('/instrumentos/AAPL');
  await page.getByRole('button', { name: 'Crear mi primer portafolio' }).click();
  // Paso 1: datos de la orden.
  await page.getByLabel('Cantidad de AAPL').fill('2');
  await page.getByRole('button', { name: 'Revisar orden' }).click();
  // Paso 2: resumen y confirmación.
  await expect(page.getByRole('heading', { name: 'Resumen de la orden' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar compra' }).click();
  // Paso 3: comprobante.
  await expect(page.getByText('Ejecutada', { exact: true })).toBeVisible();
  await expect(page.getByText(/Compraste 2 AAPL/)).toBeVisible();
  expect(Date.now() - inicio).toBeLessThan(5 * 60_000);
});

test('RF-08: cancelar en el resumen registra la orden como Cancelada', async ({ page }) => {
  await registrar(page);
  await page.goto('/instrumentos/BTC');
  await page.getByRole('button', { name: 'Crear mi primer portafolio' }).click();
  await page.getByLabel('Cantidad de BTC').fill('0,01');
  await page.getByRole('button', { name: 'Revisar orden' }).click();
  await page.getByRole('button', { name: 'Cancelar orden' }).click();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
});

test('RNF-06: las pantallas privadas redirigen al inicio de sesión', async ({ page }) => {
  for (const ruta of ['/panel', '/perfil', '/instrumentos', '/escenarios', '/admin']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/ingresar/);
  }
});

test('RNF-07: no es posible registrarse sin aceptar la política de datos', async ({ page }) => {
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill('Sin Consentimiento');
  await page.getByLabel('Correo electrónico').fill(`sc${Date.now()}@prueba.co`);
  await page.getByLabel('Contraseña', { exact: true }).fill('Segura123');
  await page.getByLabel('Confirmar contraseña').fill('Segura123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Debes aceptar la política de tratamiento de datos')).toBeVisible();
  await expect(page).toHaveURL(/\/registro/);
});

test('RNF-03 y RNF-12: aviso educativo, sin desborde horizontal y sin fallas de accesibilidad WCAG 2.1 AA', async ({
  page,
}) => {
  const publicas = ['/', '/aprende', '/ingresar', '/registro', '/privacidad'];
  const privadas = ['/panel', '/instrumentos', '/instrumentos/SPY', '/ahorro', '/escenarios', '/perfil'];
  const violaciones: string[] = [];
  const revisar = async (ruta: string) => {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(AVISO)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `desborde en ${ruta}`,
    ).toBe(true);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const v of r.violations) violaciones.push(`${ruta}: ${v.id} (${v.nodes.length})`);
  };
  for (const ruta of publicas) await revisar(ruta);
  await registrar(page);
  for (const ruta of privadas) await revisar(ruta);
  expect(violaciones, violaciones.join('\n')).toEqual([]);
});
