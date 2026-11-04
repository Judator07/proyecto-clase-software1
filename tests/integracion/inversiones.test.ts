/** Pruebas de integración: catálogo, órdenes, ahorro, portafolios, historial, precios y administración. */
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { actualizarPrecios, esCicloDeValoracion, primerCicloDelDia } from '../../src/server/servicios/mercado';
import {
  Cliente,
  fijarPrecio,
  fijarSaldo,
  proveedor,
  registrar,
  registrarConPortafolio,
  restablecerPrecios,
} from './ayudas';

beforeEach(restablecerPrecios);

const comprar = (c: Cliente, portafolioId: number, simbolo: string, cantidad: number) =>
  c.post('/ordenes', { portafolioId, simbolo, tipo: 'COMPRA', cantidad });
const vender = (c: Cliente, portafolioId: number, simbolo: string, cantidad: number) =>
  c.post('/ordenes', { portafolioId, simbolo, tipo: 'VENTA', cantidad });

describe('RF-06 / RF-07 catálogo y precios', () => {
  it('RF-06 CA1–CA2: busca por símbolo (acción y cripto) y filtra por tipo', async () => {
    const c = await registrar();
    const aapl = (await c.get('/instrumentos?q=AAPL')).datos;
    expect(aapl[0]).toMatchObject({ simbolo: 'AAPL', precioActual: 150 });
    expect((await c.get('/instrumentos?q=BTC')).datos[0].tipo).toBe('CRIPTO');
    const etfs = (await c.get('/instrumentos?tipo=ETF')).datos as { tipo: string }[];
    expect(etfs.length).toBe(5);
    expect(etfs.every((i) => i.tipo === 'ETF')).toBe(true);
    expect((await c.get('/instrumentos?q=ZZZZ')).datos).toEqual([]);
  });

  it('RF-07: histórico del rango con aviso si está incompleto y estadísticas', async () => {
    const c = await registrar();
    await env.DB.batch(
      ['2026-10-30', '2026-10-31', '2026-11-03'].map((f, i) =>
        env.DB.prepare(
          "INSERT INTO cotizacion_historica VALUES ((SELECT id FROM instrumento WHERE simbolo='AAPL'), ?, ?)",
        ).bind(f, 140 + i),
      ),
    );
    const r = await c.get('/instrumentos/AAPL/historico?rango=1A');
    expect(r.estado).toBe(200);
    expect(r.datos.puntos.length).toBeGreaterThanOrEqual(3);
    expect(r.datos.aviso).toContain('No hay datos para todo el rango');
    expect(r.datos.estadisticas.volatilidadPct).toBeNull(); // menos de 20 datos
    expect((await c.get('/instrumentos/AAPL/historico?rango=3X')).estado).toBe(400);
  });
});

