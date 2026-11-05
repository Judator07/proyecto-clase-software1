/** Rutas del centro de aprendizaje (RF-19, público) y del panel de administración (RF-18, RF-20). */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Entorno } from '../entorno';
import type { ProveedorDatosMercado } from '../datos/proveedor';
import {
  actualizarArticulo,
  articuloPorId,
  articuloPublicado,
  crearArticulo,
  eliminarArticulo,
  listarArticulos,
} from '../servicios/contenido';
import { actualizarInstrumento, actualizarPrecios, catalogoCompleto, crearInstrumento } from '../servicios/mercado';
import { requiereAdmin, requiereSesion } from '../sesion';
import { idParam, validar } from '../validacion';

const tema = z.enum([
  'CONCEPTOS_BASICOS',
  'RIESGO',
  'RENDIMIENTO',
  'DIVERSIFICACION',
  'INTERES_COMPUESTO',
  'CRIPTOMONEDAS',
]);

export const rutasContenido = new Hono<Entorno>()
  .get(
    '/',
    validar('query', z.object({ tema: tema.optional(), q: z.string().trim().max(80).optional() })),
    async (c) => {
      const { tema: t, q } = c.req.valid('query');
      return c.json(await listarArticulos(c.env.DB, { tema: t, texto: q || undefined }));
    },
  )
  .get('/:slug', async (c) => c.json(await articuloPublicado(c.env.DB, c.req.param('slug'))));

const esquemaArticulo = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio.').max(150),
  tema,
  resumen: z.string().trim().max(300).default(''),
  cuerpo: z.string().trim().min(1, 'El cuerpo del artículo es obligatorio.').max(50_000),
  estado: z.enum(['BORRADOR', 'PUBLICADO']),
});

export function crearRutasAdmin(proveedor: ProveedorDatosMercado) {
  return (
    new Hono<Entorno>()
      .use(requiereSesion, requiereAdmin)
      .get('/instrumentos', async (c) => c.json(await catalogoCompleto(c.env.DB)))
      // RF-17: actualización manual de precios (además del cron), útil ante fallas o para verificar el proveedor.
      .post('/precios/actualizacion', async (c) => c.json(await actualizarPrecios(c.env.DB, proveedor, new Date())))
      .post(
        '/instrumentos',
        validar(
          'json',
          z.object({
            simbolo: z.string().trim().min(1, 'El símbolo es obligatorio.').max(20),
            simboloProveedor: z.string().trim().max(30).nullish(),
            nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
            tipo: z.enum(['ACCION', 'ETF', 'CRIPTO']),
            descripcion: z.string().trim().max(300).nullish(),
            activo: z.boolean().optional(),
          }),
        ),
        async (c) => c.json(await crearInstrumento(c.env.DB, proveedor, c.req.valid('json')), 201),
      )
      .patch(
        '/instrumentos/:id',
        validar('param', idParam),
        validar(
          'json',
          z.object({
            nombre: z.string().trim().min(1).max(100).optional(),
            descripcion: z.string().trim().max(300).nullish(),
            activo: z.boolean().optional(),
          }),
        ),
        async (c) => c.json(await actualizarInstrumento(c.env.DB, c.req.valid('param').id, c.req.valid('json'))),
      )
      .get('/contenido', async (c) => c.json(await listarArticulos(c.env.DB, { incluirBorradores: true })))
      .get('/contenido/:id', validar('param', idParam), async (c) =>
        c.json(await articuloPorId(c.env.DB, c.req.valid('param').id)),
      )
      .post('/contenido', validar('json', esquemaArticulo), async (c) =>
        c.json(await crearArticulo(c.env.DB, c.get('usuario').id, c.req.valid('json')), 201),
      )
      .put('/contenido/:id', validar('param', idParam), validar('json', esquemaArticulo), async (c) =>
        c.json(await actualizarArticulo(c.env.DB, c.req.valid('param').id, c.req.valid('json'))),
      )
      .delete('/contenido/:id', validar('param', idParam), async (c) => {
        await eliminarArticulo(c.env.DB, c.req.valid('param').id);
        return c.json({ mensaje: 'Artículo eliminado.' });
      })
  );
}
