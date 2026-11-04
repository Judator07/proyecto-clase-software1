/** IU-08: detalle del portafolio: balance y rendimiento (RF-14), gráficos (RF-15), estadísticas (RF-16), posiciones, ventas, retiros (RF-09), historial (RF-11) y gestión (RF-13). */
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  RANGOS,
  type DetallePortafolioDto,
  type InstrumentoDto,
  type PosicionDto,
  type Rango,
  type TransaccionDto,
  type ValoracionDto,
} from '../../compartido/tipos';
import { CAPITALIZACIONES } from '../../dominio/ahorro';
import { formatearUSD } from '../../dominio/dinero';
import {
  formatearCantidad,
  formatearFecha,
  formatearFechaHora,
  formatearPct,
  formatearPrecio,
} from '../../dominio/formato';
import { NOMBRES_TIPO } from '../../dominio/reglas';
import { api, useApi } from '../api';
import { EstadoTransaccion, FormularioOrden } from '../componentes/FormularioOrden';
import { GraficoComposicion, GraficoLinea, PanelEstadisticas } from '../componentes/Graficos';
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  ConSigno,
  Dialogo,
  Indicador,
  Pestanas,
  Selector,
  Tarjeta,
  Titulo,
  Vacio,
} from '../componentes/ui';

const TIPOS_TX: Record<string, string> = { COMPRA: 'Compra', VENTA: 'Venta', DEPOSITO: 'Depósito', RETIRO: 'Retiro' };

function aInstrumento(p: PosicionDto): InstrumentoDto {
  return {
    id: p.instrumentoId,
    simbolo: p.simbolo,
    nombre: p.nombre,
    tipo: p.tipo,
    descripcion: null,
    sector: null,
    bolsa: null,
    indiceSubyacente: null,
    activo: p.activo,
    precioActual: p.precioActual,
    variacionDiariaPct: null,
    fechaActualizacion: p.fechaActualizacion,
    estadoPrecio: p.estadoPrecio,
  };
}