describe('RF-08 comprar instrumento', () => {
  it('CA1: comprar 10 unidades a USD 150,00 reduce el saldo exactamente en USD 1.500,00', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const r = await comprar(c, portafolioId, 'AAPL', 10);
    expect(r.datos.transaccion).toMatchObject({ estado: 'EJECUTADA', montoCentavos: 150_000, precioUnitario: 150 });
    expect(r.datos.saldoCentavos).toBe(850_000);
  });

  it('CA2: comprar 0,05 BTC a USD 60.000,00 reduce el saldo en USD 3.000,00', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const r = await comprar(c, portafolioId, 'BTC', 0.05);
    expect(r.datos.transaccion.estado).toBe('EJECUTADA');
    expect(r.datos.saldoCentavos).toBe(700_000);
  });

  it('CA3: una compra rechazada o cancelada no modifica el saldo ni las posiciones', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const rechazada = await comprar(c, portafolioId, 'BTC', 1); // USD 60.000 > USD 10.000
    expect(rechazada.datos.transaccion.estado).toBe('RECHAZADA');
    expect(rechazada.datos.transaccion.motivo).toContain('Saldo insuficiente. Saldo disponible: USD 10.000,00');
    const cancelada = await c.post('/ordenes/cancelacion', {
      portafolioId,
      simbolo: 'AAPL',
      tipo: 'COMPRA',
      cantidad: 2,
    });
    expect(cancelada.datos.transaccion.estado).toBe('CANCELADA');
    const detalle = (await c.get(`/portafolios/${portafolioId}`)).datos;
    expect(detalle.posiciones).toEqual([]);
    expect(detalle.saldoDisponibleCentavos).toBe(1_000_000);
  });

  it('RN-02: rechaza cantidades inválidas sin registrar la orden', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    for (const [simbolo, cantidad] of [
      ['AAPL', 1.5],
      ['SPY', 0],
      ['AAPL', -2],
      ['BTC', 0.000000001],
    ] as const) {
      const r = await comprar(c, portafolioId, simbolo, cantidad);
      expect(r.estado).toBe(400);
      expect(r.datos.detalles.campo).toBe('cantidad');
    }
    expect((await c.get('/transacciones')).datos).toEqual([]);
  });

  it('el resumen de confirmación (cotización) no modifica datos', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const r = await c.post('/ordenes/cotizacion', { portafolioId, simbolo: 'AAPL', tipo: 'COMPRA', cantidad: 3 });
    expect(r.datos).toMatchObject({ montoCentavos: 45_000, saldoDespuesCentavos: 955_000, precioUnitario: 150 });
    expect((await c.get('/transacciones')).datos).toEqual([]);
  });

  it('RN-06: el costo promedio ponderado combina las compras', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 10); // 10 a 150
    await fijarPrecio('AAPL', 180);
    await comprar(c, portafolioId, 'AAPL', 5); // 5 a 180
    const posicion = (await c.get(`/portafolios/${portafolioId}`)).datos.posiciones[0];
    expect(posicion.cantidad).toBe(15);
    expect(posicion.costoPromedio).toBeCloseTo(160, 10);
  });

  it('RNF-10 / RNF-02: dos compras simultáneas que superan el saldo: solo una se ejecuta y el saldo nunca es negativo', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    // Cada compra cuesta USD 6.000 (40 × 150) y el saldo es USD 10.000.
    const [a, b] = await Promise.all([comprar(c, portafolioId, 'AAPL', 40), comprar(c, portafolioId, 'AAPL', 40)]);
    const estados = [a.datos.transaccion.estado, b.datos.transaccion.estado].sort();
    expect(estados).toEqual(['EJECUTADA', 'RECHAZADA']);
    const detalle = (await c.get(`/portafolios/${portafolioId}`)).datos;
    expect(detalle.saldoDisponibleCentavos).toBe(400_000);
    expect(detalle.posiciones[0].cantidad).toBe(40);
  });
});

describe('RF-09 vender instrumento', () => {
  it('CA1: con costo promedio USD 150, vender 10 a USD 160 abona USD 1.600 y muestra ganancia de USD 100', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 10);
    await fijarPrecio('AAPL', 160);
    const r = await vender(c, portafolioId, 'AAPL', 10);
    expect(r.datos.transaccion).toMatchObject({
      estado: 'EJECUTADA',
      montoCentavos: 160_000,
      gananciaRealizadaCentavos: 10_000,
    });
    expect(r.datos.saldoCentavos).toBe(1_000_000 - 150_000 + 160_000);
    const detalle = (await c.get(`/portafolios/${portafolioId}`)).datos;
    expect(detalle.posiciones).toEqual([]); // la cantidad llegó a cero: posición eliminada
    expect(detalle.gananciaRealizadaCentavos).toBe(10_000);
  });

  it('CA2 / RN-04: no es posible vender más unidades de las que se poseen, ni siquiera en paralelo', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 5);
    expect((await vender(c, portafolioId, 'AAPL', 6)).datos.transaccion.estado).toBe('RECHAZADA');
    expect((await vender(c, portafolioId, 'MSFT', 1)).datos.transaccion.estado).toBe('RECHAZADA');
    const [a, b] = await Promise.all([vender(c, portafolioId, 'AAPL', 5), vender(c, portafolioId, 'AAPL', 5)]);
    expect([a.datos.transaccion.estado, b.datos.transaccion.estado].sort()).toEqual(['EJECUTADA', 'RECHAZADA']);
    expect((await c.get(`/portafolios/${portafolioId}`)).datos.saldoDisponibleCentavos).toBe(1_000_000);
  });
});

