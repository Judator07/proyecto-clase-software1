/**
 * IU-10: simulador de escenarios de mercado (RF-21, RF-22). La proyección es un cálculo puro de la capa de
 * dominio: nunca modifica el portafolio (RN-08).
 */
import { useState } from 'react';
import { Link } from 'react-router';
import type { DetallePortafolioDto, ResumenPortafolioDto } from '../../compartido/tipos';
import { formatearUSD } from '../../dominio/dinero';
import {
  ESCENARIOS_PREDEFINIDOS,
  LIMITES_ESCENARIO,
  simularEscenario,
  validarVariables,
  type CodigoEscenario,
  type TipoMercado,
  type VariablesEscenario,
} from '../../dominio/escenarios';
import { formatearPct } from '../../dominio/formato';
import { NOMBRES_TIPO } from '../../dominio/reglas';
import { useApi } from '../api';
import { GraficoComparativo } from '../componentes/Graficos';
import { Alerta, Cargando, ConSigno, Indicador, Pestanas, Selector, Tarjeta, Titulo, Vacio } from '../componentes/ui';

type Opcion = CodigoEscenario | 'PERSONALIZADO';

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  onCambio,
  sufijo = ' %',
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  onCambio: (v: number) => void;
  sufijo?: string;
}) {
  const id = etiqueta.replace(/\W+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="flex justify-between text-sm font-medium text-slate-800">
        <span>{etiqueta}</span>
        <span className="tabular-nums">
          {valor > 0 && sufijo === ' %' && min < 0 ? '+' : ''}
          {valor}
          {sufijo}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="w-full accent-emerald-700"
      />
      <div className="flex justify-between text-xs text-slate-700">
        <span>
          {min}
          {sufijo}
        </span>
        <span>
          {max}
          {sufijo}
        </span>
      </div>
    </div>
  );
}

