/** Validación de entradas con Zod. Los errores se devuelven en español con el campo que hay que corregir. */
import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import { z } from 'zod';
import { ErrorAplicacion } from './errores';

z.config(z.locales.es());

export function validar<T extends z.ZodType, K extends keyof ValidationTargets>(objetivo: K, esquema: T) {
  return zValidator(objetivo, esquema, (resultado) => {
    if (!resultado.success) {
      const problema = resultado.error.issues[0];
      const campo = problema?.path.join('.') || undefined;
      throw new ErrorAplicacion(400, problema?.message ?? 'Datos inválidos.', campo ? { campo } : undefined);
    }
  });
}

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const rangoQuery = z.object({ rango: z.enum(['1S', '1M', '6M', '1A', '5A']).default('1M') });
