import { Hono } from 'hono';
import { rutasSalud } from './rutas/salud';

import type { Entorno } from './entorno';

const app = new Hono<Entorno>().basePath('/api');

app.route('/salud', rutasSalud);

app.notFound((c) => c.json({ error: 'Recurso no encontrado' }, 404));
app.onError((err, c) => {
  console.error('Error no controlado', err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    // La actualización de precios (RF-17) se implementa en la fase 3.
    console.log('cron', controller.cron, Boolean(env.DB), typeof ctx.waitUntil);
  },
} satisfies ExportedHandler<Env>;
