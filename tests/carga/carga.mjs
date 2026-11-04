#!/usr/bin/env node
/**
 * Prueba de carga de RNF-01 y RNF-02: N usuarios virtuales concurrentes, cada uno con su sesión,
 * repiten un recorrido realista (perfil, catálogo, histórico, portafolio, compra y venta) durante D segundos.
 * Reporta el percentil 95 del tiempo de respuesta y la tasa de error.
 *
 * Uso: node tests/carga/carga.mjs <url> [usuarios=50] [segundos=600] [pausaMs=1000]
 */
const [url, usuarios = '50', segundos = '600', pausa = '1000'] = process.argv.slice(2);
const N = Number(usuarios);
const DURACION = Number(segundos) * 1000;
const PAUSA = Number(pausa);
const tiempos = [];
const porRuta = new Map();
let errores = 0;
const muestrasError = [];

async function pedir(cookie, metodo, ruta, cuerpo, etiqueta = ruta) {
  const inicio = performance.now();
  let estado = 0;
  try {
    const r = await fetch(url + '/api' + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie.valor ? { Cookie: cookie.valor } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    estado = r.status;
    const sc = r.headers.get('set-cookie');
    if (sc) cookie.valor = sc.split(';')[0];
    const datos = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${r.status} ${datos?.error ?? ''}`);
    return datos;
  } catch (e) {
    errores++;
    if (muestrasError.length < 10) muestrasError.push(`${metodo} ${etiqueta}: ${e.message}`);
    return null;
  } finally {
    const ms = performance.now() - inicio;
    tiempos.push(ms);
    const lista = porRuta.get(etiqueta) ?? [];
    lista.push(ms);
    porRuta.set(etiqueta, lista);
    void estado;
  }
}

const percentil = (arr, p) => {
  const o = [...arr].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)] ?? 0;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function usuarioVirtual(i, fin) {
  const cookie = { valor: '' };
  const correo = `carga${Date.now()}_${i}@prueba.co`;
  await pedir(
    cookie,
    'POST',
    '/auth/registro',
    {
      nombre: `Carga ${i}`,
      correo,
      contrasena: 'Carga1234',
      confirmacion: 'Carga1234',
      aceptaPolitica: true,
    },
    '/auth/registro',
  );
  const pf = await pedir(cookie, 'POST', '/portafolios', { nombre: 'Carga' }, '/portafolios (crear)');
  if (!pf) return;
  while (Date.now() < fin) {
    await pedir(cookie, 'GET', '/perfil');
    await pedir(cookie, 'GET', '/instrumentos');
    await pedir(cookie, 'GET', '/instrumentos/AAPL/historico?rango=1M', null, '/instrumentos/:s/historico');
    await pedir(
      cookie,
      'POST',
      '/ordenes',
      { portafolioId: pf.id, simbolo: 'KO', tipo: 'COMPRA', cantidad: 1 },
      '/ordenes (compra)',
    );
    await pedir(cookie, 'GET', `/portafolios/${pf.id}`, null, '/portafolios/:id');
    await pedir(
      cookie,
      'POST',
      '/ordenes',
      { portafolioId: pf.id, simbolo: 'KO', tipo: 'VENTA', cantidad: 1 },
      '/ordenes (venta)',
    );
    await esperar(PAUSA);
  }
}

const inicio = Date.now();
const fin = inicio + DURACION;
console.log(`Carga: ${N} usuarios concurrentes durante ${DURACION / 1000} s contra ${url}`);
await Promise.all(Array.from({ length: N }, (_, i) => esperar(i * 100).then(() => usuarioVirtual(i, fin))));
const total = tiempos.length;
console.log(
  `\nSolicitudes: ${total} en ${((Date.now() - inicio) / 1000).toFixed(0)} s (${(total / ((Date.now() - inicio) / 1000)).toFixed(1)} req/s)`,
);
console.log(`Errores: ${errores} (${((errores / total) * 100).toFixed(2)} %)`);
console.log(
  `Tiempo de respuesta: p50 ${percentil(tiempos, 50).toFixed(0)} ms · p95 ${percentil(tiempos, 95).toFixed(0)} ms · p99 ${percentil(tiempos, 99).toFixed(0)} ms · máx ${Math.max(...tiempos).toFixed(0)} ms`,
);
console.log('\nPor ruta (n · p50 · p95 ms):');
for (const [ruta, l] of porRuta)
  console.log(
    `  ${ruta.padEnd(32)} ${String(l.length).padStart(6)} · ${percentil(l, 50).toFixed(0).padStart(5)} · ${percentil(l, 95).toFixed(0).padStart(5)}`,
  );
if (muestrasError.length) console.log('\nMuestras de error:\n  ' + muestrasError.join('\n  '));
console.log(
  `\nRNF-01 (p95 ≤ 3 s): ${percentil(tiempos, 95) <= 3000 ? 'CUMPLE' : 'NO CUMPLE'} · RNF-02 (error < 1 %): ${errores / total < 0.01 ? 'CUMPLE' : 'NO CUMPLE'}`,
);
