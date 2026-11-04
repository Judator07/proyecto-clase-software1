/** Cuenta de ahorro con interés compuesto (RF-10). */

export type PeriodosPorAnio = 1 | 4 | 12;

export const CAPITALIZACIONES: Record<PeriodosPorAnio, string> = { 12: 'Mensual', 4: 'Trimestral', 1: 'Anual' };

export const LIMITES_AHORRO = { tasaMin: 0, tasaMax: 30, plazoMin: 1, plazoMax: 120 } as const;

export interface ParametrosAhorro {
  montoCentavos: number;
  /** Tasa nominal anual en porcentaje (0 a 30). */
  tasaAnualPct: number;
  periodosPorAnio: PeriodosPorAnio;
  plazoMeses: number;
}

export interface FilaProyeccion {
  periodo: number;
  mes: number;
  saldoCentavos: number;
  interesAcumuladoCentavos: number;
}

/** VF = P·(1 + r/n)^(n·t), con r nominal anual, n periodos por año y t en años. */
export function valorFuturo(principal: number, tasaAnualPct: number, periodosPorAnio: number, anios: number): number {
  const r = tasaAnualPct / 100;
  return principal * (1 + r / periodosPorAnio) ** (periodosPorAnio * anios);
}

export function validarParametrosAhorro(p: ParametrosAhorro): string[] {
  const errores: string[] = [];
  if (!Number.isInteger(p.montoCentavos) || p.montoCentavos <= 0) errores.push('El monto debe ser mayor que cero.');
  if (!(p.tasaAnualPct >= LIMITES_AHORRO.tasaMin && p.tasaAnualPct <= LIMITES_AHORRO.tasaMax)) {
    errores.push('La tasa de interés debe estar entre 0 % y 30 %.');
  }
  if (
    !Number.isInteger(p.plazoMeses) ||
    p.plazoMeses < LIMITES_AHORRO.plazoMin ||
    p.plazoMeses > LIMITES_AHORRO.plazoMax
  ) {
    errores.push('El plazo debe estar entre 1 y 120 meses.');
  }
  if (![1, 4, 12].includes(p.periodosPorAnio)) errores.push('La capitalización debe ser mensual, trimestral o anual.');
  return errores;
}

/** Proyección del depósito: valor final, intereses y evolución por periodo de capitalización. */
export function proyectarAhorro(p: ParametrosAhorro): {
  valorFinalCentavos: number;
  interesesCentavos: number;
  filas: FilaProyeccion[];
} {
  const anios = p.plazoMeses / 12;
  const valorFinalCentavos = Math.round(valorFuturo(p.montoCentavos, p.tasaAnualPct, p.periodosPorAnio, anios));
  const mesesPorPeriodo = 12 / p.periodosPorAnio;
  const periodosCompletos = Math.floor(p.plazoMeses / mesesPorPeriodo);
  const filas: FilaProyeccion[] = [];
  for (let k = 1; k <= periodosCompletos; k++) {
    const saldo = Math.round(valorFuturo(p.montoCentavos, p.tasaAnualPct, p.periodosPorAnio, k / p.periodosPorAnio));
    filas.push({
      periodo: k,
      mes: k * mesesPorPeriodo,
      saldoCentavos: saldo,
      interesAcumuladoCentavos: saldo - p.montoCentavos,
    });
  }
  // Si el plazo no coincide con un periodo completo, la última fila corresponde al final del plazo.
  if (filas.length === 0 || filas[filas.length - 1].mes !== p.plazoMeses) {
    filas.push({
      periodo: periodosCompletos + 1,
      mes: p.plazoMeses,
      saldoCentavos: valorFinalCentavos,
      interesAcumuladoCentavos: valorFinalCentavos - p.montoCentavos,
    });
  }
  return { valorFinalCentavos, interesesCentavos: valorFinalCentavos - p.montoCentavos, filas };
}

const MS_POR_ANIO = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Valor acumulado de un depósito a una fecha (decisión SRS v1.1): se aplica la fórmula de RF-10 con el
 * tiempo transcurrido desde el depósito, sin superar el plazo pactado.
 */
export function valorDepositoALaFecha(
  deposito: ParametrosAhorro & { fechaInicio: string },
  fecha: Date = new Date(),
): number {
  const transcurrido = Math.max(0, fecha.getTime() - new Date(deposito.fechaInicio).getTime()) / MS_POR_ANIO;
  const anios = Math.min(transcurrido, deposito.plazoMeses / 12);
  return Math.round(valorFuturo(deposito.montoCentavos, deposito.tasaAnualPct, deposito.periodosPorAnio, anios));
}