describe('RF-10 cuenta de ahorro y RF-09 retiro', () => {
  it('CA2: al registrar el depósito el saldo disminuye en el monto; el retiro lo devuelve con intereses', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const dep = await c.post('/ahorro/depositos', {
      portafolioId,
      montoCentavos: 100_000,
      tasaAnualPct: 12,
      periodosPorAnio: 12,
      plazoMeses: 12,
    });
    expect(dep.datos.transaccion).toMatchObject({ tipo: 'DEPOSITO', estado: 'EJECUTADA' });
    expect(dep.datos.saldoCentavos).toBe(900_000);
    const detalle = (await c.get(`/portafolios/${portafolioId}`)).datos;
    expect(detalle.depositos).toHaveLength(1);
    expect(detalle.composicion[0].tipo).toBe('AHORRO');
    // Simula que pasó un año: el valor acumulado es USD 1.126,83 (RF-10 CA1).
    await env.DB.prepare("UPDATE deposito_ahorro SET fecha_inicio = '2020-01-01T00:00:00.000Z'").run();
    const retiro = await c.post(`/ahorro/depositos/${detalle.depositos[0].id}/retiro`);
    expect(retiro.datos.transaccion).toMatchObject({
      tipo: 'RETIRO',
      montoCentavos: 112_683,
      gananciaRealizadaCentavos: 12_683,
    });
    expect(retiro.datos.saldoCentavos).toBe(1_012_683);
    expect((await c.post(`/ahorro/depositos/${detalle.depositos[0].id}/retiro`)).estado).toBe(404);
  });

  it('depósito mayor que el saldo: Rechazado; parámetros fuera de rango: error', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const r = await c.post('/ahorro/depositos', {
      portafolioId,
      montoCentavos: 2_000_000,
      tasaAnualPct: 5,
      periodosPorAnio: 4,
      plazoMeses: 6,
    });
    expect(r.datos.transaccion.estado).toBe('RECHAZADA');
    const fuera = await c.post('/ahorro/depositos', {
      portafolioId,
      montoCentavos: 1_000,
      tasaAnualPct: 40,
      periodosPorAnio: 4,
      plazoMeses: 6,
    });
    expect(fuera.estado).toBe(400);
  });
});

describe('RF-12 / RF-13 / RF-14 portafolios', () => {
  it('RF-12: crea portafolios vacíos con nombre único y máximo 10 (RN-05)', async () => {
    const c = await registrar();
    const r = await c.post('/portafolios', { nombre: 'Largo plazo' });
    expect(r.datos).toMatchObject({ nombre: 'Largo plazo', valorCentavos: 0 });
    expect((await c.post('/portafolios', { nombre: 'largo PLAZO' })).estado).toBe(409);
    expect((await c.post('/portafolios', { nombre: '   ' })).estado).toBe(400);
    for (let i = 2; i <= 10; i++) expect((await c.post('/portafolios', { nombre: `P${i}` })).estado).toBe(201);
    const limite = await c.post('/portafolios', { nombre: 'P11' });
    expect(limite.estado).toBe(409);
    expect(limite.datos.error).toContain('límite de 10');
  });

  it('RF-14: el valor total es la suma de las posiciones y el rendimiento sigue la fórmula del SRS', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 10); // 1.500
    await comprar(c, portafolioId, 'ETH', 0.5); // 1.500
    await fijarPrecio('AAPL', 165);
    const d = (await c.get(`/portafolios/${portafolioId}`)).datos;
    const suma = d.posiciones.reduce((s: number, p: { valorCentavos: number }) => s + p.valorCentavos, 0);
    expect(d.valorCentavos).toBe(suma);
    expect(d.valorCentavos).toBe(165_000 + 150_000);
    expect(d.rendimientoPct).toBeCloseTo((15_000 / 300_000) * 100, 10);
  });

  it('RF-13: renombrar y eliminar; al eliminar se liquida al precio actual y se conserva el historial (RN-07)', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 10);
    await c.post('/ahorro/depositos', {
      portafolioId,
      montoCentavos: 50_000,
      tasaAnualPct: 0,
      periodosPorAnio: 1,
      plazoMeses: 12,
    });
    expect((await c.patch(`/portafolios/${portafolioId}`, { nombre: 'Renombrado' })).datos.nombre).toBe('Renombrado');
    await fijarPrecio('AAPL', 200);
    const r = await c.del(`/portafolios/${portafolioId}`);
    expect(r.estado).toBe(200);
    expect(r.datos.liquidadoCentavos).toBe(200_000 + 50_000);
    expect(r.datos.saldoCentavos).toBe(1_000_000 - 150_000 - 50_000 + 250_000);
    expect((await c.get('/portafolios')).datos).toEqual([]);
    expect((await c.get(`/portafolios/${portafolioId}`)).estado).toBe(404);
    const historial = (await c.get('/transacciones')).datos as { motivo: string | null }[];
    expect(historial.filter((t) => t.motivo?.startsWith('Liquidación'))).toHaveLength(2);
    // El nombre queda libre para un portafolio nuevo.
    expect((await c.post('/portafolios', { nombre: 'Renombrado' })).estado).toBe(201);
  });
});

