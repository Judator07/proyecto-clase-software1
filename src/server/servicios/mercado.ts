/** Catálogo, precios, históricos, actualización automática (RF-06, RF-07, RF-16, RF-17) y administración (RF-18). */
import type { HistoricoDto, InstrumentoDto, PuntoSerie, Rango } from '../../compartido/tipos';
import { calcularEstadisticas } from '../../dominio/estadisticas';
import { fechaISOColombia, formatearFecha } from '../../dominio/formato';
import type { TipoInstrumento } from '../../dominio/reglas';
import {
  aInstrumentoDto,
  buscarInstrumentoPorId,
  buscarInstrumentoPorSimbolo,
  listarInstrumentos,
  stmtActualizarPrecio,
  stmtGuardarCierre,
  stmtHistoricoPorSimbolo,
  stmtInstrumentoPorSimbolo,
  stmtMarcarDesactualizado,
  type FilaInstrumento,
} from '../datos/mercado';
import {
  stmtDepositosActivos,
  stmtGuardarValoracion,
  stmtPortafoliosActivos,
  stmtPosicionesActivas,
  type FilaDeposito,
  type FilaPortafolio,
  type FilaPosicion,
} from '../datos/portafolios';
import type { ProveedorDatosMercado } from '../datos/proveedor';
import { ErrorAplicacion, noEncontrado } from '../errores';
import { fechaDesde } from './portafolios';
import { resumenVacio, valorarFilas } from './valoracion';

/** Cierres diarios recientes que se reescriben en cada ciclo (rellena huecos de hasta una semana). */
const CIERRES_POR_CICLO = 5;
const SENTENCIAS_POR_BATCH = 100;

export async function catalogo(
  db: D1Database,
  filtro: { texto?: string; tipo?: TipoInstrumento },
): Promise<InstrumentoDto[]> {
  return (await listarInstrumentos(db, filtro)).map(aInstrumentoDto);
}

export async function detalleInstrumento(db: D1Database, simbolo: string): Promise<InstrumentoDto> {
  const fila = await buscarInstrumentoPorSimbolo(db, simbolo);
  if (!fila) throw noEncontrado('Instrumento');
  return aInstrumentoDto(fila);
}

/** RF-07 / RF-16: serie de cierres del rango, aviso si el rango está incompleto y estadísticas. */
export async function historicoInstrumento(db: D1Database, simbolo: string, rango: Rango): Promise<HistoricoDto> {
  const desde = fechaDesde(rango, new Date());
  const [ins, hist] = await db.batch<unknown>([
    stmtInstrumentoPorSimbolo(db, simbolo),
    stmtHistoricoPorSimbolo(db, simbolo, desde),
  ]);
  const instrumento = ins.results[0] as FilaInstrumento | undefined;
  if (!instrumento) throw noEncontrado('Instrumento');
  if (instrumento.tipo === 'AHORRO') throw new ErrorAplicacion(400, 'La cuenta de ahorro no tiene precios de mercado.');
  const puntos = hist.results as PuntoSerie[];
  let aviso: string | null = null;
  if (puntos.length === 0) aviso = 'No hay datos de precios para este rango.';
  else if (Date.parse(puntos[0].fecha) - Date.parse(desde) > 5 * 86_400_000) {
    aviso = `No hay datos para todo el rango: se muestra desde el ${formatearFecha(puntos[0].fecha)}.`;
  }
  return { rango, puntos, aviso, estadisticas: calcularEstadisticas(puntos.map((p) => p.valor)) };
}

/** Indica si el ciclo actual del cron debe actualizar precios según el intervalo configurado (RF-17). */
export function tocaActualizar(ahora: Date, intervaloMinutos: number): boolean {
  const ciclos = Math.max(1, Math.round(intervaloMinutos / 15));
  const minutoDelDia = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
  return Math.floor(minutoDelDia / 15) % ciclos === 0;
}

async function ejecutarEnLotes(db: D1Database, sentencias: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < sentencias.length; i += SENTENCIAS_POR_BATCH) {
    await db.batch(sentencias.slice(i, i + SENTENCIAS_POR_BATCH));
  }
}

/**
 * RF-17: consulta al proveedor los precios de los instrumentos activos y los guarda. Si el proveedor falla
 * se conserva el último precio, se marca como desactualizado y se registra el error (RNF-04); el siguiente
 * ciclo reintenta. Después guarda la valoración del día de cada portafolio.
 */
