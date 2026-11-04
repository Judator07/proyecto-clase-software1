/** Punto de entrada del Worker: API HTTP y tarea programada de RF-17. */
import { crearApp } from './app';
import { ProveedorYahoo } from './datos/proveedor';
import { actualizarPrecios, tocaActualizar } from './servicios/mercado';

const app = crearApp();

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    const ahora = new Date(controller.scheduledTime);
    if (!tocaActualizar(ahora, Number(env.INTERVALO_ACTUALIZACION_MIN) || 15)) return;
    ctx.waitUntil(
      actualizarPrecios(env.DB, new ProveedorYahoo(), ahora).then((r) =>
        console.log(`RF-17: ${r.actualizados} precios actualizados; fallidos: ${r.fallidos.join(', ') || 'ninguno'}`),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
