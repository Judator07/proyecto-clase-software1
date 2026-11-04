/** Gestión de portafolios: creación, detalle, rendimiento, renombrado, eliminación y valoración (RF-12 a RF-15). */
import type { DetallePortafolioDto, Rango, ResumenPortafolioDto, ValoracionDto } from '../../compartido/tipos';
import { RANGOS } from '../../compartido/tipos';
import { aCantidadE8, formatearUSD } from '../../dominio/dinero';
import { calcularEstadisticas } from '../../dominio/estadisticas';
import { fechaISOColombia, formatearFechaHora } from '../../dominio/formato';
import { gananciaRealizadaCentavos } from '../../dominio/portafolio';
import { validarNombrePortafolio } from '../../dominio/reglas';
import {
  buscarPortafolio,
  listarPortafolios,
  stmtCerrarDeposito,
  stmtsRestarPosicion,
  valoracionesDesde,
  type FilaPortafolio,
} from '../datos/portafolios';
import { gananciaRealizadaPortafolio, stmtInsertarTransaccion } from '../datos/transacciones';
import { ErrorAplicacion, esViolacionRestriccion, noEncontrado } from '../errores';
import { saldoDe } from './cuentas';
import { resumenVacio, valorarPortafoliosDeUsuario, type ValoracionPortafolio } from './valoracion';

function aResumen(p: FilaPortafolio, v: ValoracionPortafolio): ResumenPortafolioDto {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    creadoEn: p.creado_en,
    valorCentavos: v.resumen.valorTotalCentavos,
    capitalInvertidoCentavos: v.resumen.capitalInvertidoCentavos,
    rendimientoPct: v.resumen.rendimientoPct,
  };
}

/** Panel principal (IU-03): portafolios con su valor actual. */
export async function listarResumenes(db: D1Database, usuarioId: number): Promise<ResumenPortafolioDto[]> {
  const [portafolios, valoraciones] = await Promise.all([
    listarPortafolios(db, usuarioId),
    valorarPortafoliosDeUsuario(db, usuarioId),
  ]);
  return portafolios.map((p) => aResumen(p, valoraciones.get(p.id) ?? resumenVacio()));
}

function traducirErrorNombre(e: unknown): never {
  if (esViolacionRestriccion(e, 'LIMITE_PORTAFOLIOS')) {
    throw new ErrorAplicacion(409, 'Alcanzaste el límite de 10 portafolios (RN-05). Elimina uno para crear otro.');
  }
  if (esViolacionRestriccion(e, 'UNIQUE')) {
    throw new ErrorAplicacion(409, 'Ya tienes un portafolio con ese nombre.', { campo: 'nombre' });
  }
  throw e;
}

/** RF-12: crea un portafolio vacío (máximo 10 por usuario, nombres únicos: RN-05). */
export async function crearPortafolio(
  db: D1Database,
  usuarioId: number,
  datos: { nombre: string; descripcion?: string | null },
): Promise<ResumenPortafolioDto> {
  const validacion = validarNombrePortafolio(datos.nombre);
  if (!validacion.ok) throw new ErrorAplicacion(400, validacion.mensaje, { campo: 'nombre' });
  try {
    const fila = await db
      .prepare(
        'INSERT INTO portafolio (usuario_id, nombre, descripcion) VALUES (?, ?, ?) RETURNING id, usuario_id, nombre, descripcion, creado_en',
      )
      .bind(usuarioId, datos.nombre.trim(), datos.descripcion?.trim() || null)
      .first<FilaPortafolio>();
    return aResumen(fila!, resumenVacio());
  } catch (e) {
    traducirErrorNombre(e);
  }
}

async function exigirPortafolio(db: D1Database, id: number, usuarioId: number) {
  const portafolio = await buscarPortafolio(db, id, usuarioId);
  if (!portafolio) throw noEncontrado('Portafolio');
  return portafolio;
}

/** RF-14: posiciones, balance, rendimiento y ganancia realizada acumulada del portafolio. */
export async function detallePortafolio(db: D1Database, usuarioId: number, id: number): Promise<DetallePortafolioDto> {
  const portafolio = await exigirPortafolio(db, id, usuarioId);
  const [valoraciones, gananciaRealizada, saldo] = await Promise.all([
    valorarPortafoliosDeUsuario(db, usuarioId),
    gananciaRealizadaPortafolio(db, id),
    saldoDe(db, usuarioId),
  ]);
  const v = valoraciones.get(id) ?? resumenVacio();
  return {
    ...aResumen(portafolio, v),
    posiciones: v.posiciones,
    depositos: v.depositos,
    gananciaNoRealizadaCentavos: v.resumen.gananciaNoRealizadaCentavos,
    gananciaRealizadaCentavos: gananciaRealizada,
    composicion: v.resumen.composicion,
    avisoPrecios: v.precioMasAntiguoDesactualizado
      ? `Algunos precios están desactualizados por una falla del proveedor; se usa el último precio disponible (desde ${formatearFechaHora(v.precioMasAntiguoDesactualizado)}).`
      : null,
    saldoDisponibleCentavos: saldo,
  };
}

