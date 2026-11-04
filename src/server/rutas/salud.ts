import { Hono } from 'hono';
import type { Entorno } from '../entorno';

/** Estado del servicio y de la base de datos (punto de monitoreo para RNF-09). */
export const rutasSalud = new Hono<Entorno>().get('/', async (c) => {
  let bd = 'ok';
  try {
    await c.env.DB.prepare('SELECT 1').first();
  } catch {
    bd = 'error';
  }
  return c.json(
    { estado: bd === 'ok' ? 'ok' : 'degradado', bd, fecha: new Date().toISOString() },
    bd === 'ok' ? 200 : 503,
  );
});
