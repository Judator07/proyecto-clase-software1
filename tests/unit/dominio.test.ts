/**
 * Pruebas unitarias de la capa de dominio. Cada caso cita el criterio de aceptación del SRS v1.0
 * que verifica (RNF-11: pruebas de los cálculos financieros).
 */
import { describe, expect, it } from 'vitest';
import { proyectarAhorro, validarParametrosAhorro, valorDepositoALaFecha, valorFuturo } from '../../src/dominio/ahorro';
import { aCantidadE8 } from '../../src/dominio/dinero';
import { ESCENARIOS_PREDEFINIDOS, simularEscenario, validarVariables } from '../../src/dominio/escenarios';
import { calcularEstadisticas, desviacionEstandarMuestral, mediaMovil } from '../../src/dominio/estadisticas';
import { formatearCantidad, formatearFecha, formatearFechaHora, formatearPct } from '../../src/dominio/formato';
import { gananciaRealizadaCentavos, nuevoCostoPromedio, resumirPortafolio } from '../../src/dominio/portafolio';
import {
  correoValido,
  estaEnBancarrota,
  validarCantidad,
  validarContrasena,
  validarNombrePortafolio,
} from '../../src/dominio/reglas';

describe('RN-02 validación de cantidades', () => {
  it('acciones y ETF solo en unidades enteras mayores que cero', () => {
    expect(validarCantidad('ACCION', 10)).toEqual({ ok: true });
    expect(validarCantidad('ETF', 1)).toEqual({ ok: true });
    expect(validarCantidad('ACCION', 1.5).ok).toBe(false);
    expect(validarCantidad('ETF', 0).ok).toBe(false);
    expect(validarCantidad('ACCION', -3).ok).toBe(false);
    expect(validarCantidad('ACCION', Number.NaN).ok).toBe(false);
  });

  it('criptomonedas con hasta 8 decimales', () => {
    expect(validarCantidad('CRIPTO', 0.05)).toEqual({ ok: true });
    expect(validarCantidad('CRIPTO', 0.00000001)).toEqual({ ok: true });
    expect(validarCantidad('CRIPTO', 0.000000001).ok).toBe(false);
  });

  it('rechaza cantidades por encima del tope técnico y depósitos como unidades', () => {
    expect(validarCantidad('ACCION', 20_000_000).ok).toBe(false);
    expect(validarCantidad('AHORRO', 1).ok).toBe(false);
  });
});

describe('RN-09 bancarrota simulada', () => {
  it('RF-05 CA1: con patrimonio de USD 80,00 está en bancarrota', () => {
    expect(estaEnBancarrota(8_000)).toBe(true);
  });
  it('con USD 100,00 o más no está en bancarrota', () => {
    expect(estaEnBancarrota(10_000)).toBe(false);
    expect(estaEnBancarrota(1_000_000)).toBe(false);
  });
});

describe('RNF-05 política de contraseñas y validaciones de registro', () => {
  it('exige 8 caracteres, una letra y un número', () => {
    expect(validarContrasena('Segura123')).toEqual([]);
    expect(validarContrasena('corta1')).toHaveLength(1);
    expect(validarContrasena('12345678')).toEqual(['Debe incluir al menos una letra.']);
    expect(validarContrasena('sinnumeros')).toEqual(['Debe incluir al menos un número.']);
  });
  it('valida el formato del correo', () => {
    expect(correoValido('ana@uis.edu.co')).toBe(true);
    expect(correoValido('ana@uis')).toBe(false);
    expect(correoValido('ana uis.edu.co')).toBe(false);
  });
  it('RF-12: nombre de portafolio obligatorio y de máximo 50 caracteres', () => {
    expect(validarNombrePortafolio('Largo plazo').ok).toBe(true);
    expect(validarNombrePortafolio('   ').ok).toBe(false);
    expect(validarNombrePortafolio('x'.repeat(51)).ok).toBe(false);
  });
});

