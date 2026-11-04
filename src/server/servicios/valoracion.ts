/** Valoración de los portafolios de un usuario (RF-03, RF-14, RN-09), compartida por varios servicios. */
import type { DepositoDto, PosicionDto } from '../../compartido/tipos';
import { valorDepositoALaFecha } from '../../dominio/ahorro';
import { desdeCantidadE8, montoCentavos } from '../../dominio/dinero';
import { resumirPortafolio, type ResumenPortafolio } from '../../dominio/portafolio';
import {
  stmtDepositosDeUsuario,
  stmtPosicionesDeUsuario,
  type FilaDeposito,
  type FilaPosicion,
} from '../datos/portafolios';

export interface ValoracionPortafolio {
  posiciones: PosicionDto[];
  depositos: DepositoDto[];
  resumen: ResumenPortafolio;
  /** Fecha de actualización más antigua entre los precios desactualizados, o null. */
  precioMasAntiguoDesactualizado: string | null;
}

export function aPosicionDto(f: FilaPosicion): PosicionDto {
  const precio = f.precio_actual ?? 0;
  const valor = montoCentavos(f.cantidad_e8, precio);
  const capital = montoCentavos(f.cantidad_e8, f.costo_promedio);
  return {
    instrumentoId: f.instrumento_id,
    simbolo: f.simbolo,
    nombre: f.nombre,
    tipo: f.tipo,
    activo: f.activo === 1,
    cantidad: desdeCantidadE8(f.cantidad_e8),
    costoPromedio: f.costo_promedio,
    precioActual: f.precio_actual,
    fechaActualizacion: f.fecha_actualizacion,
    estadoPrecio: f.estado_precio,
    valorCentavos: valor,
    capitalCentavos: capital,
    gananciaCentavos: valor - capital,
    gananciaPct: capital > 0 ? ((valor - capital) / capital) * 100 : null,
  };
}

export function aDepositoDto(f: FilaDeposito, ahora: Date): DepositoDto {
  const valor = valorDepositoALaFecha(
    {
      montoCentavos: f.monto_centavos,
      tasaAnualPct: f.tasa_anual_pct,
      periodosPorAnio: f.periodos_por_anio,
      plazoMeses: f.plazo_meses,
      fechaInicio: f.fecha_inicio,
    },
    ahora,
  );
  return {
    id: f.id,
    montoCentavos: f.monto_centavos,
    tasaAnualPct: f.tasa_anual_pct,
    periodosPorAnio: f.periodos_por_anio,
    plazoMeses: f.plazo_meses,
    fechaInicio: f.fecha_inicio,
    valorCentavos: valor,
    interesesCentavos: valor - f.monto_centavos,
  };
}

/** Valora todos los portafolios activos del usuario con dos lecturas en un solo viaje a la BD. */
export async function valorarPortafoliosDeUsuario(
  db: D1Database,
  usuarioId: number,
  ahora = new Date(),
): Promise<Map<number, ValoracionPortafolio>> {
  const [posiciones, depositos] = await db.batch<FilaPosicion | FilaDeposito>([
    stmtPosicionesDeUsuario(db, usuarioId),
    stmtDepositosDeUsuario(db, usuarioId),
  ]);
  return valorarFilas(posiciones.results as FilaPosicion[], depositos.results as FilaDeposito[], ahora);
}

/** Agrupa posiciones y depósitos por portafolio y calcula su resumen con la capa de dominio. */
export function valorarFilas(
  posiciones: FilaPosicion[],
  depositos: FilaDeposito[],
  ahora: Date,
): Map<number, ValoracionPortafolio> {
  const porPortafolio = new Map<number, { posiciones: FilaPosicion[]; depositos: FilaDeposito[] }>();
  const grupo = (id: number) => {
    let g = porPortafolio.get(id);
    if (!g) porPortafolio.set(id, (g = { posiciones: [], depositos: [] }));
    return g;
  };
  for (const p of posiciones) grupo(p.portafolio_id).posiciones.push(p);
  for (const d of depositos) grupo(d.portafolio_id).depositos.push(d);

  const resultado = new Map<number, ValoracionPortafolio>();
  for (const [id, g] of porPortafolio) {
    const pos = g.posiciones.map(aPosicionDto);
    const dep = g.depositos.map((d) => aDepositoDto(d, ahora));
    const desactualizados = pos.filter((p) => p.estadoPrecio !== 'ACTUALIZADO' && p.fechaActualizacion);
    resultado.set(id, {
      posiciones: pos,
      depositos: dep,
      resumen: resumirPortafolio(
        g.posiciones.map((p) => ({
          tipo: p.tipo,
          cantidadE8: p.cantidad_e8,
          costoPromedio: p.costo_promedio,
          precioActual: p.precio_actual ?? 0,
        })),
        dep.map((d) => ({ capitalCentavos: d.montoCentavos, valorCentavos: d.valorCentavos })),
      ),
      precioMasAntiguoDesactualizado: desactualizados.map((p) => p.fechaActualizacion!).sort()[0] ?? null,
    });
  }
  return resultado;
}

export function resumenVacio(): ValoracionPortafolio {
  return { posiciones: [], depositos: [], resumen: resumirPortafolio([]), precioMasAntiguoDesactualizado: null };
}

/** Valor de mercado total de las inversiones del usuario (para el patrimonio de RN-09). */
export function valorInvertidoTotal(valoraciones: Map<number, ValoracionPortafolio>): number {
  let total = 0;
  for (const v of valoraciones.values()) total += v.resumen.valorTotalCentavos;
  return total;
}
