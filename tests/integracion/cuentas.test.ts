/** Pruebas de integración: registro, sesión, perfil, bancarrota y control de acceso (RF-01..RF-05, RNF-05..07). */
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { Cliente, CONTRASENA, fijarSaldo, registrar, registrarConPortafolio, usuarioIdDe } from './ayudas';

const datosRegistro = (correo: string) => ({
  nombre: 'Carlos',
  correo,
  contrasena: CONTRASENA,
  confirmacion: CONTRASENA,
  aceptaPolitica: true,
});

describe('RF-01 registrar usuario', () => {
  it('CA1: con datos válidos se crea la cuenta y el perfil muestra USD 10.000,00', async () => {
    const c = await registrar('nuevo@prueba.co');
    const perfil = await c.get('/perfil');
    expect(perfil.estado).toBe(200);
    expect(perfil.datos.saldoCentavos).toBe(1_000_000);
    expect(perfil.datos.contadorBancarrotas).toBe(0);
  });

  it('CA2: no es posible crear dos cuentas con el mismo correo (sin importar mayúsculas)', async () => {
    await registrar('repetido@prueba.co');
    const r = await new Cliente().post('/auth/registro', datosRegistro('REPETIDO@prueba.co'));
    expect(r.estado).toBe(409);
    expect(r.datos.error).toBe('El correo ya está asociado a una cuenta.');
  });

  it('rechaza contraseñas que no cumplen RNF-05, confirmación distinta, correo inválido y falta de consentimiento (RNF-07)', async () => {
    const c = new Cliente();
    expect(
      (await c.post('/auth/registro', { ...datosRegistro('a@prueba.co'), contrasena: 'corta', confirmacion: 'corta' }))
        .estado,
    ).toBe(400);
    expect(
      (await c.post('/auth/registro', { ...datosRegistro('b@prueba.co'), confirmacion: 'Otra1234' })).datos.detalles
        .campo,
    ).toBe('confirmacion');
    expect((await c.post('/auth/registro', { ...datosRegistro('no-es-correo'), correo: 'no-es-correo' })).estado).toBe(
      400,
    );
    const sinPolitica = await c.post('/auth/registro', { ...datosRegistro('c@prueba.co'), aceptaPolitica: false });
    expect(sinPolitica.estado).toBe(400);
    expect(sinPolitica.datos.error).toContain('política de tratamiento de datos');
  });

  it('RNF-05 / RNF-07: la contraseña se guarda con hash y sal, y se registra la fecha de consentimiento', async () => {
    await registrar('hash@prueba.co');
    const fila = await env.DB.prepare('SELECT hash_contrasena, sal, acepto_politica_en FROM usuario WHERE correo = ?')
      .bind('hash@prueba.co')
      .first<{ hash_contrasena: string; sal: string; acepto_politica_en: string }>();
    expect(fila!.hash_contrasena).not.toContain(CONTRASENA);
    expect(fila!.sal.length).toBeGreaterThan(10);
    expect(fila!.acepto_politica_en).toMatch(/^\d{4}-/);
  });
});

describe('RF-02 iniciar y cerrar sesión', () => {
  it('CA1 y CA2: inicia sesión con credenciales válidas y, tras cerrarla, no hay acceso a pantallas privadas', async () => {
    await registrar('login@prueba.co');
    const c = new Cliente();
    const r = await c.post('/auth/ingreso', { correo: 'login@prueba.co', contrasena: CONTRASENA });
    expect(r.estado).toBe(200);
    expect((await c.get('/perfil')).estado).toBe(200);
    await c.post('/auth/salida');
    expect((await c.get('/perfil')).estado).toBe(401);
  });

  it('mensaje genérico para contraseña incorrecta o cuenta inexistente', async () => {
    await registrar('generico@prueba.co');
    const a = await new Cliente().post('/auth/ingreso', { correo: 'generico@prueba.co', contrasena: 'Mala1234' });
    const b = await new Cliente().post('/auth/ingreso', { correo: 'nadie@prueba.co', contrasena: 'Mala1234' });
    expect(a.estado).toBe(401);
    expect(b.estado).toBe(401);
    expect(a.datos.error).toBe('Correo o contraseña incorrectos.');
    expect(b.datos.error).toBe(a.datos.error);
  });

  it('cinco intentos fallidos consecutivos bloquean la cuenta 15 minutos', async () => {
    await registrar('bloqueo@prueba.co');
    const c = new Cliente();
    for (let i = 0; i < 4; i++) {
      expect((await c.post('/auth/ingreso', { correo: 'bloqueo@prueba.co', contrasena: 'Mala1234' })).estado).toBe(401);
    }
    expect((await c.post('/auth/ingreso', { correo: 'bloqueo@prueba.co', contrasena: 'Mala1234' })).estado).toBe(423);
    // Incluso con la contraseña correcta queda bloqueada.
    expect((await c.post('/auth/ingreso', { correo: 'bloqueo@prueba.co', contrasena: CONTRASENA })).estado).toBe(423);
    const fila = await env.DB.prepare('SELECT bloqueado_hasta FROM usuario WHERE correo = ?')
      .bind('bloqueo@prueba.co')
      .first<{ bloqueado_hasta: string }>();
    const minutos = (Date.parse(fila!.bloqueado_hasta) - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15);
  });
});

