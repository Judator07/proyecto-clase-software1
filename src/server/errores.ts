import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Error de negocio o de validación que la API devuelve como `{ error, detalles }` con su código HTTP. */
export class ErrorAplicacion extends Error {
  constructor(
    public readonly estado: ContentfulStatusCode,
    mensaje: string,
    public readonly detalles?: Record<string, unknown>,
  ) {
    super(mensaje);
  }
}

export const noEncontrado = (que: string) => new ErrorAplicacion(404, `${que} no encontrado.`);

/**
 * Indica si un error de D1 proviene de una restricción de integridad (CHECK, UNIQUE o TRIGGER).
 * Las invariantes críticas (RNF-10) viven en la base de datos; aquí se traducen a mensajes de negocio.
 */
export function esViolacionRestriccion(error: unknown, contiene?: string): boolean {
  const mensaje = String((error as Error)?.message ?? error);
  const esRestriccion = /constraint failed|SQLITE_CONSTRAINT|LIMITE_PORTAFOLIOS/i.test(mensaje);
  return esRestriccion && (contiene === undefined || mensaje.includes(contiene));
}
