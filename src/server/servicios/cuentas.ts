/** Registro, sesión y perfil del usuario (RF-01 a RF-05). */
import type { PerfilDto } from '../../compartido/tipos';
import { SALDO_INICIAL_CENTAVOS } from '../../dominio/dinero';
import { estaEnBancarrota, validarContrasena } from '../../dominio/reglas';
import {
  stmtDepositosDeUsuario,
  stmtPortafoliosDeUsuario,
  stmtPosicionesDeUsuario,
  type FilaDeposito,
  type FilaPortafolio,
  type FilaPosicion,
} from '../datos/portafolios';
import { ErrorAplicacion, esViolacionRestriccion } from '../errores';
import { derivarHash, generarSal, verificarContrasena } from '../seguridad';
import { resumenVacio, valorarFilas, valorInvertidoTotal } from './valoracion';

export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 15;

interface FilaUsuario {
  id: number;
  nombre: string;
  correo: string;
  hash_contrasena: string;
  sal: string;
  iteraciones: number;
  rol: 'INVERSIONISTA' | 'ADMINISTRADOR';
  saldo_centavos: number;
  contador_bancarrotas: number;
  fecha_ultimo_reinicio: string | null;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  creado_en: string;
}

function buscarPorCorreo(db: D1Database, correo: string) {
  return db.prepare('SELECT * FROM usuario WHERE correo = ?').bind(correo.trim().toLowerCase()).first<FilaUsuario>();
}

function buscarPorId(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM usuario WHERE id = ?').bind(id).first<FilaUsuario>();
}

function exigirContrasenaValida(contrasena: string) {
  const errores = validarContrasena(contrasena);
  if (errores.length) {
    throw new ErrorAplicacion(400, `La contraseña no cumple la política: ${errores.join(' ')}`, {
      campo: 'contrasena',
    });
  }
}

