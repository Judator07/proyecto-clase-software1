/** Reglas de negocio del SRS (sección 5.5) y validaciones de entrada compartidas por cliente y servidor. */

export type TipoInstrumento = 'ACCION' | 'ETF' | 'CRIPTO' | 'AHORRO';

export const NOMBRES_TIPO: Record<TipoInstrumento, string> = {
  ACCION: 'Acción',
  ETF: 'ETF',
  CRIPTO: 'Criptomoneda',
  AHORRO: 'Cuenta de ahorro',
};

/** RN-09: umbral de bancarrota simulada, USD 100,00 (1 % del saldo inicial). */
export const UMBRAL_BANCARROTA_CENTAVOS = 10_000;
/** RN-05: máximo de portafolios por usuario. */
export const MAX_PORTAFOLIOS = 10;
/** RN-02: decimales máximos de las criptomonedas. */
export const DECIMALES_CRIPTO = 8;
/** Tope técnico por operación para mantener la aritmética entera exacta (< 2^53). */
export const CANTIDAD_MAXIMA = 10_000_000;

export type Resultado = { ok: true } | { ok: false; mensaje: string };

/** RN-02: acciones y ETF en unidades enteras > 0; criptomonedas con hasta 8 decimales. */
export function validarCantidad(tipo: TipoInstrumento, cantidad: number): Resultado {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { ok: false, mensaje: 'La cantidad debe ser mayor que cero.' };
  }
  if (cantidad > CANTIDAD_MAXIMA) {
    return { ok: false, mensaje: `La cantidad no puede superar ${CANTIDAD_MAXIMA.toLocaleString('es-CO')} unidades.` };
  }
  if (tipo === 'ACCION' || tipo === 'ETF') {
    if (!Number.isInteger(cantidad)) {
      return { ok: false, mensaje: 'Las acciones y los ETF se operan en unidades enteras.' };
    }
    return { ok: true };
  }
  if (tipo === 'CRIPTO') {
    const escalado = cantidad * 10 ** DECIMALES_CRIPTO;
    if (Math.abs(escalado - Math.round(escalado)) > 1e-6) {
      return { ok: false, mensaje: `Las criptomonedas admiten como máximo ${DECIMALES_CRIPTO} decimales.` };
    }
    return { ok: true };
  }
  return { ok: false, mensaje: 'Las cuentas de ahorro se operan mediante depósitos.' };
}

/** RN-09: bancarrota si el patrimonio total es menor que USD 100,00. */
export function estaEnBancarrota(patrimonioCentavos: number): boolean {
  return patrimonioCentavos < UMBRAL_BANCARROTA_CENTAVOS;
}

/** RNF-05: mínimo 8 caracteres, al menos una letra y un número. Devuelve las reglas incumplidas. */
export function validarContrasena(contrasena: string): string[] {
  const errores: string[] = [];
  if (contrasena.length < 8) errores.push('Debe tener al menos 8 caracteres.');
  if (!/\p{L}/u.test(contrasena)) errores.push('Debe incluir al menos una letra.');
  if (!/\d/.test(contrasena)) errores.push('Debe incluir al menos un número.');
  return errores;
}

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function correoValido(correo: string): boolean {
  return REGEX_CORREO.test(correo.trim());
}

/** RF-12: nombre obligatorio de hasta 50 caracteres. */
export function validarNombrePortafolio(nombre: string): Resultado {
  const limpio = nombre.trim();
  if (limpio.length === 0) return { ok: false, mensaje: 'El nombre del portafolio es obligatorio.' };
  if (limpio.length > 50) return { ok: false, mensaje: 'El nombre no puede superar 50 caracteres.' };
  return { ok: true };
}
