/** Valoración de posiciones y portafolios (RF-09, RF-14, RF-15, RF-16, RN-06). */
import { ESCALA_CANTIDAD, montoCentavos } from './dinero';
import type { TipoInstrumento } from './reglas';

/** RN-06: costo promedio ponderado tras una compra. */
export function nuevoCostoPromedio(
  cantidadActualE8: number,
  costoActual: number,
  cantidadCompraE8: number,
  precioCompra: number,
): number {
  const total = cantidadActualE8 + cantidadCompraE8;
  if (total === 0) return 0;
  return (cantidadActualE8 * costoActual + cantidadCompraE8 * precioCompra) / total;
}

/** RF-09: ganancia o pérdida realizada al vender, frente al costo promedio. */
export function gananciaRealizadaCentavos(cantidadVentaE8: number, precioVenta: number, costoPromedio: number): number {
  return Math.round((cantidadVentaE8 / ESCALA_CANTIDAD) * (precioVenta - costoPromedio) * 100);
}

export interface PosicionValorable {
  tipo: TipoInstrumento;
  cantidadE8: number;
  costoPromedio: number;
  precioActual: number;
}

export interface DepositoValorable {
  capitalCentavos: number;
  valorCentavos: number;
}

export interface ComposicionTipo {
  tipo: TipoInstrumento;
  valorCentavos: number;
  porcentaje: number;
}

export interface ResumenPortafolio {
  valorTotalCentavos: number;
  capitalInvertidoCentavos: number;
  gananciaNoRealizadaCentavos: number;
  /** null cuando no hay capital invertido (portafolio vacío). */
  rendimientoPct: number | null;
  composicion: ComposicionTipo[];
}

export function valorPosicionCentavos(p: Pick<PosicionValorable, 'cantidadE8' | 'precioActual'>): number {
  return montoCentavos(p.cantidadE8, p.precioActual);
}

/**
 * RF-14: balance y rendimiento sobre las posiciones abiertas.
 * Rendimiento (%) = (valor de mercado − capital invertido) / capital invertido × 100.
 * RF-15/RF-16: composición y diversificación (%) por tipo de instrumento.
 */
export function resumirPortafolio(
  posiciones: PosicionValorable[],
  depositos: DepositoValorable[] = [],
): ResumenPortafolio {
  const porTipo = new Map<TipoInstrumento, number>();
  let valor = 0;
  let capital = 0;
  for (const p of posiciones) {
    const v = valorPosicionCentavos(p);
    valor += v;
    capital += montoCentavos(p.cantidadE8, p.costoPromedio);
    porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + v);
  }
  for (const d of depositos) {
    valor += d.valorCentavos;
    capital += d.capitalCentavos;
    porTipo.set('AHORRO', (porTipo.get('AHORRO') ?? 0) + d.valorCentavos);
  }
  const composicion: ComposicionTipo[] = [...porTipo.entries()]
    .map(([tipo, valorCentavos]) => ({
      tipo,
      valorCentavos,
      porcentaje: valor > 0 ? (valorCentavos / valor) * 100 : 0,
    }))
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
  return {
    valorTotalCentavos: valor,
    capitalInvertidoCentavos: capital,
    gananciaNoRealizadaCentavos: valor - capital,
    rendimientoPct: capital > 0 ? ((valor - capital) / capital) * 100 : null,
    composicion,
  };
}