describe('RF-11 historial de transacciones', () => {
  it('lista del más reciente al más antiguo y aplica filtros', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 2);
    await vender(c, portafolioId, 'AAPL', 1);
    await comprar(c, portafolioId, 'BTC', 5); // rechazada
    const todas = (await c.get(`/transacciones?portafolioId=${portafolioId}`)).datos;
    expect(todas.map((t: { estado: string }) => t.estado)).toEqual(['RECHAZADA', 'EJECUTADA', 'EJECUTADA']);
    expect((await c.get('/transacciones?tipo=VENTA')).datos).toHaveLength(1);
    expect((await c.get('/transacciones?simbolo=BTC')).datos).toHaveLength(1);
    expect((await c.get('/transacciones?desde=2000-01-01&hasta=2000-12-31')).datos).toEqual([]);
  });
});

describe('RF-15 / RF-17 actualización de precios y valoración diaria', () => {
  it('actualiza precios y guarda la valoración del día; ante fallas conserva el último precio (RNF-04)', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 10);
    proveedor.fallidos.add('MSFT');
    // Ciclo de las 21:00 UTC: además de los precios, guarda la valoración diaria (RF-17).
    const r = await actualizarPrecios(env.DB, proveedor, new Date('2026-11-04T21:05:00Z'));
    proveedor.fallidos.delete('MSFT');
    expect(r.fallidos).toEqual(['MSFT']);
    const aapl = (await c.get('/instrumentos/AAPL')).datos;
    expect(aapl).toMatchObject({ precioActual: 100, estadoPrecio: 'ACTUALIZADO' });
    const msft = (await c.get('/instrumentos/MSFT')).datos;
    expect(msft).toMatchObject({ precioActual: 400, estadoPrecio: 'DESACTUALIZADO' });
    const valoracion = await env.DB.prepare('SELECT valor_centavos FROM valoracion_portafolio WHERE portafolio_id = ?')
      .bind(portafolioId)
      .first<{ valor_centavos: number }>();
    expect(valoracion!.valor_centavos).toBe(100_000);
    const serie = (await c.get(`/portafolios/${portafolioId}/valoracion?rango=1M`)).datos;
    expect(serie.puntos.at(-1).valor).toBe(100_000);
  });
});

describe('RF-18 / RF-19 / RF-20 administración y contenido', () => {
  async function admin() {
    const c = await registrar();
    await env.DB.prepare("UPDATE usuario SET rol = 'ADMINISTRADOR' WHERE id = (SELECT max(id) FROM usuario)").run();
    return c;
  }

  it('RF-18: agrega instrumentos validados por el proveedor y desactiva sin impedir la venta', async () => {
    const a = await admin();
    expect((await a.post('/admin/instrumentos', { simbolo: 'NOEXISTE', nombre: 'X', tipo: 'ACCION' })).estado).toBe(
      422,
    );
    expect((await a.post('/admin/instrumentos', { simbolo: 'AAPL', nombre: 'Repetido', tipo: 'ACCION' })).estado).toBe(
      409,
    );
    const nuevo = await a.post('/admin/instrumentos', { simbolo: 'nflx', nombre: 'Netflix', tipo: 'ACCION' });
    expect(nuevo.estado).toBe(201);
    expect(nuevo.datos).toMatchObject({ simbolo: 'NFLX', precioActual: 100, activo: true });

    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'NFLX', 3);
    await a.patch(`/admin/instrumentos/${nuevo.datos.id}`, { activo: false });
    expect((await c.get('/instrumentos?q=NFLX')).datos).toEqual([]);
    expect((await comprar(c, portafolioId, 'NFLX', 1)).datos.transaccion.estado).toBe('RECHAZADA');
    expect((await vender(c, portafolioId, 'NFLX', 3)).datos.transaccion.estado).toBe('EJECUTADA');
  });

  it('RF-19: el contenido publicado se lee sin iniciar sesión y hay artículos de los seis temas', async () => {
    const visitante = new Cliente();
    const lista = (await visitante.get('/contenido')).datos as { tema: string; slug: string }[];
    expect(new Set(lista.map((a) => a.tema)).size).toBe(6);
    expect((await visitante.get(`/contenido/${lista[0].slug}`)).datos.cuerpo.length).toBeGreaterThan(100);
    expect((await visitante.get('/contenido?q=interés compuesto')).datos.length).toBeGreaterThan(0);
  });

  it('RF-20 CA1: un borrador no es visible para los usuarios; al publicarlo, sí', async () => {
    const a = await admin();
    const borrador = await a.post('/admin/contenido', {
      titulo: 'Qué es un dividendo',
      tema: 'CONCEPTOS_BASICOS',
      resumen: 'Pagos a accionistas.',
      cuerpo: 'Un dividendo es una parte de las ganancias que una empresa reparte.',
      estado: 'BORRADOR',
    });
    expect(borrador.estado).toBe(201);
    const visitante = new Cliente();
    expect((await visitante.get(`/contenido/${borrador.datos.slug}`)).estado).toBe(404);
    await a.put(`/admin/contenido/${borrador.datos.id}`, { ...borrador.datos, estado: 'PUBLICADO' });
    expect((await visitante.get(`/contenido/${borrador.datos.slug}`)).estado).toBe(200);
    expect(
      (await a.post('/admin/contenido', { titulo: '', tema: 'RIESGO', cuerpo: 'x', estado: 'BORRADOR' })).estado,
    ).toBe(400);
    expect((await a.del(`/admin/contenido/${borrador.datos.id}`)).estado).toBe(200);
  });

  it('el saldo efectivo de un usuario nunca queda negativo (invariante de la BD)', async () => {
    const c = await registrar();
    await expect(fijarSaldo(c, -1)).rejects.toThrow(/CHECK constraint failed/);
  });
});