export async function actualizarPrecios(
  db: D1Database,
  proveedor: ProveedorDatosMercado,
  ahora: Date,
): Promise<{ actualizados: number; fallidos: string[] }> {
  const instrumentos = (await listarInstrumentos(db, { incluirInactivos: true })).filter(
    (i): i is FilaInstrumento & { simbolo_proveedor: string } => i.tipo !== 'AHORRO' && !!i.simbolo_proveedor,
  );
  const respuestas = await Promise.allSettled(
    instrumentos.map((i) => proveedor.obtenerCotizacion(i.simbolo_proveedor)),
  );
  const sentencias: D1PreparedStatement[] = [];
  const fallidos: string[] = [];
  respuestas.forEach((r, k) => {
    const instrumento = instrumentos[k];
    if (r.status === 'fulfilled') {
      const c = r.value;
      sentencias.push(stmtActualizarPrecio(db, instrumento.id, c.precio, c.cierreAnterior, c.fechaHora));
      for (const cierre of c.cierres.slice(-CIERRES_POR_CICLO)) {
        sentencias.push(stmtGuardarCierre(db, instrumento.id, cierre.fecha, cierre.precio));
      }
    } else {
      const motivo = String(r.reason instanceof Error ? r.reason.message : r.reason);
      fallidos.push(instrumento.simbolo);
      console.error(`RF-17: no se pudo actualizar ${instrumento.simbolo} (${proveedor.nombre}): ${motivo}`);
      sentencias.push(stmtMarcarDesactualizado(db, instrumento.id, motivo));
    }
  });
  // Purga de sesiones expiradas (RNF-06).
  sentencias.push(db.prepare('DELETE FROM sesion WHERE expira_en < ?').bind(ahora.toISOString()));
  await ejecutarEnLotes(db, sentencias);
  await guardarValoracionesDiarias(db, ahora);
  return { actualizados: instrumentos.length - fallidos.length, fallidos };
}

/** RF-17: almacena el valor del día de cada portafolio activo (el último del día queda como cierre). */
export async function guardarValoracionesDiarias(db: D1Database, ahora: Date): Promise<number> {
  const [portafolios, posiciones, depositos] = await db.batch<FilaPortafolio | FilaPosicion | FilaDeposito>([
    stmtPortafoliosActivos(db),
    stmtPosicionesActivas(db),
    stmtDepositosActivos(db),
  ]);
  const valoraciones = valorarFilas(posiciones.results as FilaPosicion[], depositos.results as FilaDeposito[], ahora);
  const hoy = fechaISOColombia(ahora);
  const sentencias = (portafolios.results as FilaPortafolio[]).map((p) => {
    const r = (valoraciones.get(p.id) ?? resumenVacio()).resumen;
    return stmtGuardarValoracion(db, p.id, hoy, r.valorTotalCentavos, r.capitalInvertidoCentavos);
  });
  await ejecutarEnLotes(db, sentencias);
  return sentencias.length;
}

export interface DatosInstrumento {
  simbolo: string;
  simboloProveedor?: string | null;
  nombre: string;
  tipo: TipoInstrumento;
  descripcion?: string | null;
  activo?: boolean;
}

/** RF-18: agrega un instrumento validando el símbolo con el proveedor de datos. */
export async function crearInstrumento(
  db: D1Database,
  proveedor: ProveedorDatosMercado,
  datos: DatosInstrumento,
): Promise<InstrumentoDto> {
  const simbolo = datos.simbolo.trim().toUpperCase();
  if (await buscarInstrumentoPorSimbolo(db, simbolo)) {
    throw new ErrorAplicacion(409, 'El símbolo ya existe en el catálogo.', { campo: 'simbolo' });
  }
  const simboloProveedor = datos.tipo === 'AHORRO' ? null : (datos.simboloProveedor?.trim() || simbolo).toUpperCase();
  let cotizacion = null;
  if (simboloProveedor) {
    try {
      cotizacion = await proveedor.obtenerCotizacion(simboloProveedor);
    } catch {
      throw new ErrorAplicacion(422, `El símbolo ${simboloProveedor} no es reconocido por el proveedor de datos.`, {
        campo: 'simbolo',
      });
    }
  }
  const fila = await db
    .prepare(
      `INSERT INTO instrumento (simbolo, simbolo_proveedor, nombre, tipo, descripcion, activo, precio_actual,
                                precio_cierre_anterior, fecha_actualizacion, estado_precio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .bind(
      simbolo,
      simboloProveedor,
      datos.nombre.trim(),
      datos.tipo,
      datos.descripcion?.trim() || null,
      datos.activo === false ? 0 : 1,
      cotizacion?.precio ?? null,
      cotizacion?.cierreAnterior ?? null,
      cotizacion?.fechaHora ?? null,
      cotizacion ? 'ACTUALIZADO' : 'SIN_DATOS',
    )
    .first<FilaInstrumento>();
  if (cotizacion) {
    await ejecutarEnLotes(
      db,
      cotizacion.cierres.map((c) => stmtGuardarCierre(db, fila!.id, c.fecha, c.precio)),
    );
  }
  return aInstrumentoDto(fila!);
}

/** RF-18: edita o (des)activa un instrumento. Un instrumento inactivo no se ofrece para compra, pero se puede vender. */
export async function actualizarInstrumento(
  db: D1Database,
  id: number,
  datos: { nombre?: string; descripcion?: string | null; activo?: boolean },
): Promise<InstrumentoDto> {
  const actual = await buscarInstrumentoPorId(db, id);
  if (!actual) throw noEncontrado('Instrumento');
  await db
    .prepare('UPDATE instrumento SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?')
    .bind(
      datos.nombre?.trim() || actual.nombre,
      datos.descripcion === undefined ? actual.descripcion : datos.descripcion?.trim() || null,
      datos.activo === undefined ? actual.activo : datos.activo ? 1 : 0,
      id,
    )
    .run();
  return aInstrumentoDto((await buscarInstrumentoPorId(db, id))!);
}

export async function catalogoCompleto(db: D1Database): Promise<InstrumentoDto[]> {
  return (await listarInstrumentos(db, { incluirInactivos: true })).map(aInstrumentoDto);
}
