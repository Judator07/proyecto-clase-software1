/** Composición de la API REST (capa de presentación del servidor). */
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { ProveedorYahoo, type ProveedorDatosMercado } from './datos/proveedor';
import type { Entorno } from './entorno';
import { ErrorAplicacion } from './errores';
import { crearRutasAdmin, rutasContenido } from './rutas/contenido';
import { rutasAutenticacion, rutasPerfil } from './rutas/cuentas';
import {
  rutasAhorro,
  rutasInstrumentos,
  rutasOrdenes,
  rutasPortafolios,
  rutasTransacciones,
} from './rutas/inversiones';
import { rutasSalud } from './rutas/salud';

/** El proveedor se inyecta para poder sustituirlo en pruebas o cambiarlo sin tocar la lógica (TBD-1). */
export function crearApp(proveedor: ProveedorDatosMercado = new ProveedorYahoo()) {
  const app = new Hono<Entorno>().basePath('/api');

  app.use(secureHeaders());
  app.use(csrf());
  app.use(async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.route('/salud', rutasSalud);
  app.route('/auth', rutasAutenticacion);
  app.route('/perfil', rutasPerfil);
  app.route('/instrumentos', rutasInstrumentos);
  app.route('/portafolios', rutasPortafolios);
  app.route('/transacciones', rutasTransacciones);
  app.route('/ordenes', rutasOrdenes);
  app.route('/ahorro', rutasAhorro);
  app.route('/contenido', rutasContenido);
  app.route('/admin', crearRutasAdmin(proveedor));

  app.notFound((c) => c.json({ error: 'Recurso no encontrado.' }, 404));
  app.onError((err, c) => {
    if (err instanceof ErrorAplicacion) return c.json({ error: err.message, detalles: err.detalles }, err.estado);
    if (err instanceof HTTPException) return c.json({ error: err.message || 'Solicitud no válida.' }, err.status);
    console.error('Error no controlado', err);
    return c.json({ error: 'Ocurrió un error interno. Intenta de nuevo.' }, 500);
  });
  return app;
}