/** RF-01: crea la cuenta con el saldo inicial ficticio de RN-01. */
export async function registrarUsuario(
  db: D1Database,
  iteraciones: number,
  datos: { nombre: string; correo: string; contrasena: string },
): Promise<number> {
  exigirContrasenaValida(datos.contrasena);
  const correo = datos.correo.trim().toLowerCase();
  if (await buscarPorCorreo(db, correo)) {
    throw new ErrorAplicacion(409, 'El correo ya está asociado a una cuenta.', { campo: 'correo' });
  }
  const sal = generarSal();
  const hash = await derivarHash(datos.contrasena, sal, iteraciones);
  try {
    const fila = await db
      .prepare(
        `INSERT INTO usuario (nombre, correo, hash_contrasena, sal, iteraciones, saldo_centavos, acepto_politica_en)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(datos.nombre.trim(), correo, hash, sal, iteraciones, SALDO_INICIAL_CENTAVOS, new Date().toISOString())
      .first<{ id: number }>();
    return fila!.id;
  } catch (e) {
    // Dos registros simultáneos con el mismo correo: la restricción UNIQUE decide.
    if (String(e).includes('UNIQUE'))
      throw new ErrorAplicacion(409, 'El correo ya está asociado a una cuenta.', { campo: 'correo' });
    throw e;
  }
}

/** Sal fija solo para igualar el tiempo de respuesta cuando el correo no existe (evita enumerar cuentas). */
const SAL_FICTICIA = 'AAAAAAAAAAAAAAAAAAAAAA==';

/** RF-02: autentica con correo y contraseña; bloquea 15 minutos tras 5 intentos fallidos consecutivos. */
export async function autenticar(
  db: D1Database,
  correo: string,
  contrasena: string,
  iteraciones: number,
): Promise<FilaUsuario> {
  const usuario = await buscarPorCorreo(db, correo);
  const ahora = Date.now();
  const generico = new ErrorAplicacion(401, 'Correo o contraseña incorrectos.');
  if (!usuario) {
    await derivarHash(contrasena, SAL_FICTICIA, iteraciones);
    throw generico;
  }
  if (usuario.bloqueado_hasta && Date.parse(usuario.bloqueado_hasta) > ahora) {
    throw new ErrorAplicacion(
      423,
      `La cuenta está bloqueada temporalmente por ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Intenta de nuevo en unos minutos.`,
    );
  }
  if (await verificarContrasena(contrasena, usuario.hash_contrasena, usuario.sal, usuario.iteraciones)) {
    if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta) {
      await db
        .prepare('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?')
        .bind(usuario.id)
        .run();
    }
    return usuario;
  }
  // Incremento atómico: solicitudes simultáneas no pueden eludir el bloqueo.
  const hasta = new Date(ahora + MINUTOS_BLOQUEO * 60_000).toISOString();
  const fila = await db
    .prepare(
      `UPDATE usuario
          SET bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= ? THEN ? ELSE bloqueado_hasta END,
              intentos_fallidos = CASE WHEN intentos_fallidos + 1 >= ? THEN 0 ELSE intentos_fallidos + 1 END
        WHERE id = ? RETURNING bloqueado_hasta`,
    )
    .bind(MAX_INTENTOS_FALLIDOS, hasta, MAX_INTENTOS_FALLIDOS, usuario.id)
    .first<{ bloqueado_hasta: string | null }>();
  if (fila?.bloqueado_hasta && Date.parse(fila.bloqueado_hasta) > ahora) {
    throw new ErrorAplicacion(
      423,
      `La cuenta se bloqueó durante ${MINUTOS_BLOQUEO} minutos por ${MAX_INTENTOS_FALLIDOS} intentos fallidos consecutivos.`,
    );
  }
  throw generico;
}

/** RF-03: perfil con saldo, valor invertido, patrimonio, bancarrotas y resumen de portafolios. */
export async function obtenerPerfil(db: D1Database, usuarioId: number): Promise<PerfilDto> {
  // Una sola ida a D1 con las cuatro lecturas (RNF-01/RNF-02: D1 atiende una consulta a la vez).
  const [u, pf, pos, dep] = await db.batch<unknown>([
    db.prepare('SELECT * FROM usuario WHERE id = ?').bind(usuarioId),
    stmtPortafoliosDeUsuario(db, usuarioId),
    stmtPosicionesDeUsuario(db, usuarioId),
    stmtDepositosDeUsuario(db, usuarioId),
  ]);
  const usuario = u.results[0] as FilaUsuario | undefined;
  const portafolios = pf.results as FilaPortafolio[];
  const valoraciones = valorarFilas(pos.results as FilaPosicion[], dep.results as FilaDeposito[], new Date());
  if (!usuario) throw new ErrorAplicacion(401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
  const invertido = valorInvertidoTotal(valoraciones);
  const patrimonio = usuario.saldo_centavos + invertido;
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    saldoCentavos: usuario.saldo_centavos,
    valorInvertidoCentavos: invertido,
    patrimonioCentavos: patrimonio,
    contadorBancarrotas: usuario.contador_bancarrotas,
    enBancarrota: estaEnBancarrota(patrimonio),
    fechaUltimoReinicio: usuario.fecha_ultimo_reinicio,
    creadoEn: usuario.creado_en,
    portafolios: portafolios.map((p) => {
      const v = valoraciones.get(p.id) ?? resumenVacio();
      return {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        creadoEn: p.creado_en,
        valorCentavos: v.resumen.valorTotalCentavos,
        capitalInvertidoCentavos: v.resumen.capitalInvertidoCentavos,
        rendimientoPct: v.resumen.rendimientoPct,
      };
    }),
  };
}

/** RF-04: actualiza nombre y/o contraseña, previa verificación de la contraseña actual. */
export async function actualizarPerfil(
  db: D1Database,
  iteraciones: number,
  usuarioId: number,
  datos: { nombre?: string; contrasenaActual: string; nuevaContrasena?: string },
  tokenHashActual?: string,
): Promise<void> {
  const usuario = await buscarPorId(db, usuarioId);
  if (!usuario) throw new ErrorAplicacion(401, 'Tu sesión ya no es válida.');
  if (!(await verificarContrasena(datos.contrasenaActual, usuario.hash_contrasena, usuario.sal, usuario.iteraciones))) {
    throw new ErrorAplicacion(400, 'La contraseña actual es incorrecta. No se guardaron los cambios.', {
      campo: 'contrasenaActual',
    });
  }
  const cambios: D1PreparedStatement[] = [];
  if (datos.nombre !== undefined && datos.nombre.trim() !== usuario.nombre) {
    cambios.push(db.prepare('UPDATE usuario SET nombre = ? WHERE id = ?').bind(datos.nombre.trim(), usuarioId));
  }
  if (datos.nuevaContrasena) {
    exigirContrasenaValida(datos.nuevaContrasena);
    const sal = generarSal();
    const hash = await derivarHash(datos.nuevaContrasena, sal, iteraciones);
    cambios.push(
      db
        .prepare('UPDATE usuario SET hash_contrasena = ?, sal = ?, iteraciones = ? WHERE id = ?')
        .bind(hash, sal, iteraciones, usuarioId),
    );
    // Al cambiar la contraseña se cierran las demás sesiones abiertas (RNF-06).
    cambios.push(
      db.prepare('DELETE FROM sesion WHERE usuario_id = ? AND token_hash <> ?').bind(usuarioId, tokenHashActual ?? ''),
    );
  }
  if (cambios.length) await db.batch(cambios);
}

/**
 * RF-05 / RN-09: reinicio por bancarrota simulada. Cierra posiciones y depósitos sin abonar su valor,
 * restablece el saldo inicial y suma uno al contador. Conserva los portafolios (vacíos) y el historial.
 */
export async function reiniciarPorBancarrota(db: D1Database, usuarioId: number): Promise<PerfilDto> {
  const perfil = await obtenerPerfil(db, usuarioId);
  if (!perfil.enBancarrota) {
    throw new ErrorAplicacion(409, 'Tu patrimonio es igual o mayor que USD 100,00: no puedes reiniciar la cuenta.');
  }
  const fila = await buscarPorId(db, usuarioId);
  const ahora = new Date().toISOString();
  const deMisPortafolios = 'portafolio_id IN (SELECT id FROM portafolio WHERE usuario_id = ?)';
  // Si otra solicitud cambió el saldo o ya reinició la cuenta, el saldo -1 viola el CHECK y nada se aplica.
  const guarda = db
    .prepare(
      `UPDATE usuario SET saldo_centavos = CASE WHEN contador_bancarrotas = ? AND saldo_centavos = ? THEN saldo_centavos ELSE -1 END
        WHERE id = ?`,
    )
    .bind(fila!.contador_bancarrotas, fila!.saldo_centavos, usuarioId);
  try {
    await db.batch([
      guarda,
      db.prepare(`DELETE FROM posicion WHERE ${deMisPortafolios}`).bind(usuarioId),
      db
        .prepare(
          `UPDATE deposito_ahorro SET estado = 'CERRADO', fecha_cierre = ? WHERE estado = 'ACTIVO' AND ${deMisPortafolios}`,
        )
        .bind(ahora, usuarioId),
      db
        .prepare(
          'UPDATE usuario SET saldo_centavos = ?, contador_bancarrotas = contador_bancarrotas + 1, fecha_ultimo_reinicio = ? WHERE id = ?',
        )
        .bind(SALDO_INICIAL_CENTAVOS, ahora, usuarioId),
    ]);
  } catch (e) {
    if (esViolacionRestriccion(e))
      throw new ErrorAplicacion(409, 'Tu cuenta cambió mientras se reiniciaba. Intenta de nuevo.');
    throw e;
  }
  return obtenerPerfil(db, usuarioId);
}

export async function saldoDe(db: D1Database, usuarioId: number): Promise<number> {
  const fila = await db
    .prepare('SELECT saldo_centavos FROM usuario WHERE id = ?')
    .bind(usuarioId)
    .first<{ saldo_centavos: number }>();
  return fila?.saldo_centavos ?? 0;
}

/** RN-09 + SRS v1.1: en bancarrota no se permiten compras ni depósitos. Solo se valora si el saldo es bajo. */
export async function exigirNoBancarrota(db: D1Database, usuarioId: number, saldo: number): Promise<void> {
  if (!estaEnBancarrota(saldo)) return;
  const perfil = await obtenerPerfil(db, usuarioId);
  if (perfil.enBancarrota) {
    throw new ErrorAplicacion(
      409,
      'Tu cuenta está en bancarrota simulada (patrimonio menor que USD 100,00). Reiníciala desde tu perfil para seguir invirtiendo.',
    );
  }
}
