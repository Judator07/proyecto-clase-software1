/**
 * Operaciones que mueven saldo: compra y venta (RF-08, RF-09), depósito y retiro de ahorro (RF-09, RF-10).
 * Cada operación es un único DB.batch() que D1 ejecuta como transacción: o se aplica completa
 * (saldo + posición + transacción) o no se aplica nada (RNF-10). Las restricciones CHECK de la BD son
 * la última barrera ante solicitudes concurrentes (RNF-02).
 */
import type { CotizacionOrdenDto, ResultadoOrdenDto, TipoTransaccion } from '../../compartido/tipos';
import { validarParametrosAhorro, valorDepositoALaFecha, type PeriodosPorAnio } from '../../dominio/ahorro';
import { aCantidadE8, desdeCantidadE8, formatearUSD, montoCentavos } from '../../dominio/dinero';
import { formatearCantidad, formatearPrecio } from '../../dominio/formato';
import { gananciaRealizadaCentavos } from '../../dominio/portafolio';
import { validarCantidad } from '../../dominio/reglas';
import { aInstrumentoDto, stmtInstrumentoPorSimbolo, type FilaInstrumento } from '../datos/mercado';
import {
  buscarDepositoActivo,
  buscarPortafolio,
  stmtBuscarPortafolio,
  stmtPosicionPorSimbolo,
  stmtSaldo,
  type FilaPortafolio,
  stmtCerrarDeposito,
  stmtExigirPortafolioActivo,
  stmtLimpiarPosicionesVacias,
  stmtsRestarPosicion,
  stmtSumarPosicion,
} from '../datos/portafolios';
import {
  aTransaccionDto,
  stmtBuscarTransaccion,
  stmtInsertarTransaccion,
  type FilaTransaccion,
  type NuevaTransaccion,
} from '../datos/transacciones';
import { ErrorAplicacion, esViolacionRestriccion, noEncontrado } from '../errores';
import { exigirNoBancarrota, saldoDe } from './cuentas';

export interface DatosOrden {
  portafolioId: number;
  simbolo: string;
  tipo: 'COMPRA' | 'VENTA';
  cantidad: number;
  /** Precio que el usuario vio en el resumen; si cambió antes de confirmar, se pide revisar (RN-03). */
  precioCotizado?: number;
}

function stmtAjustarSaldo(db: D1Database, usuarioId: number, deltaCentavos: number) {
  return db
    .prepare('UPDATE usuario SET saldo_centavos = saldo_centavos + ? WHERE id = ?')
    .bind(deltaCentavos, usuarioId);
}

async function prepararOrden(db: D1Database, usuarioId: number, d: DatosOrden) {
  // Una sola ida a D1 para todas las lecturas de la orden.
  const [pf, ins, pos, sal] = await db.batch<unknown>([
    stmtBuscarPortafolio(db, d.portafolioId, usuarioId),
    stmtInstrumentoPorSimbolo(db, d.simbolo),
    stmtPosicionPorSimbolo(db, d.portafolioId, d.simbolo),
    stmtSaldo(db, usuarioId),
  ]);
  const portafolio = pf.results[0] as FilaPortafolio | undefined;
  if (!portafolio) throw noEncontrado('Portafolio');
  const instrumento = ins.results[0] as FilaInstrumento | undefined;
  if (!instrumento) throw noEncontrado('Instrumento');
  if (instrumento.tipo === 'AHORRO') {
    throw new ErrorAplicacion(400, 'Las cuentas de ahorro se operan desde el simulador de ahorro.');
  }
  // RN-02: validación de cantidad antes de registrar la orden (bucle del diagrama de actividades).
  const validacion = validarCantidad(instrumento.tipo, d.cantidad);
  if (!validacion.ok) throw new ErrorAplicacion(400, validacion.mensaje, { campo: 'cantidad' });
  const cantidadE8 = aCantidadE8(d.cantidad);
  const precio = instrumento.precio_actual;
  const monto = precio === null ? 0 : montoCentavos(cantidadE8, precio);
  if (precio !== null && monto < 1) {
    throw new ErrorAplicacion(400, 'El monto mínimo de una operación es USD 0,01.', { campo: 'cantidad' });
  }
  const posicion = (pos.results[0] as { cantidad_e8: number; costo_promedio: number } | undefined) ?? null;
  const saldo = (sal.results[0] as { saldo_centavos: number } | undefined)?.saldo_centavos ?? 0;
  return { portafolio, instrumento, cantidadE8, precio, monto, posicion, saldo };
}

