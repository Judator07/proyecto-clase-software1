/**
 * Proveedor externo de datos de mercado (actor "Proveedor de datos de mercado" del análisis, TBD-1).
 * La interfaz desacopla la lógica de negocio del proveedor concreto: cambiar de proveedor solo requiere
 * otro adaptador.
 */

export interface CierreDiario {
  fecha: string; // AAAA-MM-DD
  precio: number;
}

export interface Cotizacion {
  precio: number;
  /** Fecha y hora del último precio en el mercado (ISO). */
  fechaHora: string;
  cierreAnterior: number | null;
  /** Cierres diarios recientes, incluido el del día del último precio. */
  cierres: CierreDiario[];
}

export interface ProveedorDatosMercado {
  readonly nombre: string;
  obtenerCotizacion(simboloProveedor: string): Promise<Cotizacion>;
}

interface RespuestaYahoo {
  chart?: {
    result?: {
      meta: { regularMarketPrice?: number; regularMarketTime?: number; gmtoffset?: number };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
}

/** Adaptador para la API de gráficos de Yahoo Finance (sin clave). */
export class ProveedorYahoo implements ProveedorDatosMercado {
  readonly nombre = 'Yahoo Finance';

  async obtenerCotizacion(simboloProveedor: string): Promise<Cotizacion> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simboloProveedor)}?range=1mo&interval=1d`;
    const respuesta = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimuladorInversionUIS/1.0)' },
    });
    if (!respuesta.ok) throw new Error(`El proveedor respondió HTTP ${respuesta.status}`);
    const resultado = ((await respuesta.json()) as RespuestaYahoo).chart?.result?.[0];
    const precio = resultado?.meta.regularMarketPrice;
    const tiempo = resultado?.meta.regularMarketTime;
    // RF-17: un dato vacío, cero o negativo se descarta.
    if (!resultado || typeof precio !== 'number' || !(precio > 0) || typeof tiempo !== 'number') {
      throw new Error('El proveedor entregó un precio inválido');
    }
    const desfase = resultado.meta.gmtoffset ?? 0;
    const aFecha = (segundos: number) => new Date((segundos + desfase) * 1000).toISOString().slice(0, 10);
    const fechaMercado = aFecha(tiempo);
    const valores = resultado.indicators.quote[0]?.close ?? [];
    const cierres: CierreDiario[] = (resultado.timestamp ?? [])
      .map((ts, i) => ({ fecha: aFecha(ts), precio: valores[i] }))
      .filter((c): c is CierreDiario => typeof c.precio === 'number' && c.precio > 0 && c.fecha < fechaMercado);
    const cierreAnterior = cierres.at(-1)?.precio ?? null;
    // El cierre del día de mercado en curso es el último precio conocido.
    cierres.push({ fecha: fechaMercado, precio });
    return { precio, fechaHora: new Date(tiempo * 1000).toISOString(), cierreAnterior, cierres };
  }
}
