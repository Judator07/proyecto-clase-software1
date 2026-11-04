/** Rutas de autenticación (RF-01, RF-02) y perfil (RF-03, RF-04, RF-05). */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Entorno } from '../entorno';
import { ErrorAplicacion } from '../errores';
import {
  actualizarPerfil,
  autenticar,
  obtenerPerfil,
  registrarUsuario,
  reiniciarPorBancarrota,
} from '../servicios/cuentas';
import { getCookie } from 'hono/cookie';
import { sha256 } from '../seguridad';
import { cerrarSesion, COOKIE_SESION, crearSesion, requiereSesion } from '../sesion';
import { validar } from '../validacion';

const iteraciones = (env: Env) => Number(env.PBKDF2_ITERACIONES) || 100_000;

const esquemaRegistro = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
    correo: z.email('El correo no tiene un formato válido.').max(254),
    contrasena: z.string().min(1, 'La contraseña es obligatoria.').max(128),
    confirmacion: z.string(),
    // RNF-07 (Ley 1581 de 2012): autorización expresa para el tratamiento de datos.
    aceptaPolitica: z.literal(true, 'Debes aceptar la política de tratamiento de datos para registrarte.'),
  })
  .refine((d) => d.contrasena === d.confirmacion, {
    message: 'La contraseña y su confirmación no coinciden.',
    path: ['confirmacion'],
  });

export const rutasAutenticacion = new Hono<Entorno>()
  .post('/registro', validar('json', esquemaRegistro), async (c) => {
    const datos = c.req.valid('json');
    const id = await registrarUsuario(c.env.DB, iteraciones(c.env), datos);
    await crearSesion(c, id);
    return c.json(
      { usuario: { id, nombre: datos.nombre, correo: datos.correo.toLowerCase(), rol: 'INVERSIONISTA' } },
      201,
    );
  })
  .post(
    '/ingreso',
    validar(
      'json',
      z.object({
        correo: z.string().trim().min(1, 'Ingresa tu correo.'),
        contrasena: z.string().min(1, 'Ingresa tu contraseña.'),
      }),
    ),
    async (c) => {
      const { correo, contrasena } = c.req.valid('json');
      const u = await autenticar(c.env.DB, correo, contrasena, iteraciones(c.env));
      await crearSesion(c, u.id);
      return c.json({ usuario: { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol } });
    },
  )
  .post('/salida', async (c) => {
    await cerrarSesion(c);
    return c.json({ mensaje: 'Sesión cerrada.' });
  })
  .get('/sesion', requiereSesion, (c) => c.json({ usuario: c.get('usuario') }));

export const rutasPerfil = new Hono<Entorno>()
  .use(requiereSesion)
  .get('/', async (c) => c.json(await obtenerPerfil(c.env.DB, c.get('usuario').id)))
  .patch(
    '/',
    validar(
      'json',
      z.object({
        nombre: z.string().trim().min(1, 'El nombre no puede quedar vacío.').max(100).optional(),
        contrasenaActual: z.string().min(1, 'Ingresa tu contraseña actual.'),
        nuevaContrasena: z.string().max(128).optional(),
      }),
    ),
    async (c) => {
      const datos = c.req.valid('json');
      if (datos.nombre === undefined && !datos.nuevaContrasena) {
        throw new ErrorAplicacion(400, 'No hay cambios para guardar.');
      }
      const token = getCookie(c, COOKIE_SESION);
      await actualizarPerfil(
        c.env.DB,
        iteraciones(c.env),
        c.get('usuario').id,
        datos,
        token ? await sha256(token) : undefined,
      );
      return c.json(await obtenerPerfil(c.env.DB, c.get('usuario').id));
    },
  )
  .post('/reinicio', async (c) => {
    const perfil = await reiniciarPorBancarrota(c.env.DB, c.get('usuario').id);
    return c.json({
      perfil,
      mensaje:
        'Tu cuenta se reinició con USD 10.000,00. Revisa en el centro de aprendizaje cómo gestionar el riesgo y diversificar para no repetir la bancarrota.',
    });
  });