/** Resumen de confirmación de la orden (paso "Pendiente" del análisis). No modifica datos. */
export async function cotizarOrden(db: D1Database, usuarioId: number, d: DatosOrden): Promise<CotizacionOrdenDto> {
  const o = await prepararOrden(db, usuarioId, d);
  if (d.tipo === 'COMPRA' && o.instrumento.activo !== 1) {
    throw new ErrorAplicacion(409, 'Este instrumento fue desactivado y no está disponible para compra.');
  }
  if (o.precio === null) throw new ErrorAplicacion(409, 'El instrumento no tiene un precio disponible.');
  const esCompra = d.tipo === 'COMPRA';
  return {
    tipo: d.tipo,
    portafolioId: o.portafolio.id,
    portafolioNombre: o.portafolio.nombre,
    instrumento: aInstrumentoDto(o.instrumento),
    cantidad: d.cantidad,
    precioUnitario: o.precio,
    montoCentavos: o.monto,
    saldoDisponibleCentavos: o.saldo,
    saldoDespuesCentavos: esCompra ? o.saldo - o.monto : o.saldo + o.monto,
    cantidadPoseida: desdeCantidadE8(o.posicion?.cantidad_e8 ?? 0),
    costoPromedio: o.posicion?.costo_promedio ?? null,
    gananciaEstimadaCentavos:
      !esCompra && o.posicion ? gananciaRealizadaCentavos(o.cantidadE8, o.precio, o.posicion.costo_promedio) : null,
  };
}

async function registrar(db: D1Database, t: NuevaTransaccion, mensaje: string): Promise<ResultadoOrdenDto> {
  const fila = await stmtInsertarTransaccion(db, t).first<{ id: number }>();
  return resultado(db, t.usuarioId, fila!.id, mensaje);
}

async function resultado(
  db: D1Database,
  usuarioId: number,
  transaccionId: number,
  mensaje: string,
): Promise<ResultadoOrdenDto> {
  const [t, s] = await db.batch<unknown>([stmtBuscarTransaccion(db, transaccionId), stmtSaldo(db, usuarioId)]);
  return {
    transaccion: aTransaccionDto(t.results[0] as FilaTransaccion),
    saldoCentavos: (s.results[0] as { saldo_centavos: number }).saldo_centavos,
    mensaje,
  };
}

