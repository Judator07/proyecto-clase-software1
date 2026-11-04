import { env } from 'cloudflare:workers';
import { expect } from 'vitest';
import { crearApp } from '../../src/server/app';
import type { Cotizacion, ProveedorDatosMercado } from '../../src/server/datos/proveedor';

/** Proveedor de mercado falso: precio 100 para cualquier símbolo, salvo los que se marquen como fallidos. */
export class ProveedorFalso implements ProveedorDatosMercado {
  readonly nombre = 'Proveedor falso';
  fallidos = new Set<string>(['NOEXISTE']);
  precio = 100;

  async obtenerCotizacion(simbolo: string): Promise<Cotizacion> {
    if (this.fallidos.has(simbolo)) throw new Error('HTTP 404');
    return {
      precio: this.precio,
      fechaHora: new Date().toISOString(),
      cierreAnterior: this.precio - 1,
      cierres: [
        { fecha: '2026-11-03', precio: this.precio - 1 },
        { fecha: '2026-11-04', precio: this.precio },
      ],
    };
  }
}

export const proveedor = new ProveedorFalso();
export const app = crearApp(proveedor);

export interface Respuesta<T = any> {
  estado: number;
  datos: T;
}

/** Cliente HTTP que conserva la cookie de sesión entre solicitudes, como un navegador. */
export class Cliente {
  cookie = '';

  async solicitar<T = any>(metodo: string, ruta: string, cuerpo?: unknown): Promise<Respuesta<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cookie) headers.Cookie = this.cookie;
    const r = await app.request(
      `/api${ruta}`,
      { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) },
      env,
    );
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) {
      const valor = /sesion=([^;]*)/.exec(setCookie)?.[1];
      this.cookie = valor ? `sesion=${valor}` : '';
    }
    return { estado: r.status, datos: (await r.json().catch(() => null)) as T };
  }

  get<T = any>(ruta: string) {
    return this.solicitar<T>('GET', ruta);
  }
  post<T = any>(ruta: string, cuerpo: unknown = {}) {
    return this.solicitar<T>('POST', ruta, cuerpo);
  }
  patch<T = any>(ruta: string, cuerpo: unknown) {
    return this.solicitar<T>('PATCH', ruta, cuerpo);
  }
  put<T = any>(ruta: string, cuerpo: unknown) {
    return this.solicitar<T>('PUT', ruta, cuerpo);
  }
  del<T = any>(ruta: string) {
    return this.solicitar<T>('DELETE', ruta);
  }
}

export const CONTRASENA = 'Segura123';

export async function registrar(correo = `u${crypto.randomUUID().slice(0, 8)}@prueba.co`): Promise<Cliente> {
  const c = new Cliente();
  const r = await c.post('/auth/registro', {
    nombre: 'Ana Prueba',
    correo,
    contrasena: CONTRASENA,
    confirmacion: CONTRASENA,
    aceptaPolitica: true,
  });
  expect(r.estado).toBe(201);
  return c;
}

export async function registrarConPortafolio(nombre = 'Principal'): Promise<{ c: Cliente; portafolioId: number }> {
  const c = await registrar();
  const r = await c.post('/portafolios', { nombre });
  expect(r.estado).toBe(201);
  return { c, portafolioId: r.datos.id };
}

export async function fijarPrecio(simbolo: string, precio: number) {
  await env.DB.prepare('UPDATE instrumento SET precio_actual = ? WHERE simbolo = ?').bind(precio, simbolo).run();
}

export async function usuarioIdDe(c: Cliente): Promise<number> {
  return (await c.get('/auth/sesion')).datos.usuario.id;
}

export async function fijarSaldo(c: Cliente, centavos: number) {
  await env.DB.prepare('UPDATE usuario SET saldo_centavos = ? WHERE id = ?')
    .bind(centavos, await usuarioIdDe(c))
    .run();
}

/** Precios deterministas usados por los criterios de aceptación del SRS (AAPL 150, BTC 60.000…). */
export async function restablecerPrecios() {
  const ahora = new Date().toISOString();
  const precios: Record<string, number> = { AAPL: 150, MSFT: 400, SPY: 500, BTC: 60_000, ETH: 3_000 };
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE instrumento SET precio_actual = 100, precio_cierre_anterior = 100, fecha_actualizacion = ?, estado_precio = 'ACTUALIZADO' WHERE tipo <> 'AHORRO'",
    ).bind(ahora),
    ...Object.entries(precios).map(([simbolo, precio]) =>
      env.DB.prepare('UPDATE instrumento SET precio_actual = ?, precio_cierre_anterior = ? WHERE simbolo = ?').bind(
        precio,
        precio,
        simbolo,
      ),
    ),
  ]);
}
