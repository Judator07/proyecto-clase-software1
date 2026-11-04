/** Estadísticas y tendencias de una serie de precios (RF-16). */

/** Número mínimo de datos para volatilidad y media móvil (RF-16, manejo de situaciones anormales). */
export const MINIMO_DATOS_INDICADOR = 20;
export const VENTANA_MEDIA_MOVIL = 20;

export type Tendencia = 'ALCISTA' | 'BAJISTA';

export interface Estadisticas {
  /** Rendimiento del periodo en %, entre el primer y el último precio. */
  rendimientoPeriodoPct: number | null;
  maximo: number | null;
  minimo: number | null;
  /** Desviación estándar muestral de los rendimientos diarios, en %. null = "No disponible". */
  volatilidadPct: number | null;
  mediaMovil20: number | null;
  /** Alcista si el último precio está por encima de la media móvil de 20 días. */
  tendencia: Tendencia | null;
}

export function rendimientosDiarios(precios: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < precios.length; i++) r.push(precios[i] / precios[i - 1] - 1);
  return r;
}

/** Desviación estándar muestral (n − 1), equivalente a DESVEST.M de una hoja de cálculo. */
export function desviacionEstandarMuestral(valores: number[]): number | null {
  if (valores.length < 2) return null;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const suma = valores.reduce((s, v) => s + (v - media) ** 2, 0);
  return Math.sqrt(suma / (valores.length - 1));
}

export function mediaMovil(precios: number[], ventana = VENTANA_MEDIA_MOVIL): number | null {
  if (precios.length < ventana) return null;
  const ultimos = precios.slice(-ventana);
  return ultimos.reduce((s, v) => s + v, 0) / ventana;
}

/** Calcula los indicadores sobre precios ordenados del más antiguo al más reciente. */
export function calcularEstadisticas(precios: number[]): Estadisticas {
  if (precios.length === 0) {
    return {
      rendimientoPeriodoPct: null,
      maximo: null,
      minimo: null,
      volatilidadPct: null,
      mediaMovil20: null,
      tendencia: null,
    };
  }
  const primero = precios[0];
  const ultimo = precios[precios.length - 1];
  const suficientes = precios.length >= MINIMO_DATOS_INDICADOR;
  const sd = suficientes ? desviacionEstandarMuestral(rendimientosDiarios(precios)) : null;
  const mm = suficientes ? mediaMovil(precios) : null;
  return {
    rendimientoPeriodoPct: precios.length >= 2 ? (ultimo / primero - 1) * 100 : null,
    maximo: Math.max(...precios),
    minimo: Math.min(...precios),
    volatilidadPct: sd === null ? null : sd * 100,
    mediaMovil20: mm,
    tendencia: mm === null ? null : ultimo > mm ? 'ALCISTA' : 'BAJISTA',
  };
}
