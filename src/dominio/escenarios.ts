/** Simulación de escenarios de mercado (RF-21, RF-22). Es una proyección pura: no modifica datos (RN-08). */
import { valorFuturo, type PeriodosPorAnio } from './ahorro';
import type { TipoInstrumento } from './reglas';

export type TipoMercado = Exclude<TipoInstrumento, 'AHORRO'>;

export interface VariablesEscenario {
  /** Variación de precio por tipo, en %. */
  variacionPct: Record<TipoMercado, number>;
  /** Cambio de la tasa de ahorro en puntos porcentuales (escenarios predefinidos)… */
  deltaTasaPp?: number;
  /** …o tasa nominal anual absoluta en % (escenario personalizado, RF-22). */
  tasaAhorroPct?: number;
  /** Volatilidad en % para el rango pesimista/optimista (RF-22). */
  volatilidadPct?: number;
}

export type CodigoEscenario = 'CRISIS' | 'ALCISTA' | 'ALZA_TASAS';

export const ESCENARIOS_PREDEFINIDOS: Record<
  CodigoEscenario,
  { nombre: string; descripcion: string; variables: VariablesEscenario }
> = {
  CRISIS: {
    nombre: 'Crisis financiera',
    descripcion: 'Caída generalizada de los mercados y recorte de tasas de interés.',
    variables: { variacionPct: { ACCION: -30, ETF: -20, CRIPTO: -50 }, deltaTasaPp: -2 },
  },
  ALCISTA: {
    nombre: 'Mercado alcista',
    descripcion: 'Periodo de optimismo con subidas en todos los activos de riesgo.',
    variables: { variacionPct: { ACCION: 20, ETF: 15, CRIPTO: 40 }, deltaTasaPp: 0 },
  },
  ALZA_TASAS: {
    nombre: 'Alza de tasas',
    descripcion: 'El banco central sube las tasas: los activos de riesgo caen y el ahorro rinde más.',
    variables: { variacionPct: { ACCION: -10, ETF: -8, CRIPTO: -15 }, deltaTasaPp: 3 },
  },
};

/** Rangos permitidos de RF-21 y RF-22. */
export const LIMITES_ESCENARIO = {
  horizonte: [1, 60],
  ACCION: [-90, 100],
  ETF: [-90, 100],
  CRIPTO: [-90, 200],
  tasa: [0, 30],
  volatilidad: [0, 100],
} as const;

export interface PosicionEscenario {
  tipo: TipoMercado;
  valorCentavos: number;
}

export interface DepositoEscenario {
  valorCentavos: number;
  tasaAnualPct: number;
  periodosPorAnio: PeriodosPorAnio;
}

export interface ResultadoEscenario {
  valorActualCentavos: number;
  valorProyectadoCentavos: number;
  variacionPct: number;
  rangoPesimistaCentavos: number;
  rangoOptimistaCentavos: number;
  detalle: { tipo: TipoInstrumento; actualCentavos: number; proyectadoCentavos: number }[];
  explicacion: string;
}

export function validarVariables(v: VariablesEscenario, horizonteMeses: number): string[] {
  const errores: string[] = [];
  const fuera = (x: number, [min, max]: readonly [number, number]) => !Number.isFinite(x) || x < min || x > max;
  if (!Number.isInteger(horizonteMeses) || fuera(horizonteMeses, LIMITES_ESCENARIO.horizonte)) {
    errores.push('El horizonte debe estar entre 1 y 60 meses.');
  }
  for (const tipo of ['ACCION', 'ETF', 'CRIPTO'] as const) {
    const [min, max] = LIMITES_ESCENARIO[tipo];
    if (fuera(v.variacionPct[tipo], LIMITES_ESCENARIO[tipo])) {
      errores.push(
        `La variación de ${tipo === 'ACCION' ? 'acciones' : tipo === 'ETF' ? 'ETF' : 'criptomonedas'} debe estar entre ${min} % y ${max} %.`,
      );
    }
  }
  if (v.tasaAhorroPct !== undefined && fuera(v.tasaAhorroPct, LIMITES_ESCENARIO.tasa)) {
    errores.push('La tasa de ahorro debe estar entre 0 % y 30 %.');
  }
  if (v.volatilidadPct !== undefined && fuera(v.volatilidadPct, LIMITES_ESCENARIO.volatilidad)) {
    errores.push('La volatilidad debe estar entre 0 % y 100 %.');
  }
  return errores;
}

