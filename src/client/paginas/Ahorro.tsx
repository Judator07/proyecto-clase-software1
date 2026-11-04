/** IU-07: simulador de cuenta de ahorro con interés compuesto (RF-10). La proyección se calcula con la capa de dominio. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ResultadoOrdenDto, ResumenPortafolioDto } from '../../compartido/tipos';
import {
  CAPITALIZACIONES,
  LIMITES_AHORRO,
  proyectarAhorro,
  validarParametrosAhorro,
  type PeriodosPorAnio,
} from '../../dominio/ahorro';
import { aCentavos, formatearUSD } from '../../dominio/dinero';
import { api, useApi } from '../api';
import { EstadoTransaccion } from '../componentes/FormularioOrden';
import { GraficoLinea } from '../componentes/Graficos';
import { Alerta, Boton, Campo, Indicador, Selector, Tarjeta, Titulo } from '../componentes/ui';

export default function Ahorro() {
  const [monto, setMonto] = useState('1000');
  const [tasa, setTasa] = useState('12');
  const [plazo, setPlazo] = useState('12');
  const [periodos, setPeriodos] = useState<PeriodosPorAnio>(12);
  const portafolios = useApi<ResumenPortafolioDto[]>('/portafolios');
  const [portafolioId, setPortafolioId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoOrdenDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const parametros = {
    montoCentavos: aCentavos(Number(monto.replace(',', '.')) || 0),
    tasaAnualPct: Number(tasa.replace(',', '.')),
    periodosPorAnio: periodos,
    plazoMeses: Number(plazo),
  };
  const errores = validarParametrosAhorro(parametros);
  const proyeccion = useMemo(
    () => (errores.length ? null : proyectarAhorro(parametros)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monto, tasa, plazo, periodos, errores.length],
  );
  const destino = portafolioId ?? portafolios.datos?.[0]?.id ?? null;

  async function registrar() {
    if (!destino) return;
    setRegistrando(true);
    setError(null);
    try {
      setResultado(await api.post<ResultadoOrdenDto>('/ahorro/depositos', { ...parametros, portafolioId: destino }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div>
      <Titulo subtitulo="Calcula cuánto crecería un depósito con interés compuesto: VF = P · (1 + r/n)^(n·t).">
        Simulador de cuenta de ahorro
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Parámetros del depósito">
          <div className="flex flex-col gap-3">
            <Campo
              etiqueta="Monto a depositar (USD)"
              name="monto"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <Campo
              etiqueta="Tasa de interés nominal anual (%)"
              name="tasa"
              type="number"
              min={LIMITES_AHORRO.tasaMin}
              max={LIMITES_AHORRO.tasaMax}
              step="0.1"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              ayuda="Entre 0 % y 30 %."
            />
            <Campo
              etiqueta="Plazo (meses)"
              name="plazo"
              type="number"
              min={LIMITES_AHORRO.plazoMin}
              max={LIMITES_AHORRO.plazoMax}
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
              ayuda="Entre 1 y 120 meses."
            />
            <Selector
              etiqueta="Capitalización"
              name="capitalizacion"
              value={periodos}
              onChange={(e) => setPeriodos(Number(e.target.value) as PeriodosPorAnio)}
            >
              {([12, 4, 1] as PeriodosPorAnio[]).map((n) => (
                <option key={n} value={n}>
                  {CAPITALIZACIONES[n]}
                </option>
              ))}
            </Selector>
            {errores.length > 0 && <Alerta tipo="error">{errores.join(' ')}</Alerta>}
          </div>
        </Tarjeta>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {proyeccion && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Indicador etiqueta="Valor final proyectado" valor={formatearUSD(proyeccion.valorFinalCentavos)} />
                <Indicador etiqueta="Intereses ganados" valor={formatearUSD(proyeccion.interesesCentavos)} />
              </div>
              <Tarjeta titulo="Evolución por periodo">
                <GraficoLinea
                  puntos={[
                    { fecha: '0', valor: parametros.montoCentavos },
                    ...proyeccion.filas.map((f) => ({ fecha: String(f.mes), valor: f.saldoCentavos })),
                  ]}
                  formatear={formatearUSD}
                  formatearX={(m) => `Mes ${m}`}
                  enCentavos
                  etiqueta="Saldo"
                />
                <div
                  className="mt-4 max-h-72 overflow-y-auto"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabla de evolución por periodo"
                >
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white text-left">
                      <tr>
                        <th scope="col" className="py-2">
                          Periodo
                        </th>
                        <th scope="col" className="py-2">
                          Mes
                        </th>
                        <th scope="col" className="py-2 text-right">
                          Saldo
                        </th>
                        <th scope="col" className="py-2 text-right">
                          Intereses acumulados
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {proyeccion.filas.map((f) => (
                        <tr key={f.periodo}>
                          <td className="py-1.5">{f.periodo}</td>
                          <td className="py-1.5">{f.mes}</td>
                          <td className="py-1.5 text-right">{formatearUSD(f.saldoCentavos)}</td>
                          <td className="py-1.5 text-right">{formatearUSD(f.interesAcumuladoCentavos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
              <Tarjeta titulo="Registrar el depósito en un portafolio (opcional)">
                {portafolios.datos && portafolios.datos.length === 0 ? (
                  <p className="text-slate-700">
                    Primero{' '}
                    <Link to="/panel" className="font-semibold text-emerald-800 underline">
                      crea un portafolio
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Selector
                      etiqueta="Portafolio"
                      name="portafolio"
                      className="flex-1"
                      value={destino ?? ''}
                      onChange={(e) => setPortafolioId(Number(e.target.value))}
                    >
                      {portafolios.datos?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Selector>
                    <Boton onClick={registrar} cargando={registrando} disabled={!destino}>
                      Depositar {formatearUSD(parametros.montoCentavos)}
                    </Boton>
                  </div>
                )}
                <p className="mt-2 text-sm text-slate-700">
                  El monto se descuenta de tu saldo disponible y crece día a día según la fórmula hasta cumplir el
                  plazo.
                </p>
                {error && (
                  <Alerta tipo="error" className="mt-3">
                    {error}
                  </Alerta>
                )}
                {resultado && (
                  <Alerta tipo={resultado.transaccion.estado === 'EJECUTADA' ? 'exito' : 'error'} className="mt-3">
                    <EstadoTransaccion estado={resultado.transaccion.estado} /> {resultado.mensaje}
                  </Alerta>
                )}
              </Tarjeta>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