describe('RF-10 cuenta de ahorro con interés compuesto', () => {
  it('CA1: P = USD 1.000, r = 12 %, mensual, t = 1 año → USD 1.126,83', () => {
    const r = proyectarAhorro({ montoCentavos: 100_000, tasaAnualPct: 12, periodosPorAnio: 12, plazoMeses: 12 });
    expect(r.valorFinalCentavos).toBe(112_683);
    expect(r.interesesCentavos).toBe(12_683);
    expect(r.filas).toHaveLength(12);
    expect(r.filas[0].saldoCentavos).toBe(101_000);
    expect(r.filas[11].saldoCentavos).toBe(112_683);
  });

  it('capitalización trimestral y anual con los mismos datos', () => {
    expect(Math.round(valorFuturo(1000, 12, 4, 1) * 100)).toBe(112_551);
    expect(Math.round(valorFuturo(1000, 12, 1, 1) * 100)).toBe(112_000);
  });

  it('agrega la fila final cuando el plazo no completa un periodo', () => {
    const r = proyectarAhorro({ montoCentavos: 100_000, tasaAnualPct: 12, periodosPorAnio: 4, plazoMeses: 5 });
    expect(r.filas.map((f) => f.mes)).toEqual([3, 5]);
    expect(r.filas.at(-1)?.saldoCentavos).toBe(r.valorFinalCentavos);
  });

  it('con tasa 0 % el valor no cambia', () => {
    expect(
      proyectarAhorro({ montoCentavos: 50_000, tasaAnualPct: 0, periodosPorAnio: 1, plazoMeses: 24 })
        .valorFinalCentavos,
    ).toBe(50_000);
  });

  it('valida rangos: tasa 0–30 %, plazo 1–120 meses, monto > 0', () => {
    expect(
      validarParametrosAhorro({ montoCentavos: 100, tasaAnualPct: 12, periodosPorAnio: 12, plazoMeses: 12 }),
    ).toEqual([]);
    expect(
      validarParametrosAhorro({ montoCentavos: 0, tasaAnualPct: 31, periodosPorAnio: 12, plazoMeses: 121 }),
    ).toHaveLength(3);
    expect(
      validarParametrosAhorro({ montoCentavos: 100, tasaAnualPct: 5, periodosPorAnio: 2 as 1, plazoMeses: 12 }),
    ).toHaveLength(1);
  });

  it('el valor a la fecha crece con el tiempo y se detiene en el plazo', () => {
    const deposito = {
      montoCentavos: 100_000,
      tasaAnualPct: 12,
      periodosPorAnio: 12 as const,
      plazoMeses: 12,
      fechaInicio: '2025-01-01T00:00:00Z',
    };
    expect(valorDepositoALaFecha(deposito, new Date('2025-01-01T00:00:00Z'))).toBe(100_000);
    const aMitad = valorDepositoALaFecha(deposito, new Date('2025-07-02T00:00:00Z'));
    expect(aMitad).toBeGreaterThan(100_000);
    expect(aMitad).toBeLessThan(112_683);
    expect(valorDepositoALaFecha(deposito, new Date('2030-01-01T00:00:00Z'))).toBe(112_683);
  });
});

describe('RN-06 costo promedio y RF-09 ganancia realizada', () => {
  it('costo promedio ponderado de dos compras', () => {
    expect(nuevoCostoPromedio(aCantidadE8(10), 100, aCantidadE8(10), 200)).toBe(150);
    expect(nuevoCostoPromedio(0, 0, aCantidadE8(5), 42)).toBe(42);
    expect(nuevoCostoPromedio(0, 0, 0, 10)).toBe(0);
  });

  it('RF-09 CA1: costo USD 150, vender 10 a USD 160 → ganancia USD 100,00', () => {
    expect(gananciaRealizadaCentavos(aCantidadE8(10), 160, 150)).toBe(10_000);
    expect(gananciaRealizadaCentavos(aCantidadE8(10), 140, 150)).toBe(-10_000);
  });
});

