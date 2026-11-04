/** Repositorio de instrumentos y cotizaciones (RF-06, RF-07, RF-17, RF-18). */
import type { EstadoPrecio, InstrumentoDto, PuntoSerie } from '../../compartido/tipos';
import type { TipoInstrumento } from '../../dominio/reglas';

export interface FilaInstrumento {
  id: number;
  simbolo: string;
  simbolo_proveedor: string | null;
  nombre: string;
  tipo: TipoInstrumento;
  descripcion: string | null;
  sector: string | null;
  bolsa: string | null;
  indice_subyacente: string | null;
  activo: number;
  precio_actual: number | null;
  precio_cierre_anterior: number | null;
  fecha_actualizacion: string | null;
  estado_precio: EstadoPrecio;
}

export function aInstrumentoDto(f: FilaInstrumento): InstrumentoDto {
  return {
    id: f.id,
    simbolo: f.simbolo,
    nombre: f.nombre,
    tipo: f.tipo,
    descripcion: f.descripcion,
    sector: f.sector,
    bolsa: f.bolsa,
    indiceSubyacente: f.indice_subyacente,
    activo: f.activo === 1,
    precioActual: f.precio_actual,
    variacionDiariaPct:
      f.precio_actual !== null && f.precio_cierre_anterior
        ? (f.precio_actual / f.precio_cierre_anterior - 1) * 100
        : null,
    fechaActualizacion: f.fecha_actualizacion,
    estadoPrecio: f.estado_precio,
  };
}

export async function listarInstrumentos(
  db: D1Database,
  filtro: { texto?: string; tipo?: TipoInstrumento; incluirInactivos?: boolean },
): Promise<FilaInstrumento[]> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  if (!filtro.incluirInactivos) condiciones.push('activo = 1');
  if (filtro.tipo) {
    condiciones.push('tipo = ?');
    valores.push(filtro.tipo);
  }
  if (filtro.texto) {
    condiciones.push('(simbolo LIKE ? OR nombre LIKE ?)');
    valores.push(`%${filtro.texto}%`, `%${filtro.texto}%`);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { results } = await db
    .prepare(
      `SELECT * FROM instrumento ${donde} ORDER BY CASE tipo WHEN 'ACCION' THEN 1 WHEN 'ETF' THEN 2 WHEN 'CRIPTO' THEN 3 ELSE 4 END, simbolo`,
    )
    .bind(...valores)
    .all<FilaInstrumento>();
  return results;
}

export function buscarInstrumentoPorSimbolo(db: D1Database, simbolo: string) {
  return db.prepare('SELECT * FROM instrumento WHERE simbolo = ?').bind(simbolo).first<FilaInstrumento>();
}

export function buscarInstrumentoPorId(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM instrumento WHERE id = ?').bind(id).first<FilaInstrumento>();
}

export async function historicoDesde(db: D1Database, instrumentoId: number, desde: string): Promise<PuntoSerie[]> {
  const { results } = await db
    .prepare(
      'SELECT fecha, precio_cierre AS valor FROM cotizacion_historica WHERE instrumento_id = ? AND fecha >= ? ORDER BY fecha',
    )
    .bind(instrumentoId, desde)
    .all<PuntoSerie>();
  return results;
}

export function stmtActualizarPrecio(
  db: D1Database,
  id: number,
  precio: number,
  cierreAnterior: number | null,
  fechaHora: string,
) {
  return db
    .prepare(
      `UPDATE instrumento
          SET precio_actual = ?, precio_cierre_anterior = COALESCE(?, precio_cierre_anterior),
              fecha_actualizacion = ?, estado_precio = 'ACTUALIZADO', ultimo_error = NULL
        WHERE id = ?`,
    )
    .bind(precio, cierreAnterior, fechaHora, id);
}

/** RNF-04: ante una falla del proveedor se conserva el último precio y se marca como desactualizado. */
export function stmtMarcarDesactualizado(db: D1Database, id: number, error: string) {
  return db
    .prepare(
      `UPDATE instrumento
          SET estado_precio = CASE WHEN precio_actual IS NULL THEN 'SIN_DATOS' ELSE 'DESACTUALIZADO' END,
              ultimo_error = ?
        WHERE id = ?`,
    )
    .bind(error.slice(0, 300), id);
}

export function stmtGuardarCierre(db: D1Database, id: number, fecha: string, precio: number) {
  return db
    .prepare(
      `INSERT INTO cotizacion_historica (instrumento_id, fecha, precio_cierre) VALUES (?, ?, ?)
       ON CONFLICT (instrumento_id, fecha) DO UPDATE SET precio_cierre = excluded.precio_cierre`,
    )
    .bind(id, fecha, precio);
}