/** RF-13: renombrar. */
export async function renombrarPortafolio(
  db: D1Database,
  usuarioId: number,
  id: number,
  nombre: string,
): Promise<void> {
  await exigirPortafolio(db, id, usuarioId);
  const validacion = validarNombrePortafolio(nombre);
  if (!validacion.ok) throw new ErrorAplicacion(400, validacion.mensaje, { campo: 'nombre' });
  try {
    await db
      .prepare('UPDATE portafolio SET nombre = ? WHERE id = ? AND usuario_id = ?')
      .bind(nombre.trim(), id, usuarioId)
      .run();
  } catch (e) {
    traducirErrorNombre(e);
  }
}

/**
 * RF-13 / RN-07: elimina el portafolio liquidando sus posiciones al precio actual y sus depósitos por su
 * valor a la fecha. Todo ocurre en un único batch atómico y queda registrado en el historial.
 */
export async function eliminarPortafolio(
  db: D1Database,
  usuarioId: number,
  id: number,
): Promise<{ liquidadoCentavos: number; saldoCentavos: number; mensaje: string }> {
  await exigirPortafolio(db, id, usuarioId);
  const v = (await valorarPortafoliosDeUsuario(db, usuarioId)).get(id) ?? resumenVacio();
  const ahora = new Date().toISOString();
  const motivo = 'Liquidación por eliminación del portafolio (RN-07).';
  const sentencias: D1PreparedStatement[] = [];
  let total = 0;
  for (const p of v.posiciones) {
    const cantidadE8 = aCantidadE8(p.cantidad);
    total += p.valorCentavos;
    sentencias.push(
      ...stmtsRestarPosicion(db, id, p.instrumentoId, cantidadE8),
      stmtInsertarTransaccion(db, {
        usuarioId,
        portafolioId: id,
        instrumentoId: p.instrumentoId,
        tipo: 'VENTA',
        estado: 'EJECUTADA',
        cantidadE8,
        precioUnitario: p.precioActual,
        montoCentavos: p.valorCentavos,
        gananciaRealizadaCentavos: gananciaRealizadaCentavos(cantidadE8, p.precioActual ?? 0, p.costoPromedio),
        motivo,
      }),
    );
  }
  for (const d of v.depositos) {
    total += d.valorCentavos;
    const fila = await db
      .prepare('SELECT instrumento_id FROM deposito_ahorro WHERE id = ?')
      .bind(d.id)
      .first<{ instrumento_id: number }>();
    sentencias.push(
      stmtCerrarDeposito(db, d.id, 'RETIRADO', ahora),
      stmtInsertarTransaccion(db, {
        usuarioId,
        portafolioId: id,
        instrumentoId: fila?.instrumento_id ?? null,
        depositoId: d.id,
        tipo: 'RETIRO',
        estado: 'EJECUTADA',
        montoCentavos: d.valorCentavos,
        gananciaRealizadaCentavos: d.interesesCentavos,
        motivo,
      }),
    );
  }
  sentencias.push(
    db.prepare('DELETE FROM posicion WHERE portafolio_id = ?').bind(id),
    db.prepare('UPDATE usuario SET saldo_centavos = saldo_centavos + ? WHERE id = ?').bind(total, usuarioId),
    // Si otra solicitud ya lo eliminó, el nombre vacío viola el CHECK y se revierte todo (sin doble abono).
    db
      .prepare(
        `UPDATE portafolio SET eliminado_en = ?, nombre = CASE WHEN eliminado_en IS NULL THEN nombre ELSE '' END
          WHERE id = ? AND usuario_id = ?`,
      )
      .bind(ahora, id, usuarioId),
  );
  try {
    await db.batch(sentencias);
  } catch (e) {
    if (esViolacionRestriccion(e))
      throw new ErrorAplicacion(409, 'El portafolio cambió mientras se eliminaba. Intenta de nuevo.');
    throw e;
  }
  return {
    liquidadoCentavos: total,
    saldoCentavos: await saldoDe(db, usuarioId),
    mensaje: `Portafolio eliminado. Se abonaron ${formatearUSD(total)} a tu saldo disponible.`,
  };
}

function fechaDesde(rango: Rango, ahora: Date): string {
  return fechaISOColombia(new Date(ahora.getTime() - RANGOS[rango].dias * 86_400_000));
}

/** RF-15 / RF-16: evolución diaria del valor del portafolio, estadísticas y composición. */
export async function valoracionPortafolio(
  db: D1Database,
  usuarioId: number,
  id: number,
  rango: Rango,
): Promise<ValoracionDto> {
  await exigirPortafolio(db, id, usuarioId);
  const ahora = new Date();
  const [historico, valoraciones] = await Promise.all([
    valoracionesDesde(db, id, fechaDesde(rango, ahora)),
    valorarPortafoliosDeUsuario(db, usuarioId, ahora),
  ]);
  const actual = valoraciones.get(id) ?? resumenVacio();
  const hoy = fechaISOColombia(ahora);
  // El punto de hoy siempre refleja el valor en vivo.
  const puntos = historico.filter((p) => p.fecha !== hoy);
  puntos.push({ fecha: hoy, valor: actual.resumen.valorTotalCentavos });
  const conValor = puntos.filter((p) => p.valor > 0).map((p) => p.valor);
  return {
    rango,
    puntos,
    estadisticas: calcularEstadisticas(conValor),
    composicion: actual.resumen.composicion,
  };
}

export { fechaDesde };
