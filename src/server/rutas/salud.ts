import { Hono } from 'hono';
import type { Entorno } from '../entorno';

export const rutasSalud = new Hono<Entorno>();

/** Estado del servicio y de la base de datos (apoyo al monitoreo de RNF-09). */
rutasSalud.get('/', async (c) => {
  let bd = 'ok';
  try {
    await c.env.DB.prepare('SELECT 1').first();
  } catch {
    bd = 'error';
  }
  return c.json({ estado: bd === 'ok' ? 'ok' : 'degradado', bd, fecha: new Date().toISOString() });
});

/**
 * Sonda temporal de la fase 1 (se elimina en la fase 3):
 * verifica si el proveedor de datos responde desde la red de Cloudflare.
 */
rutasSalud.get('/sonda-proveedor', async (c) => {
  const simbolos = ['AAPL', 'SPY', 'BTC-USD'];
  const resultados = await Promise.all(
    simbolos.map(async (s) => {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimuladorInversionUIS/1.0)' } },
        );
        const cuerpo = r.ok
          ? ((await r.json()) as { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } })
          : null;
        return { simbolo: s, http: r.status, precio: cuerpo?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null };
      } catch (e) {
        return { simbolo: s, http: 0, error: String(e) };
      }
    }),
  );
  return c.json(resultados);
});

/** Sonda temporal: costo de PBKDF2 frente al límite de CPU del plan gratuito. */
rutasSalud.get('/sonda-pbkdf2', async (c) => {
  const iteraciones = Math.min(Number(c.req.query('iter') ?? '100000'), 100000);
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode('Prueba1234'), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const sal = crypto.getRandomValues(new Uint8Array(16));
  await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, clave, 256);
  return c.json({ iteraciones, ok: true });
});
