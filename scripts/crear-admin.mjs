#!/usr/bin/env node
/**
 * Genera la sentencia SQL para crear (o promover) una cuenta con rol ADMINISTRADOR.
 * La contraseña se genera al azar y solo se muestra en la terminal; a la base de datos llega su hash
 * PBKDF2-SHA256 con sal, igual que en el registro (RNF-05). No guarde la salida en el repositorio.
 *
 * Uso:   node scripts/crear-admin.mjs <correo> "<nombre>"
 * Luego: npx wrangler d1 execute DB --remote --command "<SQL>"   (o por la consola de D1)
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const [correo, nombre = 'Administrador'] = process.argv.slice(2);
if (!correo) {
  console.error('Uso: node scripts/crear-admin.mjs <correo> "<nombre>"');
  process.exit(1);
}
const ITERACIONES = 100_000;
const contrasena = `${randomBytes(9).toString('base64url')}9a`;
const sal = randomBytes(16);
const hash = pbkdf2Sync(contrasena, sal, ITERACIONES, 32, 'sha256').toString('base64');
const texto = (v) => `'${String(v).replaceAll("'", "''")}'`;

console.log(`Contraseña generada: ${contrasena}\n`);
console.log(
  `INSERT INTO usuario (nombre, correo, hash_contrasena, sal, iteraciones, rol, acepto_politica_en) VALUES (` +
    `${texto(nombre)}, ${texto(correo.toLowerCase())}, ${texto(hash)}, ${texto(sal.toString('base64'))}, ${ITERACIONES}, ` +
    `'ADMINISTRADOR', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ` +
    `ON CONFLICT (correo) DO UPDATE SET rol = 'ADMINISTRADOR', hash_contrasena = excluded.hash_contrasena, ` +
    `sal = excluded.sal, iteraciones = excluded.iteraciones, intentos_fallidos = 0, bloqueado_hasta = NULL;`,
);
