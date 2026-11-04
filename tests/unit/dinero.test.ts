import { describe, expect, it } from 'vitest';
import {
  aCantidadE8,
  aCentavos,
  aDolares,
  desdeCantidadE8,
  formatearUSD,
  montoCentavos,
  SALDO_INICIAL_CENTAVOS,
} from '../../src/dominio/dinero';

describe('dinero', () => {
  it('RN-01: el saldo inicial es USD 10.000,00', () => {
    expect(formatearUSD(SALDO_INICIAL_CENTAVOS)).toBe('USD 10.000,00');
  });

  it('formatea con punto de miles y coma decimal (SRS 1.2)', () => {
    expect(formatearUSD(150000)).toBe('USD 1.500,00');
    expect(formatearUSD(-12345)).toBe('-USD 123,45');
    expect(formatearUSD(0)).toBe('USD 0,00');
  });

  it('convierte entre dólares y centavos sin errores de redondeo', () => {
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(1126.825)).toBe(112683);
    expect(aDolares(150000)).toBe(1500);
  });

  it('convierte cantidades con 8 decimales', () => {
    expect(aCantidadE8(0.05)).toBe(5_000_000);
    expect(aCantidadE8(0.00000001)).toBe(1);
    expect(desdeCantidadE8(1_000_000_000)).toBe(10);
  });

  it('RF-08: 10 unidades a USD 150,00 cuestan USD 1.500,00 y 0,05 BTC a USD 60.000,00 cuestan USD 3.000,00', () => {
    expect(montoCentavos(aCantidadE8(10), 150)).toBe(150000);
    expect(montoCentavos(aCantidadE8(0.05), 60000)).toBe(300000);
  });
});
