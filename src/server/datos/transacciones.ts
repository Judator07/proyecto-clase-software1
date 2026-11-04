/** Repositorio del historial de transacciones (RF-08, RF-09, RF-10, RF-11). */
import type { EstadoTransaccion, TipoTransaccion, TransaccionDto } from '../../compartido/tipos';
import { desdeCantidadE8 } from '../../dominio/dinero';
import type { TipoInstrumento } from '../../dominio/reglas';

export interface NuevaTransaccion {
  usuarioId: number;
  portafolioId: number | null;
  instrumentoId: number | null;
  depositoId?: number | 'ULTIMO_INSERTADO' | null;
  tipo: TipoTransaccion;
  estado: EstadoTransaccion;
  cantidadE8?: number | null;
  precioUnitario?: number | null;
  montoCentavos: number;
  gananciaRealizadaCentavos?: number | null;
  motivo?: string | null;
}

/** Inserta una transacción. `ULTIMO_INSERTADO` enlaza el depósito creado en la sentencia anterior del batch. */
export function stmtInsertarTransaccion(db: D1Database, t: NuevaTransaccion) {
  const deposito = t.depositoId === 'ULTIMO_INSERTADO' ? 'last_insert_rowid()' : '?';
  const valores = [
    t.usuarioId,
    t.portafolioId,
    t.instrumentoId,
    ...(t.depositoId === 'ULTIMO_INSERTADO' ? [] : [t.depositoId ?? null]),
    t.tipo,
    t.estado,
    t.cantidadE8 ?? null,
    t.precioUnitario ?? null,
    t.montoCentavos,
    t.gananciaRealizadaCentavos ?? null,
    t.motivo ?? null,
  ];
  return db
    .prepare(
      `INSERT INTO transaccion (usuario_id, portafolio_id, instrumento_id, deposito_id, tipo, estado, cantidad_e8,
                                precio_unitario, monto_centavos, ganancia_realizada_centavos, motivo)
       VALUES (?, ?, ?, ${deposito}, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(...valores);
}

export interface FilaTransaccion {
  id: number;
  portafolio_id: number | null;
  portafolio_nombre: string | null;
  simbolo: string | null;
  tipo_instrumento: TipoInstrumento | null;
  tipo: TipoTransaccion;
  estado: EstadoTransaccion;
  cantidad_e8: number | null;
  precio_unitario: number | null;
  monto_centavos: number;
  ganancia_realizada_centavos: number | null;
  motivo: string | null;
  creado_en: string;
}

export function aTransaccionDto(f: FilaTransaccion): TransaccionDto {
  return {
    id: f.id,
    portafolioId: f.portafolio_id,
    portafolioNombre: f.portafolio_nombre,
    simbolo: f.simbolo,
    tipoInstrumento: f.tipo_instrumento,
    tipo: f.tipo,
    estado: f.estado,
    cantidad: f.cantidad_e8 === null ? null : desdeCantidadE8(f.cantidad_e8),
    precioUnitario: f.precio_unitario,
    montoCentavos: f.monto_centavos,
    gananciaRealizadaCentavos: f.ganancia_realizada_centavos,
    motivo: f.motivo,
    creadoEn: f.creado_en,
  };
}

const SELECT_TRANSACCION = `
  SELECT t.id, t.portafolio_id, pf.nombre AS portafolio_nombre, i.simbolo, i.tipo AS tipo_instrumento, t.tipo, t.estado,
         t.cantidad_e8, t.precio_unitario, t.monto_centavos, t.ganancia_realizada_centavos, t.motivo, t.creado_en
    FROM transaccion t
    LEFT JOIN portafolio pf ON pf.id = t.portafolio_id
    LEFT JOIN instrumento i ON i.id = t.instrumento_id`;

export function buscarTransaccion(db: D1Database, id: number) {
  return db.prepare(`${SELECT_TRANSACCION} WHERE t.id = ?`).bind(id).first<FilaTransaccion>();
}

export interface FiltroTransacciones {
  portafolioId?: number;
  desde?: string;
  hasta?: string;
  tipo?: TipoTransaccion;
  simbolo?: string;
}

/** RF-11: historial del usuario ordenado del más reciente al más antiguo, con filtros opcionales. */
export async function listarTransacciones(db: D1Database, usuarioId: number, f: FiltroTransacciones) {
  const condiciones = ['t.usuario_id = ?'];
  const valores: unknown[] = [usuarioId];
  if (f.portafolioId) {
    condiciones.push('t.portafolio_id = ?');
    valores.push(f.portafolioId);
  }
  if (f.desde) {
    condiciones.push('t.creado_en >= ?');
    valores.push(`${f.desde}T00:00:00`);
  }
  if (f.hasta) {
    condiciones.push('t.creado_en <= ?');
    valores.push(`${f.hasta}T23:59:59.999Z`);
  }
  if (f.tipo) {
    condiciones.push('t.tipo = ?');
    valores.push(f.tipo);
  }
  if (f.simbolo) {
    condiciones.push('i.simbolo = ?');
    valores.push(f.simbolo);
  }
  const { results } = await db
    .prepare(`${SELECT_TRANSACCION} WHERE ${condiciones.join(' AND ')} ORDER BY t.creado_en DESC, t.id DESC LIMIT 500`)
    .bind(...valores)
    .all<FilaTransaccion>();
  return results.map(aTransaccionDto);
}

export async function gananciaRealizadaPortafolio(db: D1Database, portafolioId: number): Promise<number> {
  const fila = await db
    .prepare(
      `SELECT COALESCE(SUM(ganancia_realizada_centavos), 0) AS total FROM transaccion
        WHERE portafolio_id = ? AND estado = 'EJECUTADA'`,
    )
    .bind(portafolioId)
    .first<{ total: number }>();
  return fila?.total ?? 0;
}
