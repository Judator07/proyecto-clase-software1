/** Repositorio de portafolios, posiciones, depósitos de ahorro y valoraciones (RF-09, RF-10, RF-12..RF-15). */
import type { EstadoPrecio, PuntoSerie } from '../../compartido/tipos';
import type { PeriodosPorAnio } from '../../dominio/ahorro';
import type { TipoInstrumento } from '../../dominio/reglas';

export interface FilaPortafolio {
  id: number;
  usuario_id: number;
  nombre: string;
  descripcion: string | null;
  creado_en: string;
}

export interface FilaPosicion {
  portafolio_id: number;
  instrumento_id: number;
  cantidad_e8: number;
  costo_promedio: number;
  simbolo: string;
  nombre: string;
  tipo: TipoInstrumento;
  activo: number;
  precio_actual: number | null;
  fecha_actualizacion: string | null;
  estado_precio: EstadoPrecio;
}

export interface FilaDeposito {
  id: number;
  portafolio_id: number;
  instrumento_id: number;
  monto_centavos: number;
  tasa_anual_pct: number;
  periodos_por_anio: PeriodosPorAnio;
  plazo_meses: number;
  fecha_inicio: string;
}

const ACTIVOS = 'eliminado_en IS NULL';

export async function listarPortafolios(db: D1Database, usuarioId: number): Promise<FilaPortafolio[]> {
  const { results } = await db
    .prepare(
      `SELECT id, usuario_id, nombre, descripcion, creado_en FROM portafolio WHERE usuario_id = ? AND ${ACTIVOS} ORDER BY creado_en, id`,
    )
    .bind(usuarioId)
    .all<FilaPortafolio>();
  return results;
}

/** Busca un portafolio activo del usuario (RNF-06: nadie opera portafolios ajenos). */
export function buscarPortafolio(db: D1Database, id: number, usuarioId: number) {
  return db
    .prepare(
      `SELECT id, usuario_id, nombre, descripcion, creado_en FROM portafolio WHERE id = ? AND usuario_id = ? AND ${ACTIVOS}`,
    )
    .bind(id, usuarioId)
    .first<FilaPortafolio>();
}

const SELECT_POSICIONES = `
  SELECT p.portafolio_id, p.instrumento_id, p.cantidad_e8, p.costo_promedio,
         i.simbolo, i.nombre, i.tipo, i.activo, i.precio_actual, i.fecha_actualizacion, i.estado_precio
    FROM posicion p
    JOIN portafolio pf ON pf.id = p.portafolio_id
    JOIN instrumento i ON i.id = p.instrumento_id
   WHERE pf.eliminado_en IS NULL AND p.cantidad_e8 > 0`;

const SELECT_DEPOSITOS = `
  SELECT d.id, d.portafolio_id, d.instrumento_id, d.monto_centavos, d.tasa_anual_pct, d.periodos_por_anio,
         d.plazo_meses, d.fecha_inicio
    FROM deposito_ahorro d
    JOIN portafolio pf ON pf.id = d.portafolio_id
   WHERE pf.eliminado_en IS NULL AND d.estado = 'ACTIVO'`;

export function stmtPosicionesDeUsuario(db: D1Database, usuarioId: number) {
  return db.prepare(`${SELECT_POSICIONES} AND pf.usuario_id = ? ORDER BY i.tipo, i.simbolo`).bind(usuarioId);
}

export function stmtDepositosDeUsuario(db: D1Database, usuarioId: number) {
  return db.prepare(`${SELECT_DEPOSITOS} AND pf.usuario_id = ? ORDER BY d.fecha_inicio`).bind(usuarioId);
}

/** Todas las posiciones y depósitos de portafolios activos (valoración diaria de RF-17). */
export function stmtPosicionesActivas(db: D1Database) {
  return db.prepare(SELECT_POSICIONES);
}

export function stmtDepositosActivos(db: D1Database) {
  return db.prepare(SELECT_DEPOSITOS);
}

export function stmtPortafoliosActivos(db: D1Database) {
  return db.prepare(`SELECT id, usuario_id, nombre, descripcion, creado_en FROM portafolio WHERE ${ACTIVOS}`);
}

export function buscarPosicion(db: D1Database, portafolioId: number, instrumentoId: number) {
  return db
    .prepare('SELECT cantidad_e8, costo_promedio FROM posicion WHERE portafolio_id = ? AND instrumento_id = ?')
    .bind(portafolioId, instrumentoId)
    .first<{ cantidad_e8: number; costo_promedio: number }>();
}