describe('RNF-06 control de acceso y sesión', () => {
  it('las funciones privadas requieren sesión', async () => {
    const c = new Cliente();
    for (const ruta of ['/perfil', '/portafolios', '/instrumentos', '/transacciones']) {
      expect((await c.get(ruta)).estado).toBe(401);
    }
  });

  it('la sesión expira tras 30 minutos de inactividad', async () => {
    const c = await registrar();
    await env.DB.prepare("UPDATE sesion SET expira_en = '2000-01-01T00:00:00.000Z'").run();
    const r = await c.get('/perfil');
    expect(r.estado).toBe(401);
    expect(r.datos.error).toContain('expiró');
  });

  it('un usuario no puede ver ni operar portafolios ajenos', async () => {
    const { portafolioId } = await registrarConPortafolio();
    const intruso = await registrar();
    expect((await intruso.get(`/portafolios/${portafolioId}`)).estado).toBe(404);
    expect((await intruso.del(`/portafolios/${portafolioId}`)).estado).toBe(404);
    const orden = await intruso.post('/ordenes', { portafolioId, simbolo: 'AAPL', tipo: 'COMPRA', cantidad: 1 });
    expect(orden.estado).toBe(404);
  });

  it('un usuario sin rol Administrador recibe acceso denegado en administración', async () => {
    const c = await registrar();
    expect((await c.get('/admin/instrumentos')).estado).toBe(403);
    expect((await c.post('/admin/contenido', {})).estado).toBe(403);
  });
});

describe('RF-03 / RF-04 perfil', () => {
  it('RF-04: actualiza el nombre y la contraseña verificando la actual', async () => {
    const c = await registrar('perfil@prueba.co');
    expect((await c.patch('/perfil', { nombre: 'Nuevo', contrasenaActual: 'Incorrecta1' })).estado).toBe(400);
    const r = await c.patch('/perfil', {
      nombre: 'Nuevo Nombre',
      contrasenaActual: CONTRASENA,
      nuevaContrasena: 'Distinta456',
    });
    expect(r.estado).toBe(200);
    expect(r.datos.nombre).toBe('Nuevo Nombre');
    // CA2: inicia sesión con la nueva y no con la anterior.
    expect(
      (await new Cliente().post('/auth/ingreso', { correo: 'perfil@prueba.co', contrasena: CONTRASENA })).estado,
    ).toBe(401);
    expect(
      (await new Cliente().post('/auth/ingreso', { correo: 'perfil@prueba.co', contrasena: 'Distinta456' })).estado,
    ).toBe(200);
  });

  it('RF-03 CA1: saldo = inicial − compras − depósitos + ventas + retiros', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await c.post('/ordenes', { portafolioId, simbolo: 'AAPL', tipo: 'COMPRA', cantidad: 10 }); // −1.500
    await c.post('/ordenes', { portafolioId, simbolo: 'AAPL', tipo: 'VENTA', cantidad: 4 }); // +600
    await c.post('/ahorro/depositos', {
      portafolioId,
      montoCentavos: 100_000,
      tasaAnualPct: 10,
      periodosPorAnio: 12,
      plazoMeses: 12,
    }); // −1.000
    const perfil = (await c.get('/perfil')).datos;
    expect(perfil.saldoCentavos).toBe(1_000_000 - 150_000 + 60_000 - 100_000);
    expect(perfil.valorInvertidoCentavos).toBe(6 * 15_000 + 100_000);
    expect(perfil.patrimonioCentavos).toBe(perfil.saldoCentavos + perfil.valorInvertidoCentavos);
  });
});

describe('RF-05 / RN-09 reinicio por bancarrota', () => {
  it('con patrimonio ≥ USD 100 no se permite reiniciar', async () => {
    const c = await registrar();
    expect((await c.post('/perfil/reinicio')).estado).toBe(409);
  });

  it('CA1–CA3: con USD 80 se ofrece el reinicio; tras confirmar hay USD 10.000, sin posiciones, contador +1 e historial intacto', async () => {
    const { c, portafolioId } = await registrarConPortafolio();
    await c.post('/ordenes', { portafolioId, simbolo: 'AAPL', tipo: 'COMPRA', cantidad: 1 });
    // El mercado se desploma: la acción vale USD 1 y el saldo efectivo queda en USD 79.
    await env.DB.prepare("UPDATE instrumento SET precio_actual = 1 WHERE simbolo = 'AAPL'").run();
    await fijarSaldo(c, 7_900);
    const perfil = (await c.get('/perfil')).datos;
    expect(perfil.patrimonioCentavos).toBe(8_000);
    expect(perfil.enBancarrota).toBe(true);
    // SRS v1.1: en bancarrota no se aceptan compras.
    const compra = await c.post('/ordenes', { portafolioId, simbolo: 'ETH', tipo: 'COMPRA', cantidad: 0.001 });
    expect(compra.datos.transaccion.estado).toBe('RECHAZADA');

    const r = await c.post('/perfil/reinicio');
    expect(r.estado).toBe(200);
    expect(r.datos.perfil.saldoCentavos).toBe(1_000_000);
    expect(r.datos.perfil.contadorBancarrotas).toBe(1);
    expect(r.datos.perfil.valorInvertidoCentavos).toBe(0);
    expect(r.datos.perfil.portafolios).toHaveLength(1);
    const historial = (await c.get('/transacciones')).datos;
    expect(historial.length).toBeGreaterThanOrEqual(2);
    expect(await usuarioIdDe(c)).toBeGreaterThan(0);
  });
});
