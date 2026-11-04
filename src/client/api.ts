/** Cliente HTTP de la API REST. La sesión viaja en una cookie HttpOnly; nunca se maneja desde JavaScript. */
import { useCallback, useEffect, useState } from 'react';
import type { ErrorApi } from '../compartido/tipos';

export class ErrorCliente extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
    public readonly campo?: string,
  ) {
    super(mensaje);
  }
}

let alExpirarSesion: (() => void) | null = null;

/** Registra la acción que se ejecuta cuando la API responde 401 (sesión inexistente o expirada). */
export function registrarAlExpirarSesion(fn: () => void) {
  alExpirarSesion = fn;
}

async function solicitar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorCliente(0, 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
  }
  const datos = (await respuesta.json().catch(() => null)) as (T & ErrorApi) | null;
  if (!respuesta.ok) {
    if (respuesta.status === 401 && ruta !== '/auth/sesion' && ruta !== '/auth/ingreso') alExpirarSesion?.();
    const campo = typeof datos?.detalles?.campo === 'string' ? datos.detalles.campo : undefined;
    throw new ErrorCliente(respuesta.status, datos?.error ?? 'Ocurrió un error inesperado.', campo);
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => solicitar<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo: unknown = {}) => solicitar<T>('POST', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo: unknown) => solicitar<T>('PATCH', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown) => solicitar<T>('PUT', ruta, cuerpo),
  del: <T>(ruta: string) => solicitar<T>('DELETE', ruta),
};

/** Carga datos de la API para una pantalla: estado de carga, error y recarga. `null` no consulta. */
export function useApi<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(ruta !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (ruta === null) return;
    let vigente = true;
    setCargando(true);
    api
      .get<T>(ruta)
      .then((d) => {
        if (vigente) {
          setDatos(d);
          setError(null);
        }
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [ruta, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, error, cargando, recargar };
}