/** Depósito activo de un portafolio activo del usuario. */
export function buscarDepositoActivo(db: D1Database, depositoId: number, usuarioId: number) {
  return db
    .prepare(`${SELECT_DEPOSITOS} AND d.id = ? AND pf.usuario_id = ?`)
    .bind(depositoId, usuarioId)
    .first<FilaDeposito>();
}

export async function valoracionesDesde(db: D1Database, portafolioId: number, desde: string): Promise<PuntoSerie[]> {
  const { results } = await db
    .prepare(
      'SELECT fecha, valor_centavos AS valor FROM valoracion_portafolio WHERE portafolio_id = ? AND fecha >= ? ORDER BY fecha',
    )
    .bind(portafolioId, desde)
    .all<PuntoSerie>();
  return results;
}

export function stmtGuardarValoracion(
  db: D1Database,
  portafolioId: number,
  fecha: string,
  valor: number,
  capital: number,
) {
  return db
    .prepare(
      `INSERT INTO valoracion_portafolio (portafolio_id, fecha, valor_centavos, capital_invertido_centavos) VALUES (?, ?, ?, ?)
       ON CONFLICT (portafolio_id, fecha) DO UPDATE
         SET valor_centavos = excluded.valor_centavos, capital_invertido_centavos = excluded.capital_invertido_centavos`,
    )
    .bind(portafolioId, fecha, valor, capital);
}

/** RN-06: suma unidades y recalcula el costo promedio ponderado en una sola sentencia atómica. */
export function stmtSumarPosicion(
  db: D1Database,
  portafolioId: number,
  instrumentoId: number,
  cantidadE8: number,
  precio: number,
) {
  return db
    .prepare(
      `INSERT INTO posicion (portafolio_id, instrumento_id, cantidad_e8, costo_promedio) VALUES (?, ?, ?, ?)
       ON CONFLICT (portafolio_id, instrumento_id) DO UPDATE SET
         costo_promedio = (posicion.cantidad_e8 * posicion.costo_promedio + excluded.cantidad_e8 * excluded.costo_promedio)
                          / (posicion.cantidad_e8 + excluded.cantidad_e8),
         cantidad_e8 = posicion.cantidad_e8 + excluded.cantidad_e8,
         actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(portafolioId, instrumentoId, cantidadE8, precio);
}

/**
 * RN-04: resta unidades sin permitir vender más de lo que se posee, incluso con solicitudes concurrentes.
 * 1) Asegura que la fila exista (cantidad 0 si no existía). 2) Resta: si el resultado es negativo, el
 * CHECK (cantidad_e8 >= 0) aborta todo el batch. Las filas en cero se eliminan después.
 */
export function stmtsRestarPosicion(db: D1Database, portafolioId: number, instrumentoId: number, cantidadE8: number) {
  return [
    db
      .prepare(
        'INSERT OR IGNORE INTO posicion (portafolio_id, instrumento_id, cantidad_e8, costo_promedio) VALUES (?, ?, 0, 0)',
      )
      .bind(portafolioId, instrumentoId),
    db
      .prepare(
        `UPDATE posicion SET cantidad_e8 = cantidad_e8 - ?, actualizado_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE portafolio_id = ? AND instrumento_id = ?`,
      )
      .bind(cantidadE8, portafolioId, instrumentoId),
  ];
}

export function stmtLimpiarPosicionesVacias(db: D1Database, portafolioId: number) {
  return db.prepare('DELETE FROM posicion WHERE portafolio_id = ? AND cantidad_e8 = 0').bind(portafolioId);
}

/**
 * Cierra un depósito activo. Si ya no estaba activo, el CASE produce un estado inválido que viola el
 * CHECK y aborta el batch: evita retirar dos veces el mismo depósito ante solicitudes concurrentes.
 */
export function stmtCerrarDeposito(db: D1Database, depositoId: number, estado: 'RETIRADO' | 'CERRADO', fecha: string) {
  return db
    .prepare(
      `UPDATE deposito_ahorro SET estado = CASE WHEN estado = 'ACTIVO' THEN ? ELSE 'YA_CERRADO' END, fecha_cierre = ?
        WHERE id = ?`,
    )
    .bind(estado, fecha, depositoId);
}

/** Aborta el batch (CHECK del nombre) si el portafolio fue eliminado por otra solicitud concurrente. */
export function stmtExigirPortafolioActivo(db: D1Database, portafolioId: number) {
  return db
    .prepare("UPDATE portafolio SET nombre = CASE WHEN eliminado_en IS NULL THEN nombre ELSE '' END WHERE id = ?")
    .bind(portafolioId);
}
