/** Contratos de la API REST compartidos por el servidor y el cliente. Montos en centavos de USD. */
import type { PeriodosPorAnio } from '../dominio/ahorro';
import type { ComposicionTipo } from '../dominio/portafolio';
import type { Estadisticas } from '../dominio/estadisticas';
import type { TipoInstrumento } from '../dominio/reglas';

export type Rol = 'INVERSIONISTA' | 'ADMINISTRADOR';
export type EstadoPrecio = 'ACTUALIZADO' | 'DESACTUALIZADO' | 'SIN_DATOS';
export type TipoTransaccion = 'COMPRA' | 'VENTA' | 'DEPOSITO' | 'RETIRO';
export type EstadoTransaccion = 'EJECUTADA' | 'RECHAZADA' | 'CANCELADA';
export type Rango = '1S' | '1M' | '6M' | '1A' | '5A';
export type Tema =
  'CONCEPTOS_BASICOS' | 'RIESGO' | 'RENDIMIENTO' | 'DIVERSIFICACION' | 'INTERES_COMPUESTO' | 'CRIPTOMONEDAS';

export const RANGOS: Record<Rango, { etiqueta: string; dias: number }> = {
  '1S': { etiqueta: '1 semana', dias: 7 },
  '1M': { etiqueta: '1 mes', dias: 31 },
  '6M': { etiqueta: '6 meses', dias: 183 },
  '1A': { etiqueta: '1 año', dias: 366 },
  '5A': { etiqueta: '5 años', dias: 1827 },
};

export const TEMAS: Record<Tema, string> = {
  CONCEPTOS_BASICOS: 'Conceptos básicos',
  RIESGO: 'Riesgo',
  RENDIMIENTO: 'Rendimiento',
  DIVERSIFICACION: 'Diversificación',
  INTERES_COMPUESTO: 'Interés compuesto',
  CRIPTOMONEDAS: 'Criptomonedas',
};

export interface ErrorApi {
  error: string;
  detalles?: Record<string, unknown>;
}

export interface UsuarioDto {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface ResumenPortafolioDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  creadoEn: string;
  valorCentavos: number;
  capitalInvertidoCentavos: number;
  rendimientoPct: number | null;
}

export interface PerfilDto extends UsuarioDto {
  saldoCentavos: number;
  valorInvertidoCentavos: number;
  patrimonioCentavos: number;
  contadorBancarrotas: number;
  enBancarrota: boolean;
  fechaUltimoReinicio: string | null;
  creadoEn: string;
  portafolios: ResumenPortafolioDto[];
}

export interface InstrumentoDto {
  id: number;
  simbolo: string;
  nombre: string;
  tipo: TipoInstrumento;
  descripcion: string | null;
  sector: string | null;
  bolsa: string | null;
  indiceSubyacente: string | null;
  activo: boolean;
  precioActual: number | null;
  variacionDiariaPct: number | null;
  fechaActualizacion: string | null;
  estadoPrecio: EstadoPrecio;
}

export interface PuntoSerie {
  fecha: string;
  valor: number;
}

export interface HistoricoDto {
  rango: Rango;
  puntos: PuntoSerie[];
  /** Aviso cuando no hay datos para todo el rango solicitado (RF-07). */
  aviso: string | null;
  estadisticas: Estadisticas;
}

export interface PosicionDto {
  instrumentoId: number;
  simbolo: string;
  nombre: string;
  tipo: TipoInstrumento;
  activo: boolean;
  cantidad: number;
  costoPromedio: number;
  precioActual: number | null;
  fechaActualizacion: string | null;
  estadoPrecio: EstadoPrecio;
  valorCentavos: number;
  capitalCentavos: number;
  gananciaCentavos: number;
  gananciaPct: number | null;
}

export interface DepositoDto {
  id: number;
  montoCentavos: number;
  tasaAnualPct: number;
  periodosPorAnio: PeriodosPorAnio;
  plazoMeses: number;
  fechaInicio: string;
  valorCentavos: number;
  interesesCentavos: number;
}

export interface DetallePortafolioDto extends ResumenPortafolioDto {
  posiciones: PosicionDto[];
  depositos: DepositoDto[];
  gananciaNoRealizadaCentavos: number;
  gananciaRealizadaCentavos: number;
  composicion: ComposicionTipo[];
  /** Fecha del precio más antiguo usado, si alguno está desactualizado (RF-14). */
  avisoPrecios: string | null;
  saldoDisponibleCentavos: number;
}

export interface ValoracionDto {
  rango: Rango;
  puntos: PuntoSerie[];
  estadisticas: Estadisticas;
  composicion: ComposicionTipo[];
}

export interface TransaccionDto {
  id: number;
  portafolioId: number | null;
  portafolioNombre: string | null;
  simbolo: string | null;
  tipoInstrumento: TipoInstrumento | null;
  tipo: TipoTransaccion;
  estado: EstadoTransaccion;
  cantidad: number | null;
  precioUnitario: number | null;
  montoCentavos: number;
  gananciaRealizadaCentavos: number | null;
  motivo: string | null;
  creadoEn: string;
}

export interface CotizacionOrdenDto {
  tipo: 'COMPRA' | 'VENTA';
  portafolioId: number;
  portafolioNombre: string;
  instrumento: InstrumentoDto;
  cantidad: number;
  precioUnitario: number;
  montoCentavos: number;
  saldoDisponibleCentavos: number;
  saldoDespuesCentavos: number;
  cantidadPoseida: number;
  costoPromedio: number | null;
  gananciaEstimadaCentavos: number | null;
}

export interface ResultadoOrdenDto {
  transaccion: TransaccionDto;
  saldoCentavos: number;
  mensaje: string;
}

export interface ArticuloResumenDto {
  id: number;
  slug: string;
  titulo: string;
  tema: Tema;
  resumen: string;
  estado: 'BORRADOR' | 'PUBLICADO';
  publicadoEn: string | null;
  actualizadoEn: string;
}

export interface ArticuloDto extends ArticuloResumenDto {
  cuerpo: string;
}
