import type { UsuarioDto } from '../compartido/tipos';

/** Tipo del contexto de Hono: bindings de wrangler.jsonc (worker-configuration.d.ts) y el usuario de la sesión. */
export type Entorno = {
  Bindings: Env;
  Variables: { usuario: UsuarioDto };
};