function Historial({ portafolioId, version }: { portafolioId: number; version: number }) {
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '', simbolo: '' });
  const [aplicados, setAplicados] = useState(filtros);
  const p = new URLSearchParams({ portafolioId: String(portafolioId), v: String(version) });
  Object.entries(aplicados).forEach(([k, v]) => v && p.set(k, v));
  const { datos, error, cargando } = useApi<TransaccionDto[]>(`/transacciones?${p}`);

  return (
    <Tarjeta titulo="Historial de transacciones">
      <form
        className="mb-4 grid gap-3 sm:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setAplicados(filtros);
        }}
      >
        <Campo
          etiqueta="Desde"
          name="desde"
          type="date"
          value={filtros.desde}
          onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
        />
        <Campo
          etiqueta="Hasta"
          name="hasta"
          type="date"
          value={filtros.hasta}
          onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
        />
        <Selector
          etiqueta="Tipo"
          name="tipo"
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
        >
          <option value="">Todos</option>
          {Object.entries(TIPOS_TX).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="Instrumento"
          name="simbolo"
          placeholder="p. ej. AAPL"
          value={filtros.simbolo}
          onChange={(e) => setFiltros({ ...filtros, simbolo: e.target.value.toUpperCase() })}
        />
        <Boton type="submit" variante="secundario" className="self-end">
          Filtrar
        </Boton>
      </form>
      {cargando && !datos && <Cargando />}
      {error && <Alerta tipo="error">{error}</Alerta>}
      {datos && datos.length === 0 && <Vacio>Aún no hay operaciones.</Vacio>}
      {datos && datos.length > 0 && (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla con desplazamiento">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-slate-800">
              <tr className="border-b border-slate-200">
                <th scope="col" className="py-2 pr-3">
                  Fecha
                </th>
                <th scope="col" className="py-2 pr-3">
                  Tipo
                </th>
                <th scope="col" className="py-2 pr-3">
                  Instrumento
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  Cantidad
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  Precio
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  Total
                </th>
                <th scope="col" className="py-2">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {datos.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-3">{formatearFechaHora(t.creadoEn)}</td>
                  <td className="py-2 pr-3">{TIPOS_TX[t.tipo]}</td>
                  <td className="py-2 pr-3">{t.simbolo ?? '—'}</td>
                  <td className="py-2 pr-3 text-right">{t.cantidad === null ? '—' : formatearCantidad(t.cantidad)}</td>
                  <td className="py-2 pr-3 text-right">
                    {t.precioUnitario === null ? '—' : formatearPrecio(t.precioUnitario)}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatearUSD(t.montoCentavos)}</td>
                  <td className="py-2">
                    <EstadoTransaccion estado={t.estado} />
                    {t.motivo && <span className="block max-w-56 text-xs text-slate-700">{t.motivo}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}

export default function DetallePortafolio() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [rango, setRango] = useState<Rango>('1M');
  const [version, setVersion] = useState(0);
  const detalle = useApi<DetallePortafolioDto>(`/portafolios/${id}?v=${version}`);
  const valoracion = useApi<ValoracionDto>(`/portafolios/${id}/valoracion?rango=${rango}&v=${version}`);
  const [venta, setVenta] = useState<PosicionDto | null>(null);
  const [retiro, setRetiro] = useState<number | null>(null);
  const [eliminar, setEliminar] = useState(false);
  const [renombrar, setRenombrar] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const refrescar = () => setVersion((v) => v + 1);

  if (detalle.cargando && !detalle.datos) return <Cargando />;
  if (detalle.error || !detalle.datos)
    return <Alerta tipo="error">{detalle.error ?? 'Portafolio no encontrado.'}</Alerta>;
  const d = detalle.datos;

  async function confirmarRetiro() {
    if (retiro === null) return;
    setOcupado(true);
    try {
      const r = await api.post<{ mensaje: string }>(`/ahorro/depositos/${retiro}/retiro`);
      setMensaje({ tipo: 'exito', texto: r.mensaje });
      refrescar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message });
    } finally {
      setRetiro(null);
      setOcupado(false);
    }
  }

  async function confirmarEliminacion() {
    setOcupado(true);
    try {
      await api.del(`/portafolios/${d.id}`);
      navegar('/panel');
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message });
      setEliminar(false);
      setOcupado(false);
    }
  }

  async function guardarNombre(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    try {
      await api.patch(`/portafolios/${d.id}`, { nombre: renombrar });
      setRenombrar(null);
      refrescar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Titulo
        subtitulo={d.descripcion ?? `Creado el ${formatearFecha(d.creadoEn)}`}
        acciones={
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => setRenombrar(d.nombre)}>
              Renombrar
            </Boton>
            <Boton variante="peligro" onClick={() => setEliminar(true)}>
              Eliminar
            </Boton>
          </div>
        }
      >
        {d.nombre}
      </Titulo>
      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}
      {d.avisoPrecios && <Alerta tipo="advertencia">{d.avisoPrecios}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Valor total" valor={formatearUSD(d.valorCentavos)} />
        <Indicador etiqueta="Capital invertido" valor={formatearUSD(d.capitalInvertidoCentavos)} />
        <Indicador
          etiqueta="Ganancia o pérdida no realizada"
          valor={
            <ConSigno valor={d.gananciaNoRealizadaCentavos}>{formatearUSD(d.gananciaNoRealizadaCentavos)}</ConSigno>
          }
          detalle={
            <ConSigno valor={d.rendimientoPct}>
              Rendimiento: {d.rendimientoPct === null ? '—' : formatearPct(d.rendimientoPct, true)}
            </ConSigno>
          }
        />
        <Indicador
          etiqueta="Ganancia realizada acumulada"
          valor={<ConSigno valor={d.gananciaRealizadaCentavos}>{formatearUSD(d.gananciaRealizadaCentavos)}</ConSigno>}
          detalle={`Saldo disponible: ${formatearUSD(d.saldoDisponibleCentavos)}`}
        />
      </div>

      {d.posiciones.length === 0 && d.depositos.length === 0 && (
        <Alerta tipo="info">
          Este portafolio está vacío. Ve a <strong>Instrumentos</strong> para comprar o a <strong>Ahorro</strong> para
          registrar un depósito.
        </Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta
          className="lg:col-span-2"
          titulo="Evolución del valor"
          acciones={
            <Pestanas
              etiqueta="Rango"
              valor={rango}
              onCambio={setRango}
              opciones={(Object.keys(RANGOS) as Rango[]).map((r) => ({ valor: r, texto: RANGOS[r].etiqueta }))}
            />
          }
        >
          {valoracion.datos ? (
            <GraficoLinea
              puntos={valoracion.datos.puntos}
              formatear={formatearUSD}
              enCentavos
              etiqueta="Valor del portafolio"
            />
          ) : (
            <Cargando />
          )}
          <p className="mt-2 text-xs text-slate-700">
            El valor de cada portafolio se registra una vez al día; el último punto es el valor actual.
          </p>
        </Tarjeta>
        <Tarjeta titulo="Composición (diversificación)">
          <GraficoComposicion composicion={d.composicion} />
        </Tarjeta>
      </div>

      {valoracion.datos && (
        <Tarjeta titulo="Estadísticas del portafolio">
          <PanelEstadisticas e={valoracion.datos.estadisticas} formatear={formatearUSD} />
          <p className="mt-3 text-sm text-slate-700">
            Diversificación:{' '}
            {d.composicion.length === 0
              ? 'sin inversiones'
              : d.composicion.map((c) => `${NOMBRES_TIPO[c.tipo]} ${formatearPct(c.porcentaje)}`).join(' · ')}
          </p>
        </Tarjeta>
      )}

      <Tarjeta titulo="Posiciones">
        {d.posiciones.length === 0 ? (
          <Vacio>No hay posiciones abiertas.</Vacio>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla con desplazamiento">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="text-left text-slate-800">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="py-2 pr-3">
                    Instrumento
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Cantidad
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Costo promedio
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Precio actual
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Valor de mercado
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Ganancia / pérdida
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {d.posiciones.map((p) => (
                  <tr key={p.instrumentoId}>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{p.simbolo}</span>{' '}
                      <span className="text-slate-700">{NOMBRES_TIPO[p.tipo]}</span>
                    </td>
                    <td className="py-2 pr-3 text-right">{formatearCantidad(p.cantidad)}</td>
                    <td className="py-2 pr-3 text-right">{formatearPrecio(p.costoPromedio)}</td>
                    <td className="py-2 pr-3 text-right">{formatearPrecio(p.precioActual)}</td>
                    <td className="py-2 pr-3 text-right">{formatearUSD(p.valorCentavos)}</td>
                    <td className="py-2 pr-3 text-right">
                      <ConSigno valor={p.gananciaCentavos}>
                        {formatearUSD(p.gananciaCentavos)} (
                        {p.gananciaPct === null ? '—' : formatearPct(p.gananciaPct, true)})
                      </ConSigno>
                    </td>
                    <td className="py-2 text-right">
                      <Boton variante="secundario" onClick={() => setVenta(p)}>
                        Vender
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {d.depositos.length > 0 && (
        <Tarjeta titulo="Depósitos de ahorro">
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla con desplazamiento">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-slate-800">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="py-2 pr-3">
                    Fecha
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Monto
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Tasa
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Capitalización
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Plazo
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Valor a la fecha
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {d.depositos.map((dep) => (
                  <tr key={dep.id}>
                    <td className="py-2 pr-3">{formatearFecha(dep.fechaInicio)}</td>
                    <td className="py-2 pr-3 text-right">{formatearUSD(dep.montoCentavos)}</td>
                    <td className="py-2 pr-3 text-right">{formatearPct(dep.tasaAnualPct)}</td>
                    <td className="py-2 pr-3">{CAPITALIZACIONES[dep.periodosPorAnio]}</td>
                    <td className="py-2 pr-3 text-right">{dep.plazoMeses} meses</td>
                    <td className="py-2 pr-3 text-right">
                      {formatearUSD(dep.valorCentavos)}
                      <span className="block text-xs text-emerald-800">
                        +{formatearUSD(dep.interesesCentavos)} de intereses
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Boton variante="secundario" onClick={() => setRetiro(dep.id)}>
                        Retirar
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}

      <Historial portafolioId={d.id} version={version} />

      <Dialogo abierto={venta !== null} titulo={`Vender ${venta?.simbolo ?? ''}`} onCerrar={() => setVenta(null)}>
        {venta && (
          <>
            <p className="mb-3 text-sm text-slate-700">Posees {formatearCantidad(venta.cantidad)} unidades.</p>
            <FormularioOrden
              instrumento={aInstrumento(venta)}
              portafolios={[d]}
              portafolioInicial={d.id}
              tipoInicial="VENTA"
              permitirCambioTipo={false}
              onFinalizado={refrescar}
            />
            <div className="mt-4 text-right">
              <Boton variante="fantasma" onClick={() => setVenta(null)}>
                Cerrar
              </Boton>
            </div>
          </>
        )}
      </Dialogo>

      <Dialogo abierto={retiro !== null} titulo="Retirar depósito" onCerrar={() => setRetiro(null)}>
        <p className="mb-4 text-slate-800">
          El retiro es total: recibirás el valor acumulado a la fecha, incluidos los intereses.
        </p>
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setRetiro(null)}>
            Cancelar
          </Boton>
          <Boton onClick={confirmarRetiro} cargando={ocupado}>
            Confirmar retiro
          </Boton>
        </div>
      </Dialogo>

      <Dialogo abierto={eliminar} titulo={`¿Eliminar "${d.nombre}"?`} onCerrar={() => setEliminar(false)}>
        <p className="mb-4 text-slate-800">
          Sus posiciones se venderán al precio actual y sus depósitos se retirarán: se abonarán aproximadamente{' '}
          <strong>{formatearUSD(d.valorCentavos)}</strong> a tu saldo. El historial se conserva.
        </p>
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setEliminar(false)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={confirmarEliminacion} cargando={ocupado}>
            Eliminar y liquidar
          </Boton>
        </div>
      </Dialogo>

      <Dialogo abierto={renombrar !== null} titulo="Renombrar portafolio" onCerrar={() => setRenombrar(null)}>
        <form onSubmit={guardarNombre} className="flex flex-col gap-3">
          <Campo
            etiqueta="Nuevo nombre"
            name="nuevoNombre"
            maxLength={50}
            value={renombrar ?? ''}
            onChange={(e) => setRenombrar(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={() => setRenombrar(null)}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={ocupado}>
              Guardar
            </Boton>
          </div>
        </form>
      </Dialogo>
    </div>
  );
}
