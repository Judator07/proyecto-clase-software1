/** IU-05: detalle del instrumento con gráfico de precios, estadísticas, tabla histórica (RF-07, RF-15, RF-16) y compra (IU-06). */
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  RANGOS,
  type HistoricoDto,
  type InstrumentoDto,
  type Rango,
  type ResumenPortafolioDto,
} from '../../compartido/tipos';
import { formatearFecha, formatearFechaHora, formatearPct, formatearPrecio } from '../../dominio/formato';
import { NOMBRES_TIPO } from '../../dominio/reglas';
import { useApi } from '../api';
import { FormularioOrden } from '../componentes/FormularioOrden';
import { GraficoLinea, PanelEstadisticas } from '../componentes/Graficos';
import { Alerta, Cargando, ConSigno, Pestanas, Tarjeta } from '../componentes/ui';
import { EstadoPrecio } from './Instrumentos';

export default function DetalleInstrumento() {
  const { simbolo = '' } = useParams();
  const [rango, setRango] = useState<Rango>('1M');
  const instrumento = useApi<InstrumentoDto>(`/instrumentos/${encodeURIComponent(simbolo)}`);
  const historico = useApi<HistoricoDto>(`/instrumentos/${encodeURIComponent(simbolo)}/historico?rango=${rango}`);
  const portafolios = useApi<ResumenPortafolioDto[]>('/portafolios');

  if (instrumento.cargando && !instrumento.datos) return <Cargando />;
  if (instrumento.error || !instrumento.datos)
    return <Alerta tipo="error">{instrumento.error ?? 'Instrumento no encontrado.'}</Alerta>;
  const i = instrumento.datos;
  const h = historico.datos;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/instrumentos" className="text-sm font-semibold text-emerald-800 underline">
          ← Volver al catálogo
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
              {NOMBRES_TIPO[i.tipo]}
              {i.bolsa ? ` · ${i.bolsa}` : ''}
              {i.sector ? ` · ${i.sector}` : ''}
              {i.indiceSubyacente ? ` · Índice: ${i.indiceSubyacente}` : ''}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {i.simbolo} <span className="font-normal text-slate-700">· {i.nombre}</span>
            </h1>
            {i.descripcion && <p className="mt-1 text-slate-700">{i.descripcion}</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">{formatearPrecio(i.precioActual)}</p>
            <p>
              <ConSigno valor={i.variacionDiariaPct}>{formatearPct(i.variacionDiariaPct, true)}</ConSigno>{' '}
              <span className="text-sm text-slate-700">hoy</span>
            </p>
            <p className="text-sm text-slate-700">
              {i.fechaActualizacion ? `Actualizado: ${formatearFechaHora(i.fechaActualizacion)}` : 'Sin actualizar'}
            </p>
            <EstadoPrecio i={i} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Tarjeta
            titulo="Evolución del precio de cierre"
            acciones={
              <Pestanas
                etiqueta="Rango de tiempo"
                valor={rango}
                onCambio={setRango}
                opciones={(Object.keys(RANGOS) as Rango[]).map((r) => ({ valor: r, texto: RANGOS[r].etiqueta }))}
              />
            }
          >
            {historico.cargando && !h && <Cargando />}
            {historico.error && <Alerta tipo="error">{historico.error}</Alerta>}
            {h && (
              <>
                {h.aviso && (
                  <Alerta tipo="info" className="mb-3">
                    {h.aviso}
                  </Alerta>
                )}
                <GraficoLinea puntos={h.puntos} formatear={formatearPrecio} etiqueta={`Precio de ${i.simbolo}`} />
              </>
            )}
          </Tarjeta>
          {h && (
            <Tarjeta titulo={`Estadísticas y tendencia (${RANGOS[rango].etiqueta})`}>
              <PanelEstadisticas e={h.estadisticas} formatear={formatearPrecio} />
            </Tarjeta>
          )}
          {h && h.puntos.length > 0 && (
            <Tarjeta titulo="Tabla de precios históricos">
              <div
                className="relative max-h-80 overflow-y-auto"
                tabIndex={0}
                role="region"
                aria-label="Tabla con desplazamiento"
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left">
                    <tr>
                      <th scope="col" className="py-2">
                        Fecha
                      </th>
                      <th scope="col" className="py-2 text-right">
                        Precio de cierre
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {[...h.puntos].reverse().map((p) => (
                      <tr key={p.fecha}>
                        <td className="py-1.5">{formatearFecha(p.fecha)}</td>
                        <td className="py-1.5 text-right">{formatearPrecio(p.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}
        </div>
        <Tarjeta titulo="Operar" className="self-start">
          {portafolios.cargando && !portafolios.datos ? (
            <Cargando />
          ) : (
            <FormularioOrden
              instrumento={i}
              portafolios={portafolios.datos ?? []}
              onPortafolioCreado={portafolios.recargar}
              onFinalizado={() => portafolios.recargar()}
            />
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