describe('regresiones de la revisión crítica (órdenes y precios)', () => {
  it('RN-03: si el precio cambió entre el resumen y la confirmación, se pide revisar sin ejecutar', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    const r = await c.post('/ordenes', {
      portafolioId,
      simbolo: 'AAPL',
      tipo: 'COMPRA',
      cantidad: 1,
      precioCotizado: 149,
    });
    expect(r.estado).toBe(409);
    expect(r.datos.error).toContain('El precio cambió');
    expect((await c.get('/transacciones')).datos).toEqual([]);
  });

  it('RF-17: los instrumentos desactivados siguen recibiendo precio (se pueden vender)', async () => {
    await env.DB.prepare("UPDATE instrumento SET activo = 0 WHERE simbolo = 'KO'").run();
    await actualizarPrecios(env.DB, proveedor, new Date());
    const ko = await env.DB.prepare("SELECT estado_precio FROM instrumento WHERE simbolo = 'KO'").first<{
      estado_precio: string;
    }>();
    expect(ko!.estado_precio).toBe('ACTUALIZADO');
    await env.DB.prepare("UPDATE instrumento SET activo = 1 WHERE simbolo = 'KO'").run();
  });

  it('RF-11: los filtros de fecha usan la hora de Colombia', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await comprar(c, portafolioId, 'AAPL', 1);
    // 20:00 del 4 de noviembre en Bogotá = 01:00Z del 5 de noviembre.
    await env.DB.prepare("UPDATE transaccion SET creado_en = '2026-11-05T01:00:00.000Z'").run();
    expect((await c.get('/transacciones?desde=2026-11-04&hasta=2026-11-04')).datos).toHaveLength(1);
    expect((await c.get('/transacciones?desde=2026-11-05&hasta=2026-11-05')).datos).toHaveLength(0);
  });
});

describe('RF-17: escrituras del cron acotadas para el plan gratuito de D1', () => {
  it('la valoración diaria solo se guarda en el ciclo de las 21:00 UTC y el relleno de huecos a las 00:00 UTC', async () => {
    expect(esCicloDeValoracion(new Date('2026-11-04T21:00:00Z'))).toBe(true);
    expect(esCicloDeValoracion(new Date('2026-11-04T21:15:00Z'))).toBe(false);
    expect(primerCicloDelDia(new Date('2026-11-05T00:00:00Z'))).toBe(true);
    expect(primerCicloDelDia(new Date('2026-11-05T00:15:00Z'))).toBe(false);
    const antes = await env.DB.prepare('SELECT count(*) AS n FROM valoracion_portafolio').first<{ n: number }>();
    await actualizarPrecios(env.DB, proveedor, new Date('2026-11-04T15:00:00Z'));
    const despues = await env.DB.prepare('SELECT count(*) AS n FROM valoracion_portafolio').first<{ n: number }>();
    expect(despues!.n).toBe(antes!.n);
  });
});