/** RF-08 / RF-09: ejecuta la orden confirmada al último precio registrado (RN-03). */
export async function ejecutarOrden(db: D1Database, usuarioId: number, d: DatosOrden): Promise<ResultadoOrdenDto> {
  const o = await prepararOrden(db, usuarioId, d);
  const base = {
    usuarioId,
    portafolioId: o.portafolio.id,
    instrumentoId: o.instrumento.id,
    tipo: d.tipo as TipoTransaccion,
    cantidadE8: o.cantidadE8,
    precioUnitario: o.precio,
    montoCentavos: o.monto,
  };
  const rechazar = (motivo: string) =>
    registrar(db, { ...base, estado: 'RECHAZADA', motivo }, `Orden rechazada: ${motivo}`);

  if (o.precio === null) return rechazar('El instrumento no tiene un precio disponible.');
  if (d.precioCotizado !== undefined && Math.abs(d.precioCotizado - o.precio) > 1e-9) {
    throw new ErrorAplicacion(
      409,
      `El precio cambió de ${formatearPrecio(d.precioCotizado)} a ${formatearPrecio(o.precio)} mientras confirmabas. Revisa el nuevo resumen.`,
      { precioActual: o.precio },
    );
  }
  /** Si el batch falló porque el portafolio se eliminó en paralelo, se informa como no encontrado. */
  const exigirPortafolio = async () => {
    if (!(await buscarPortafolio(db, o.portafolio.id, usuarioId))) throw noEncontrado('Portafolio');
  };

  if (d.tipo === 'COMPRA') {
    if (o.instrumento.activo !== 1) return rechazar('El instrumento fue desactivado y no está disponible para compra.');
    try {
      await exigirNoBancarrota(db, usuarioId, o.saldo);
    } catch (e) {
      if (e instanceof ErrorAplicacion) return rechazar(e.message);
      throw e;
    }
    const insuficiente = (saldo: number) => `Saldo insuficiente. Saldo disponible: ${formatearUSD(saldo)}.`;
    if (o.saldo < o.monto) return rechazar(insuficiente(o.saldo)); // RN-04: sin apalancamiento
    try {
      const resultados = await db.batch([
        stmtExigirPortafolioActivo(db, o.portafolio.id),
        stmtAjustarSaldo(db, usuarioId, -o.monto),
        stmtSumarPosicion(db, o.portafolio.id, o.instrumento.id, o.cantidadE8, o.precio),
        stmtInsertarTransaccion(db, { ...base, estado: 'EJECUTADA' }),
      ]);
      const id = (resultados[3].results[0] as { id: number }).id;
      return resultado(
        db,
        usuarioId,
        id,
        `Compraste ${formatearCantidad(d.cantidad)} ${o.instrumento.simbolo} por ${formatearUSD(o.monto)}.`,
      );
    } catch (e) {
      // Otra operación concurrente consumió el saldo: el CHECK revirtió todo el batch.
      if (esViolacionRestriccion(e)) {
        await exigirPortafolio();
        return rechazar(insuficiente(await saldoDe(db, usuarioId)));
      }
      throw e;
    }
  }

  // VENTA (RF-09): no se puede vender más de lo que se posee (RN-04).
  const poseida = o.posicion?.cantidad_e8 ?? 0;
  const excedida = () =>
    rechazar(
      `Cantidad mayor a la poseída. Posees ${formatearCantidad(desdeCantidadE8(poseida))} ${o.instrumento.simbolo}.`,
    );
  if (!o.posicion || o.cantidadE8 > poseida) return excedida();
  const ganancia = gananciaRealizadaCentavos(o.cantidadE8, o.precio, o.posicion.costo_promedio);
  try {
    const resultados = await db.batch([
      stmtExigirPortafolioActivo(db, o.portafolio.id),
      ...stmtsRestarPosicion(db, o.portafolio.id, o.instrumento.id, o.cantidadE8),
      stmtLimpiarPosicionesVacias(db, o.portafolio.id),
      stmtAjustarSaldo(db, usuarioId, o.monto),
      stmtInsertarTransaccion(db, { ...base, estado: 'EJECUTADA', gananciaRealizadaCentavos: ganancia }),
    ]);
    const id = (resultados[5].results[0] as { id: number }).id;
    const signo = ganancia >= 0 ? 'ganancia' : 'pérdida';
    return resultado(
      db,
      usuarioId,
      id,
      `Vendiste ${formatearCantidad(d.cantidad)} ${o.instrumento.simbolo} por ${formatearUSD(o.monto)} con una ${signo} realizada de ${formatearUSD(Math.abs(ganancia))}.`,
    );
  } catch (e) {
    if (esViolacionRestriccion(e)) {
      await exigirPortafolio();
      return excedida();
    }
    throw e;
  }
}

/** RF-08/RF-09: el usuario desiste en el resumen. Se registra como Cancelada sin tocar saldo ni posiciones. */
export async function cancelarOrden(db: D1Database, usuarioId: number, d: DatosOrden): Promise<ResultadoOrdenDto> {
  const o = await prepararOrden(db, usuarioId, d);
  return registrar(
    db,
    {
      usuarioId,
      portafolioId: o.portafolio.id,
      instrumentoId: o.instrumento.id,
      tipo: d.tipo,
      estado: 'CANCELADA',
      cantidadE8: o.cantidadE8,
      precioUnitario: o.precio,
      montoCentavos: o.monto,
      motivo: 'El usuario canceló la orden en el resumen.',
    },
    'Orden cancelada. No se modificó tu saldo ni tus posiciones.',
  );
}

export interface DatosDeposito {
  portafolioId: number;
  montoCentavos: number;
  tasaAnualPct: number;
  periodosPorAnio: PeriodosPorAnio;
  plazoMeses: number;
}

