/** Sesiones y control de acceso (RF-02, RNF-06). */
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { Rol, UsuarioDto } from '../compartido/tipos';
import type { Entorno } from './entorno';
import { ErrorAplicacion } from './errores';
import { generarToken, sha256 } from './seguridad';

export const COOKIE_SESION = 'sesion';
/** RNF-06: la sesión expira tras 30 minutos de inactividad. */
export const DURACION_SESION_MS = 30 * 60 * 1000;
/** La expiración deslizante se renueva como máximo una vez por minuto, para ahorrar escrituras en D1. */
const MARGEN_RENOVACION_MS = 60 * 1000;

export async function crearSesion(c: Context<Entorno>, usuarioId: number): Promise<void> {
  const token = generarToken();
  const expira = new Date(Date.now() + DURACION_SESION_MS).toISOString();
  await c.env.DB.prepare('INSERT INTO sesion (token_hash, usuario_id, expira_en) VALUES (?, ?, ?)')
    .bind(await sha256(token), usuarioId, expira)
    .run();
  // Cookie de sesión del navegador: HttpOnly (no accesible desde JS), Secure (solo HTTPS) y SameSite=Lax (CSRF).
  setCookie(c, COOKIE_SESION, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
}

export async function cerrarSesion(c: Context<Entorno>): Promise<void> {
  const token = getCookie(c, COOKIE_SESION);
  if (token)
    await c.env.DB.prepare('DELETE FROM sesion WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  deleteCookie(c, COOKIE_SESION, { path: '/', secure: true });
}

interface FilaSesion {
  expira_en: string;
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

/**
 * Usuario de la sesión activa o null. Aplica la expiración por inactividad (RNF-06) y renueva la sesión
 * de forma deslizante.
 */
export async function usuarioDeSesion(c: Context<Entorno>): Promise<UsuarioDto | null> {
  const token = getCookie(c, COOKIE_SESION);
  if (!token) return null;
  const hash = await sha256(token);
  const fila = await c.env.DB.prepare(
    `SELECT s.expira_en, u.id, u.nombre, u.correo, u.rol
       FROM sesion s JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first<FilaSesion>();
  const ahora = Date.now();
  if (!fila || Date.parse(fila.expira_en) <= ahora) {
    if (fila) await c.env.DB.prepare('DELETE FROM sesion WHERE token_hash = ?').bind(hash).run();
    deleteCookie(c, COOKIE_SESION, { path: '/', secure: true });
    if (fila) throw new ErrorAplicacion(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    return null;
  }
  if (Date.parse(fila.expira_en) - ahora < DURACION_SESION_MS - MARGEN_RENOVACION_MS) {
    // La renovación es de mejor esfuerzo: si la escritura falla (p. ej. cuota diaria de D1 agotada),
    // las consultas de solo lectura siguen funcionando.
    await c.env.DB.prepare('UPDATE sesion SET expira_en = ? WHERE token_hash = ?')
      .bind(new Date(ahora + DURACION_SESION_MS).toISOString(), hash)
      .run()
      .catch((e: unknown) => console.error('No se pudo renovar la sesión', String(e)));
  }
  return { id: fila.id, nombre: fila.nombre, correo: fila.correo, rol: fila.rol };
}

/** Exige una sesión activa y deja el usuario en `c.get('usuario')`. */
export const requiereSesion = createMiddleware<Entorno>(async (c, next) => {
  const usuario = await usuarioDeSesion(c);
  if (!usuario) throw new ErrorAplicacion(401, 'Debes iniciar sesión para continuar.');
  c.set('usuario', usuario);
  await next();
});

/** RNF-06: las funciones de administración requieren el rol Administrador. */
export const requiereAdmin = createMiddleware<Entorno>(async (c, next) => {
  if (c.get('usuario')?.rol !== 'ADMINISTRADOR') {
    throw new ErrorAplicacion(403, 'Acceso denegado: esta función requiere el rol Administrador.');
  }
  await next();
});
