/** Se ejecuta antes de cada archivo de prueba: aplica las migraciones y fija precios deterministas. */
import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { restablecerPrecios } from './ayudas';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await restablecerPrecios();