/** RF-10: registra el depósito de ahorro como posición del portafolio, descontándolo del saldo. */
export async function registrarDeposito(
  db: D1Database,
  usuarioId: number,
  d: DatosDeposito,
): Promise<ResultadoOrdenDto> {
  const portafolio = await buscarPortafolio(db, d.portafolioId, usuarioId);
  if (!portafolio) throw noEncontrado('Portafolio');
  const errores = validarParametrosAhorro(d);
  if (errores.length) throw new ErrorAplicacion(400, errores[0]);
  const ahorro = await db
    .prepare("SELECT * FROM instrumento WHERE tipo = 'AHORRO' AND activo = 1 ORDER BY id LIMIT 1")
    .first<FilaInstrumento>();
  if (!ahorro) throw new ErrorAplicacion(409, 'La cuenta de ahorro no está disponible en este momento.');
  const base = {
    usuarioId,
    portafolioId: portafolio.id,
    instrumentoId: ahorro.id,
    tipo: 'DEPOSITO' as const,
    montoCentavos: d.montoCentavos,
  };
  const rechazar = (motivo: string) =>
    registrar(db, { ...base, estado: 'RECHAZADA', motivo }, `Depósito rechazado: ${motivo}`);
  const saldo = await saldoDe(db, usuarioId);
  try {
    await exigirNoBancarrota(db, usuarioId, saldo);
  } catch (e) {
    if (e instanceof ErrorAplicacion) return rechazar(e.message);
    throw e;
  }
  const insuficiente = (s: number) => `El monto supera el saldo disponible (${formatearUSD(s)}).`;
  if (saldo < d.montoCentavos) return rechazar(insuficiente(saldo));
  try {
    const resultados = await db.batch([
      stmtExigirPortafolioActivo(db, portafolio.id),
      stmtAjustarSaldo(db, usuarioId, -d.montoCentavos),
      db
        .prepare(
          `INSERT INTO deposito_ahorro (portafolio_id, instrumento_id, monto_centavos, tasa_anual_pct, periodos_por_anio,
                                        plazo_meses, fecha_inicio) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          portafolio.id,
          ahorro.id,
          d.montoCentavos,
          d.tasaAnualPct,
          d.periodosPorAnio,
          d.plazoMeses,
          new Date().toISOString(),
        ),
      stmtInsertarTransaccion(db, { ...base, estado: 'EJECUTADA', depositoId: 'ULTIMO_INSERTADO' }),
    ]);
    const id = (resultados[3].results[0] as { id: number }).id;
    return resultado(db, usuarioId, id, `Depositaste ${formatearUSD(d.montoCentavos)} en "${portafolio.nombre}".`);
  } catch (e) {
    if (esViolacionRestriccion(e)) return rechazar(insuficiente(await saldoDe(db, usuarioId)));
    throw e;
  }
}

/** RF-09: retiro total de un depósito de ahorro por su valor acumulado a la fecha. */
export async function retirarDeposito(
  db: D1Database,
  usuarioId: number,
  depositoId: number,
): Promise<ResultadoOrdenDto> {
  const deposito = await buscarDepositoActivo(db, depositoId, usuarioId);
  if (!deposito) throw noEncontrado('Depósito activo');
  const ahora = new Date();
  const valor = valorDepositoALaFecha(
    {
      montoCentavos: deposito.monto_centavos,
      tasaAnualPct: deposito.tasa_anual_pct,
      periodosPorAnio: deposito.periodos_por_anio,
      plazoMeses: deposito.plazo_meses,
      fechaInicio: deposito.fecha_inicio,
    },
    ahora,
  );
  try {
    const resultados = await db.batch([
      stmtCerrarDeposito(db, deposito.id, 'RETIRADO', ahora.toISOString()),
      stmtAjustarSaldo(db, usuarioId, valor),
      stmtInsertarTransaccion(db, {
        usuarioId,
        portafolioId: deposito.portafolio_id,
        instrumentoId: deposito.instrumento_id,
        depositoId: deposito.id,
        tipo: 'RETIRO',
        estado: 'EJECUTADA',
        montoCentavos: valor,
        gananciaRealizadaCentavos: valor - deposito.monto_centavos,
      }),
    ]);
    const id = (resultados[2].results[0] as { id: number }).id;
    return resultado(
      db,
      usuarioId,
      id,
      `Retiraste ${formatearUSD(valor)}, con intereses ganados de ${formatearUSD(valor - deposito.monto_centavos)}.`,
    );
  } catch (e) {
    if (esViolacionRestriccion(e)) throw new ErrorAplicacion(409, 'El depósito ya fue retirado.');
    throw e;
  }
}
