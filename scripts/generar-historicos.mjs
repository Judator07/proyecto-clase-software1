#!/usr/bin/env node
/**
 * Genera migrations/0004_historicos.sql con 5 años de cierres diarios de cada instrumento del catálogo,
 * tomados del proveedor de datos (Yahoo Finance, TBD-1).
 *
 * Motivo: los gráficos (RF-07, RF-15) y las estadísticas (RF-16) deben funcionar desde el primer
 * despliegue y aunque el proveedor falle (RNF-04). Luego el cron (RF-17) mantiene los datos al día.
 *
 * Uso: node scripts/generar-historicos.mjs
 */
import { writeFileSync } from 'node:fs';

// Debe coincidir con los identificadores de migrations/0002_catalogo.sql.
const CATALOGO = [
  [1, 'AAPL'], [2, 'MSFT'], [3, 'GOOGL'], [4, 'AMZN'], [5, 'NVDA'], [6, 'TSLA'], [7, 'JPM'], [8, 'KO'],
  [9, 'SPY'], [10, 'QQQ'], [11, 'VTI'], [12, 'EEM'], [13, 'GLD'],
  [14, 'BTC-USD'], [15, 'ETH-USD'], [16, 'SOL-USD'], [17, 'XRP-USD'], [18, 'ADA-USD'],
];
const FILAS_POR_INSERT = 400; // mantiene cada sentencia muy por debajo del límite de 100 KB de D1

async function obtenerSerie(simbolo) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=5y&interval=1d`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimuladorInversionUIS/1.0)' } });
  if (!r.ok) throw new Error(`${simbolo}: HTTP ${r.status}`);
  const res = (await r.json()).chart.result[0];
  const offset = res.meta.gmtoffset ?? 0;
  const cierres = res.indicators.quote[0].close;
  const porFecha = new Map();
  res.timestamp.forEach((ts, i) => {
    const cierre = cierres[i];
    if (cierre == null || !(cierre > 0)) return;
    const fecha = new Date((ts + offset) * 1000).toISOString().slice(0, 10);
    porFecha.set(fecha, Number(cierre.toPrecision(10)));
  });
  return { meta: res.meta, filas: [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b)) };
}

const lineas = [
  '-- Migración 0004: históricos de precios de cierre diarios (5 años) y último precio conocido.',
  `-- Generado por scripts/generar-historicos.mjs el ${new Date().toISOString()} desde Yahoo Finance.`,
  '',
];
let total = 0;
for (const [id, simbolo] of CATALOGO) {
  const { meta, filas } = await obtenerSerie(simbolo);
  for (let i = 0; i < filas.length; i += FILAS_POR_INSERT) {
    const valores = filas
      .slice(i, i + FILAS_POR_INSERT)
      .map(([fecha, precio]) => `(${id},'${fecha}',${precio})`)
      .join(',');
    lineas.push(`INSERT INTO cotizacion_historica (instrumento_id, fecha, precio_cierre) VALUES ${valores};`);
  }
  const precio = Number(meta.regularMarketPrice.toPrecision(10));
  const anterior = filas.length >= 2 ? filas[filas.length - 2][1] : precio;
  const fecha = new Date(meta.regularMarketTime * 1000).toISOString();
  lineas.push(
    `UPDATE instrumento SET precio_actual = ${precio}, precio_cierre_anterior = ${anterior}, ` +
      `fecha_actualizacion = '${fecha}', estado_precio = 'DESACTUALIZADO' WHERE id = ${id};`,
  );
  total += filas.length;
  console.log(`${simbolo.padEnd(8)} ${String(filas.length).padStart(5)} cierres  ${filas[0][0]} → ${filas.at(-1)[0]}  precio ${precio}`);
}
writeFileSync(new URL('../migrations/0004_historicos.sql', import.meta.url), lineas.join('\n') + '\n');
console.log(`Total: ${total} filas`);