export default function Escenarios() {
  const portafolios = useApi<ResumenPortafolioDto[]>('/portafolios');
  const [portafolioId, setPortafolioId] = useState<number | null>(null);
  const seleccionado = portafolioId ?? portafolios.datos?.[0]?.id ?? null;
  const detalle = useApi<DetallePortafolioDto>(seleccionado ? `/portafolios/${seleccionado}` : null);
  const [opcion, setOpcion] = useState<Opcion>('CRISIS');
  const [horizonte, setHorizonte] = useState(12);
  const [personal, setPersonal] = useState<Required<VariablesEscenario>>({
    variacionPct: { ACCION: -15, ETF: -10, CRIPTO: -30 },
    deltaTasaPp: 0,
    tasaAhorroPct: 8,
    volatilidadPct: 10,
  });

  if (portafolios.cargando && !portafolios.datos) return <Cargando />;
  if (portafolios.datos && portafolios.datos.length === 0) {
    return (
      <div>
        <Titulo>Simulador de escenarios</Titulo>
        <Vacio>
          Necesitas un portafolio con inversiones para simular escenarios.{' '}
          <Link to="/panel" className="font-semibold text-emerald-800 underline">
            Ir al panel
          </Link>
        </Vacio>
      </div>
    );
  }

  const variables: VariablesEscenario =
    opcion === 'PERSONALIZADO'
      ? {
          variacionPct: personal.variacionPct,
          tasaAhorroPct: personal.tasaAhorroPct,
          volatilidadPct: personal.volatilidadPct,
        }
      : ESCENARIOS_PREDEFINIDOS[opcion].variables;
  const errores = validarVariables(variables, horizonte);
  const d = detalle.datos;
  const vacio = d !== null && d.posiciones.length === 0 && d.depositos.length === 0;
  const resultado =
    d && !vacio && errores.length === 0
      ? simularEscenario(
          d.posiciones
            .filter((p) => p.tipo !== 'AHORRO')
            .map((p) => ({ tipo: p.tipo as TipoMercado, valorCentavos: p.valorCentavos })),
          d.depositos.map((dep) => ({
            valorCentavos: dep.valorCentavos,
            tasaAnualPct: dep.tasaAnualPct,
            periodosPorAnio: dep.periodosPorAnio,
          })),
          variables,
          horizonte,
        )
      : null;

  const cambiarVariacion = (tipo: TipoMercado) => (v: number) =>
    setPersonal((p) => ({ ...p, variacionPct: { ...p.variacionPct, [tipo]: v } }));

  return (
    <div>
      <Titulo subtitulo="Proyecta cómo cambiaría el valor de tu portafolio. Es solo una simulación: tu portafolio real no cambia.">
        Simulador de escenarios
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Configuración">
          <div className="flex flex-col gap-4">
            <Selector
              etiqueta="Portafolio"
              name="portafolio"
              value={seleccionado ?? ''}
              onChange={(e) => setPortafolioId(Number(e.target.value))}
            >
              {portafolios.datos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Selector>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-800">Escenario</p>
              <Pestanas
                etiqueta="Escenario"
                valor={opcion}
                onCambio={setOpcion}
                opciones={[
                  ...(Object.keys(ESCENARIOS_PREDEFINIDOS) as CodigoEscenario[]).map((c) => ({
                    valor: c as Opcion,
                    texto: ESCENARIOS_PREDEFINIDOS[c].nombre,
                  })),
                  { valor: 'PERSONALIZADO', texto: 'Personalizado' },
                ]}
              />
              {opcion !== 'PERSONALIZADO' && (
                <p className="mt-2 text-sm text-slate-700">{ESCENARIOS_PREDEFINIDOS[opcion].descripcion}</p>
              )}
            </div>
            <Deslizador
              etiqueta="Horizonte"
              valor={horizonte}
              min={LIMITES_ESCENARIO.horizonte[0]}
              max={LIMITES_ESCENARIO.horizonte[1]}
              onCambio={setHorizonte}
              sufijo=" meses"
            />
            {opcion === 'PERSONALIZADO' && (
              <>
                {(['ACCION', 'ETF', 'CRIPTO'] as TipoMercado[]).map((t) => (
                  <Deslizador
                    key={t}
                    etiqueta={`Variación de ${t === 'ACCION' ? 'acciones' : t === 'ETF' ? 'ETF' : 'criptomonedas'}`}
                    valor={personal.variacionPct[t]}
                    min={LIMITES_ESCENARIO[t][0]}
                    max={LIMITES_ESCENARIO[t][1]}
                    onCambio={cambiarVariacion(t)}
                  />
                ))}
                <Deslizador
                  etiqueta="Tasa nominal anual del ahorro"
                  valor={personal.tasaAhorroPct}
                  min={LIMITES_ESCENARIO.tasa[0]}
                  max={LIMITES_ESCENARIO.tasa[1]}
                  onCambio={(v) => setPersonal((p) => ({ ...p, tasaAhorroPct: v }))}
                />
                <Deslizador
                  etiqueta="Volatilidad"
                  valor={personal.volatilidadPct}
                  min={LIMITES_ESCENARIO.volatilidad[0]}
                  max={LIMITES_ESCENARIO.volatilidad[1]}
                  onCambio={(v) => setPersonal((p) => ({ ...p, volatilidadPct: v }))}
                />
              </>
            )}
            {errores.length > 0 && <Alerta tipo="error">{errores.join(' ')}</Alerta>}
          </div>
        </Tarjeta>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {detalle.cargando && !d && <Cargando />}
          {vacio && <Vacio>Agrega inversiones a este portafolio para simular un escenario.</Vacio>}
          {resultado && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Indicador etiqueta="Valor actual" valor={formatearUSD(resultado.valorActualCentavos)} />
                <Indicador
                  etiqueta={`Valor proyectado (${horizonte} meses)`}
                  valor={formatearUSD(resultado.valorProyectadoCentavos)}
                />
                <Indicador
                  etiqueta="Variación"
                  valor={
                    <ConSigno valor={resultado.variacionPct}>{formatearPct(resultado.variacionPct, true)}</ConSigno>
                  }
                />
              </div>
              {opcion === 'PERSONALIZADO' && (personal.volatilidadPct ?? 0) > 0 && (
                <Alerta tipo="info">
                  Rango de resultados con volatilidad del {personal.volatilidadPct} %: entre{' '}
                  <strong>{formatearUSD(resultado.rangoPesimistaCentavos)}</strong> (pesimista) y{' '}
                  <strong>{formatearUSD(resultado.rangoOptimistaCentavos)}</strong> (optimista).
                </Alerta>
              )}
              <Tarjeta titulo="Actual frente a escenario">
                <GraficoComparativo
                  formatear={formatearUSD}
                  datos={[
                    ...resultado.detalle.map((x) => ({
                      nombre: NOMBRES_TIPO[x.tipo],
                      actual: x.actualCentavos,
                      proyectado: x.proyectadoCentavos,
                    })),
                    {
                      nombre: 'Total',
                      actual: resultado.valorActualCentavos,
                      proyectado: resultado.valorProyectadoCentavos,
                    },
                  ]}
                />
                <p className="mt-3 text-slate-800">{resultado.explicacion}</p>
              </Tarjeta>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
