/** Rutas de catálogo, portafolios, órdenes, ahorro e historial (RF-06 a RF-16). */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Entorno } from '../entorno';
import {
  cancelarOrden,
  cotizarOrden,
  ejecutarOrden,
  registrarDeposito,
  retirarDeposito,
} from '../servicios/operaciones';
import { catalogo, detalleInstrumento, historicoInstrumento } from '../servicios/mercado';
import {
  crearPortafolio,
  detallePortafolio,
  eliminarPortafolio,
  listarResumenes,
  renombrarPortafolio,
  valoracionPortafolio,
} from '../servicios/portafolios';
import { listarTransacciones } from '../datos/transacciones';
import { requiereSesion } from '../sesion';
import { idParam, rangoQuery, validar } from '../validacion';

const tipoInstrumento = z.enum(['ACCION', 'ETF', 'CRIPTO', 'AHORRO']);

export const rutasInstrumentos = new Hono<Entorno>()
  .use(requiereSesion)
  .get(
    '/',
    validar('query', z.object({ q: z.string().trim().max(50).optional(), tipo: tipoInstrumento.optional() })),
    async (c) => {
      const { q, tipo } = c.req.valid('query');
      return c.json(await catalogo(c.env.DB, { texto: q || undefined, tipo }));
    },
  )
  .get('/:simbolo', async (c) => c.json(await detalleInstrumento(c.env.DB, c.req.param('simbolo'))))
  .get('/:simbolo/historico', validar('query', rangoQuery), async (c) =>
    c.json(await historicoInstrumento(c.env.DB, c.req.param('simbolo'), c.req.valid('query').rango)),
  );

const esquemaPortafolio = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre del portafolio es obligatorio.')
    .max(50, 'El nombre no puede superar 50 caracteres.'),
  descripcion: z.string().trim().max(200, 'La descripción no puede superar 200 caracteres.').nullish(),
});

export const rutasPortafolios = new Hono<Entorno>()
  .use(requiereSesion)
  .get('/', async (c) => c.json(await listarResumenes(c.env.DB, c.get('usuario').id)))
  .post('/', validar('json', esquemaPortafolio), async (c) =>
    c.json(await crearPortafolio(c.env.DB, c.get('usuario').id, c.req.valid('json')), 201),
  )
  .get('/:id', validar('param', idParam), async (c) =>
    c.json(await detallePortafolio(c.env.DB, c.get('usuario').id, c.req.valid('param').id)),
  )
  .patch('/:id', validar('param', idParam), validar('json', esquemaPortafolio.pick({ nombre: true })), async (c) => {
    await renombrarPortafolio(c.env.DB, c.get('usuario').id, c.req.valid('param').id, c.req.valid('json').nombre);
    return c.json(await detallePortafolio(c.env.DB, c.get('usuario').id, c.req.valid('param').id));
  })
  .delete('/:id', validar('param', idParam), async (c) =>
    c.json(await eliminarPortafolio(c.env.DB, c.get('usuario').id, c.req.valid('param').id)),
  )
  .get('/:id/valoracion', validar('param', idParam), validar('query', rangoQuery), async (c) =>
    c.json(
      await valoracionPortafolio(c.env.DB, c.get('usuario').id, c.req.valid('param').id, c.req.valid('query').rango),
    ),
  );

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.');

export const rutasTransacciones = new Hono<Entorno>().use(requiereSesion).get(
  '/',
  validar(
    'query',
    z.object({
      portafolioId: z.coerce.number().int().positive().optional(),
      desde: fecha.optional(),
      hasta: fecha.optional(),
      tipo: z.enum(['COMPRA', 'VENTA', 'DEPOSITO', 'RETIRO']).optional(),
      simbolo: z.string().trim().max(20).optional(),
    }),
  ),
  async (c) => c.json(await listarTransacciones(c.env.DB, c.get('usuario').id, c.req.valid('query'))),
);

const esquemaOrden = z.object({
  portafolioId: z.number().int().positive('Selecciona un portafolio.'),
  simbolo: z.string().trim().min(1).max(20),
  tipo: z.enum(['COMPRA', 'VENTA']),
  cantidad: z.number('La cantidad debe ser un número.'),
  precioCotizado: z.number().positive().optional(),
});

export const rutasOrdenes = new Hono<Entorno>()
  .use(requiereSesion)
  .post('/cotizacion', validar('json', esquemaOrden), async (c) =>
    c.json(await cotizarOrden(c.env.DB, c.get('usuario').id, c.req.valid('json'))),
  )
  .post('/', validar('json', esquemaOrden), async (c) =>
    c.json(await ejecutarOrden(c.env.DB, c.get('usuario').id, c.req.valid('json'))),
  )
  .post('/cancelacion', validar('json', esquemaOrden), async (c) =>
    c.json(await cancelarOrden(c.env.DB, c.get('usuario').id, c.req.valid('json'))),
  );

export const rutasAhorro = new Hono<Entorno>()
  .use(requiereSesion)
  .post(
    '/depositos',
    validar(
      'json',
      z.object({
        portafolioId: z.number().int().positive('Selecciona un portafolio.'),
        montoCentavos: z.number().int(),
        tasaAnualPct: z.number(),
        periodosPorAnio: z.union([z.literal(1), z.literal(4), z.literal(12)]),
        plazoMeses: z.number().int(),
      }),
    ),
    async (c) => c.json(await registrarDeposito(c.env.DB, c.get('usuario').id, c.req.valid('json'))),
  )
  .post('/depositos/:id/retiro', validar('param', idParam), async (c) =>
    c.json(await retirarDeposito(c.env.DB, c.get('usuario').id, c.req.valid('param').id)),
  );
