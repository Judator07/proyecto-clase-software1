/**
 * Representación exacta de dinero y cantidades.
 * - Dinero: centavos enteros de USD.
 * - Cantidades: unidades × 10^8 (enteros), para cubrir los 8 decimales de las criptomonedas (RN-02).
 */

export const ESCALA_CANTIDAD = 100_000_000;
export const SALDO_INICIAL_CENTAVOS = 1_000_000; // RN-01: USD 10.000,00

/** Convierte dólares a centavos redondeando al centavo más cercano. */
export function aCentavos(dolares: number): number {
  return Math.round(dolares * 100);
}

export function aDolares(centavos: number): number {
  return centavos / 100;
}

/** Convierte una cantidad decimal a unidades × 10^8. */
export function aCantidadE8(cantidad: number): number {
  return Math.round(cantidad * ESCALA_CANTIDAD);
}

export function desdeCantidadE8(cantidadE8: number): number {
  return cantidadE8 / ESCALA_CANTIDAD;
}

/** Monto en centavos de `cantidadE8` unidades a `precio` USD por unidad. */
export function montoCentavos(cantidadE8: number, precio: number): number {
  return Math.round((cantidadE8 / ESCALA_CANTIDAD) * precio * 100);
}

const formatoNumero = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formato de la sección 1.2 del SRS: "USD 1.500,00". */
export function formatearUSD(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  return `${signo}USD ${formatoNumero.format(Math.abs(centavos) / 100)}`;
}