describe('RF-14 balance y rendimiento del portafolio', () => {
  it('rendimiento = (valor de mercado − capital invertido) / capital invertido × 100', () => {
    const r = resumirPortafolio(
      [
        { tipo: 'ACCION', cantidadE8: aCantidadE8(10), costoPromedio: 150, precioActual: 165 },
        { tipo: 'CRIPTO', cantidadE8: aCantidadE8(0.05), costoPromedio: 60_000, precioActual: 54_000 },
      ],
      [{ capitalCentavos: 100_000, valorCentavos: 110_000 }],
    );
    // valor: 1.650 + 2.700 + 1.100 = 5.450; capital: 1.500 + 3.000 + 1.000 = 5.500
    expect(r.valorTotalCentavos).toBe(545_000);
    expect(r.capitalInvertidoCentavos).toBe(550_000);
    expect(r.gananciaNoRealizadaCentavos).toBe(-5_000);
    expect(r.rendimientoPct).toBeCloseTo(-0.909091, 5);
    expect(r.composicion.map((c) => c.tipo)).toEqual(['CRIPTO', 'ACCION', 'AHORRO']);
    expect(r.composicion.reduce((s, c) => s + c.porcentaje, 0)).toBeCloseTo(100, 10);
  });

  it('RF-14: un portafolio vacío vale cero y no tiene rendimiento', () => {
    const r = resumirPortafolio([]);
    expect(r.valorTotalCentavos).toBe(0);
    expect(r.rendimientoPct).toBeNull();
    expect(r.composicion).toEqual([]);
  });
});

describe('RF-16 estadísticas y tendencias (fixture calculado con Python statistics)', () => {
  // 25 cierres reales de AAPL (04/11/2021 en adelante). Valores esperados calculados de forma independiente.
  const precios = [
    150.9600067, 151.2799988, 150.4400024, 150.8099976, 147.9199982, 147.8699951, 149.9900055, 150.0, 151.0,
    153.4900055, 157.8699951, 160.5500031, 161.0200043, 161.4100037, 161.9400024, 156.8099976, 160.2400055, 165.3000031,
    164.7700043, 163.7599945, 161.8399963, 165.3200073, 171.1799927, 175.0800018, 174.5599976,
  ];

  it('CA1: coincide con el cálculo independiente con tolerancia de 0,01', () => {
    const e = calcularEstadisticas(precios);
    expect(e.rendimientoPeriodoPct).toBeCloseTo(15.633274, 2);
    expect(e.maximo).toBeCloseTo(175.0800018, 2);
    expect(e.minimo).toBeCloseTo(147.8699951, 2);
    expect(e.volatilidadPct).toBeCloseTo(1.621607, 2);
    expect(e.mediaMovil20).toBeCloseTo(160.700001, 2);
    expect(e.tendencia).toBe('ALCISTA');
  });

  it('con menos de 20 datos la volatilidad y la tendencia quedan "No disponible"', () => {
    const e = calcularEstadisticas(precios.slice(0, 10));
    expect(e.volatilidadPct).toBeNull();
    expect(e.tendencia).toBeNull();
    expect(e.rendimientoPeriodoPct).not.toBeNull();
    expect(formatearPct(e.volatilidadPct)).toBe('No disponible');
  });

  it('serie vacía o de un dato', () => {
    expect(calcularEstadisticas([]).maximo).toBeNull();
    expect(calcularEstadisticas([10]).rendimientoPeriodoPct).toBeNull();
    expect(desviacionEstandarMuestral([1])).toBeNull();
    expect(mediaMovil([1, 2, 3])).toBeNull();
  });

  it('tendencia bajista cuando el último precio está bajo la media móvil', () => {
    const bajista = [...precios].reverse();
    expect(calcularEstadisticas(bajista).tendencia).toBe('BAJISTA');
  });
});