function signo(x: number): string {
  return `${x > 0 ? '+' : ''}${x.toLocaleString('es-CO')} %`;
}

export function explicarEscenario(v: VariablesEscenario): string {
  const p = v.variacionPct;
  const partes = [`acciones ${signo(p.ACCION)}`, `ETF ${signo(p.ETF)}`, `criptomonedas ${signo(p.CRIPTO)}`];
  let tasa = '';
  if (v.tasaAhorroPct !== undefined)
    tasa = ` Los depósitos de ahorro se proyectan con una tasa del ${v.tasaAhorroPct.toLocaleString('es-CO')} % anual.`;
  else if (v.deltaTasaPp)
    tasa = ` La tasa de los depósitos de ahorro cambia ${v.deltaTasaPp > 0 ? '+' : ''}${v.deltaTasaPp} p.p. (sin bajar de 0 %).`;
  const vol = v.volatilidadPct
    ? ` Con una volatilidad del ${v.volatilidadPct.toLocaleString('es-CO')} %, el resultado puede variar en ese porcentaje hacia arriba o hacia abajo.`
    : '';
  return `Se aplica una variación de precio de ${partes.join(', ')}.${tasa}${vol} Es solo una proyección: tu portafolio real no cambia.`;
}

/**
 * RF-21/RF-22: aplica una vez la variación de precio por tipo a las posiciones y proyecta los depósitos
 * de ahorro con la tasa del escenario durante el horizonte. Rango = proyectado × (1 ± volatilidad).
 */
export function simularEscenario(
  posiciones: PosicionEscenario[],
  depositos: DepositoEscenario[],
  v: VariablesEscenario,
  horizonteMeses: number,
): ResultadoEscenario {
  const detalle = new Map<TipoInstrumento, { actualCentavos: number; proyectadoCentavos: number }>();
  const acumular = (tipo: TipoInstrumento, actual: number, proyectado: number) => {
    const d = detalle.get(tipo) ?? { actualCentavos: 0, proyectadoCentavos: 0 };
    d.actualCentavos += actual;
    d.proyectadoCentavos += proyectado;
    detalle.set(tipo, d);
  };
  for (const p of posiciones) {
    acumular(p.tipo, p.valorCentavos, Math.round(p.valorCentavos * (1 + v.variacionPct[p.tipo] / 100)));
  }
  for (const d of depositos) {
    const tasa = v.tasaAhorroPct ?? Math.max(0, d.tasaAnualPct + (v.deltaTasaPp ?? 0));
    acumular(
      'AHORRO',
      d.valorCentavos,
      Math.round(valorFuturo(d.valorCentavos, tasa, d.periodosPorAnio, horizonteMeses / 12)),
    );
  }
  let actual = 0;
  let proyectado = 0;
  for (const d of detalle.values()) {
    actual += d.actualCentavos;
    proyectado += d.proyectadoCentavos;
  }
  const vol = (v.volatilidadPct ?? 0) / 100;
  return {
    valorActualCentavos: actual,
    valorProyectadoCentavos: proyectado,
    variacionPct: actual > 0 ? (proyectado / actual - 1) * 100 : 0,
    rangoPesimistaCentavos: Math.round(proyectado * (1 - vol)),
    rangoOptimistaCentavos: Math.round(proyectado * (1 + vol)),
    detalle: [...detalle.entries()].map(([tipo, d]) => ({ tipo, ...d })),
    explicacion: explicarEscenario(v),
  };
}
