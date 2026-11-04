/** Formatos de presentación del SRS (sección 1.2 y 3.1): fechas dd/mm/aaaa y porcentajes en español. */

const ZONA = 'America/Bogota';

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: ZONA,
});
const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ZONA,
});

/** "2026-11-04T15:30:00Z" → "04/11/2026". Las fechas AAAA-MM-DD se muestran tal cual, sin desfase horario. */
export function formatearFecha(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }
  return formatoFecha.format(new Date(iso));
}

/** "04/11/2026 10:30" (hora de Colombia). */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  return `${formatoFecha.format(fecha)} ${formatoHora.format(fecha)}`;
}

/** 12.3456 → "+12,35 %" (con signo opcional). */
export function formatearPct(valor: number | null, conSigno = false): string {
  if (valor === null || !Number.isFinite(valor)) return 'No disponible';
  const texto = valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${conSigno && valor > 0 ? '+' : ''}${texto} %`;
}

/** Cantidades: enteros sin decimales; criptomonedas hasta 8 decimales. */
export function formatearCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-CO', { maximumFractionDigits: 8 });
}

const formatoISO = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: ZONA,
});

/** Fecha calendario en Colombia en formato AAAA-MM-DD (para cierres y valoraciones diarias). */
export function fechaISOColombia(fecha: Date): string {
  return formatoISO.format(fecha);
}