describe('RF-21 / RF-22 escenarios de mercado (RN-08)', () => {
  it('RF-21 CA1: Crisis financiera sobre USD 1.000 solo en acciones → USD 700,00', () => {
    const r = simularEscenario(
      [{ tipo: 'ACCION', valorCentavos: 100_000 }],
      [],
      ESCENARIOS_PREDEFINIDOS.CRISIS.variables,
      12,
    );
    expect(r.valorProyectadoCentavos).toBe(70_000);
    expect(r.variacionPct).toBeCloseTo(-30, 10);
  });

  it('RF-22 CA1: valor proyectado USD 1.000 con volatilidad 10 % → rango USD 900 a USD 1.100', () => {
    const r = simularEscenario(
      [{ tipo: 'ETF', valorCentavos: 100_000 }],
      [],
      { variacionPct: { ACCION: 0, ETF: 0, CRIPTO: 0 }, volatilidadPct: 10 },
      12,
    );
    expect(r.rangoPesimistaCentavos).toBe(90_000);
    expect(r.rangoOptimistaCentavos).toBe(110_000);
  });

  it('los depósitos se proyectan con la nueva tasa durante el horizonte, sin bajar de 0 %', () => {
    const deposito = { valorCentavos: 100_000, tasaAnualPct: 1, periodosPorAnio: 12 as const };
    const crisis = simularEscenario([], [deposito], ESCENARIOS_PREDEFINIDOS.CRISIS.variables, 12);
    expect(crisis.valorProyectadoCentavos).toBe(100_000); // 1 % − 2 p.p. → 0 %
    const alza = simularEscenario([], [deposito], ESCENARIOS_PREDEFINIDOS.ALZA_TASAS.variables, 12);
    expect(alza.valorProyectadoCentavos).toBe(Math.round(valorFuturo(100_000, 4, 12, 1)));
    const personalizado = simularEscenario(
      [],
      [deposito],
      { variacionPct: { ACCION: 0, ETF: 0, CRIPTO: 0 }, tasaAhorroPct: 12 },
      12,
    );
    expect(personalizado.valorProyectadoCentavos).toBe(112_683);
  });

  it('escenario alcista y portafolio mixto con detalle por tipo', () => {
    const r = simularEscenario(
      [
        { tipo: 'ACCION', valorCentavos: 100_000 },
        { tipo: 'CRIPTO', valorCentavos: 50_000 },
        { tipo: 'ACCION', valorCentavos: 100_000 },
      ],
      [],
      ESCENARIOS_PREDEFINIDOS.ALCISTA.variables,
      6,
    );
    expect(r.valorProyectadoCentavos).toBe(240_000 + 70_000);
    expect(r.detalle).toHaveLength(2);
    expect(r.explicacion).toContain('acciones +20 %');
  });

  it('portafolio vacío: variación 0', () => {
    expect(simularEscenario([], [], ESCENARIOS_PREDEFINIDOS.CRISIS.variables, 12).variacionPct).toBe(0);
  });

  it('valida los rangos de RF-21 y RF-22', () => {
    const base = { variacionPct: { ACCION: 0, ETF: 0, CRIPTO: 150 }, tasaAhorroPct: 10, volatilidadPct: 50 };
    expect(validarVariables(base, 12)).toEqual([]);
    expect(validarVariables(base, 61)).toHaveLength(1);
    expect(
      validarVariables(
        { variacionPct: { ACCION: -95, ETF: 101, CRIPTO: 201 }, tasaAhorroPct: 31, volatilidadPct: 101 },
        0,
      ),
    ).toHaveLength(6);
  });
});

describe('formatos de presentación (SRS 1.2 y 3.1)', () => {
  it('fechas dd/mm/aaaa y hora de Colombia', () => {
    expect(formatearFecha('2026-11-04')).toBe('04/11/2026');
    expect(formatearFecha('2026-11-04T15:00:00Z')).toBe('04/11/2026');
    expect(formatearFechaHora('2026-11-04T15:05:00Z')).toBe('04/11/2026 10:05');
  });
  it('porcentajes y cantidades', () => {
    expect(formatearPct(12.3456, true)).toBe('+12,35 %');
    expect(formatearPct(-3)).toBe('-3,00 %');
    expect(formatearCantidad(0.05)).toBe('0,05');
    expect(formatearCantidad(1500)).toBe('1.500');
  });
});
