#!/usr/bin/env node
/**
 * Toma las capturas del manual de usuario (docs/manual/*.png) con un usuario de demostración.
 * Uso: node scripts/capturas-manual.mjs [url=http://localhost:5173]
 */
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173';
const carpeta = new URL('../docs/manual/', import.meta.url).pathname;
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 860 } });
await pagina.goto(`${url}/aprende`);
const id = await pagina.evaluate(async () => {
  const json = { 'Content-Type': 'application/json' };
  const post = (ruta, cuerpo) =>
    fetch(`/api${ruta}`, { method: 'POST', headers: json, body: JSON.stringify(cuerpo) }).then((r) => r.json());
  await post('/auth/registro', {
    nombre: 'Ana Demo',
    correo: `demo${Date.now()}@ejemplo.co`,
    contrasena: 'Segura123',
    confirmacion: 'Segura123',
    aceptaPolitica: true,
  });
  const pf = await post('/portafolios', { nombre: 'Largo plazo', descripcion: 'Acciones, ETF y algo de cripto' });
  await post('/portafolios', { nombre: 'Experimentos' });
  for (const [simbolo, cantidad] of [
    ['AAPL', 5],
    ['MSFT', 3],
    ['SPY', 4],
    ['BTC', 0.02],
    ['ETH', 0.5],
  ]) {
    await post('/ordenes', { portafolioId: pf.id, simbolo, tipo: 'COMPRA', cantidad });
  }
  await post('/ahorro/depositos', {
    portafolioId: pf.id,
    montoCentavos: 100000,
    tasaAnualPct: 10,
    periodosPorAnio: 12,
    plazoMeses: 24,
  });
  return pf.id;
});
const foto = async (ruta, nombre, espera) => {
  await pagina.goto(`${url}${ruta}`);
  await pagina.getByText(espera).first().waitFor();
  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: `${carpeta}${nombre}.png`, fullPage: false });
};
await foto('/panel', 'panel', 'Patrimonio total');
await foto('/instrumentos/AAPL', 'instrumento', 'Estadísticas y tendencia');
await foto(`/portafolios/${id}`, 'portafolio', 'Composición');
await foto('/escenarios', 'escenarios', 'Actual frente a escenario');
await navegador.close();
console.log('Capturas guardadas en', carpeta);
