/**
 * IU-06: operación de compra o venta en tres pasos (RNF-08): 1) datos y revisión, 2) resumen y
 * confirmación (estado "Pendiente" del análisis), 3) comprobante. Cancelar en el resumen registra la
 * orden como Cancelada (RF-08, RF-09).
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type {
  CotizacionOrdenDto,
  InstrumentoDto,
  ResultadoOrdenDto,
  ResumenPortafolioDto,
} from '../../compartido/tipos';
import { formatearUSD } from '../../dominio/dinero';
import { formatearCantidad, formatearFechaHora, formatearPrecio } from '../../dominio/formato';
import { validarCantidad } from '../../dominio/reglas';
import { api, ErrorCliente } from '../api';
import { Alerta, Boton, Campo, ConSigno, Insignia, Pestanas, Selector } from './ui';

type Paso = 'datos' | 'resumen' | 'comprobante';

export function EstadoTransaccion({ estado }: { estado: string }) {
  const tono = estado === 'EJECUTADA' ? 'verde' : estado === 'RECHAZADA' ? 'rojo' : 'ambar';
  const texto = estado === 'EJECUTADA' ? 'Ejecutada' : estado === 'RECHAZADA' ? 'Rechazada' : 'Cancelada';
  return <Insignia tono={tono}>{texto}</Insignia>;
}

export function FormularioOrden({
  instrumento,
  portafolios,
  tipoInicial = 'COMPRA',
  portafolioInicial,
  permitirCambioTipo = true,
  onPortafolioCreado,
  onFinalizado,
}: {
  instrumento: InstrumentoDto;
  portafolios: ResumenPortafolioDto[];
  tipoInicial?: 'COMPRA' | 'VENTA';
  portafolioInicial?: number;
  permitirCambioTipo?: boolean;
  onPortafolioCreado?: () => void;
  onFinalizado?: (r: ResultadoOrdenDto) => void;
}) {
  const [paso, setPaso] = useState<Paso>('datos');
  const [tipo, setTipo] = useState<'COMPRA' | 'VENTA'>(tipoInicial);
  const [portafolioId, setPortafolioId] = useState<number>(portafolioInicial ?? portafolios[0]?.id ?? 0);
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<CotizacionOrdenDto | null>(null);
  const [resultado, setResultado] = useState<ResultadoOrdenDto | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const esCripto = instrumento.tipo === 'CRIPTO';
  const compraBloqueada = tipo === 'COMPRA' && !instrumento.activo;

  const orden = () => ({
    portafolioId,
    simbolo: instrumento.simbolo,
    tipo,
    cantidad: Number(cantidad.replace(',', '.')),
  });

  async function crearPrimerPortafolio() {
    setOcupado(true);
    try {
      const p = await api.post<ResumenPortafolioDto>('/portafolios', { nombre: 'Mi primer portafolio' });
      setPortafolioId(p.id);
      onPortafolioCreado?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function revisar(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const o = orden();
    const v = validarCantidad(instrumento.tipo, o.cantidad);
    if (!cantidad.trim() || !v.ok) {
      setError(v.ok ? 'Ingresa una cantidad.' : v.mensaje);
      return;
    }
    setOcupado(true);
    try {
      setCotizacion(await api.post<CotizacionOrdenDto>('/ordenes/cotizacion', o));
      setPaso('resumen');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!cotizacion) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await api.post<ResultadoOrdenDto>('/ordenes', {
        ...orden(),
        precioCotizado: cotizacion.precioUnitario,
      });
      setResultado(r);
      setPaso('comprobante');
      onFinalizado?.(r);
    } catch (err) {
      if (err instanceof ErrorCliente && err.estado === 409 && err.message.startsWith('El precio cambió')) {
        // El precio se actualizó mientras el usuario revisaba: se muestra el nuevo resumen (RN-03).
        setAviso(err.message);
        setCotizacion(await api.post<CotizacionOrdenDto>('/ordenes/cotizacion', orden()));
      } else {
        setError((err as Error).message);
        setPaso('datos');
      }
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar() {
    setOcupado(true);
    try {
      const r = await api.post<ResultadoOrdenDto>('/ordenes/cancelacion', orden());
      setResultado(r);
      setPaso('comprobante');
      onFinalizado?.(r);
    } catch (err) {
      setError((err as Error).message);
      setPaso('datos');
    } finally {
      setOcupado(false);
    }
  }

  function reiniciar() {
    setPaso('datos');
    setCantidad('');
    setCotizacion(null);
    setResultado(null);
    setError(null);
    setAviso(null);
  }

  if (portafolios.length === 0 && !portafolioId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-slate-700">Para invertir necesitas un portafolio donde guardar tus posiciones.</p>
        <Boton onClick={crearPrimerPortafolio} cargando={ocupado}>
          Crear mi primer portafolio
        </Boton>
        {error && <Alerta tipo="error">{error}</Alerta>}
      </div>
    );
  }

  if (paso === 'comprobante' && resultado) {
    const t = resultado.transaccion;
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Comprobante</h3>
          <EstadoTransaccion estado={t.estado} />
        </div>
        <Alerta tipo={t.estado === 'EJECUTADA' ? 'exito' : t.estado === 'RECHAZADA' ? 'error' : 'advertencia'}>
          {resultado.mensaje}
        </Alerta>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-700">Fecha</dt>
          <dd className="text-right">{formatearFechaHora(t.creadoEn)}</dd>
          <dt className="text-slate-700">Operación</dt>
          <dd className="text-right">
            {t.tipo === 'COMPRA' ? 'Compra' : 'Venta'} de {t.simbolo}
          </dd>
          <dt className="text-slate-700">Cantidad</dt>
          <dd className="text-right">{formatearCantidad(t.cantidad ?? 0)}</dd>
          <dt className="text-slate-700">Precio unitario</dt>
          <dd className="text-right">{formatearPrecio(t.precioUnitario)}</dd>
          <dt className="text-slate-700">Total</dt>
          <dd className="text-right font-semibold">{formatearUSD(t.montoCentavos)}</dd>
          <dt className="text-slate-700">Saldo disponible</dt>
          <dd className="text-right">{formatearUSD(resultado.saldoCentavos)}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={reiniciar}>
            Nueva operación
          </Boton>
          {t.portafolioId && (
            <Link
              to={`/portafolios/${t.portafolioId}`}
              className="inline-flex min-h-10 items-center px-2 font-semibold text-emerald-800 underline"
            >
              Ver portafolio
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (paso === 'resumen' && cotizacion) {
    const c = cotizacion;
    const insuficiente = c.tipo === 'COMPRA' && c.saldoDespuesCentavos < 0;
    const excede = c.tipo === 'VENTA' && c.cantidad > c.cantidadPoseida;
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <h3 className="text-lg font-semibold">Resumen de la orden</h3>
        {aviso && <Alerta tipo="advertencia">{aviso}</Alerta>}
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-700">Operación</dt>
          <dd className="text-right font-semibold">
            {c.tipo === 'COMPRA' ? 'Compra' : 'Venta'} de {formatearCantidad(c.cantidad)} {c.instrumento.simbolo}
          </dd>
          <dt className="text-slate-700">Portafolio</dt>
          <dd className="text-right">{c.portafolioNombre}</dd>
          <dt className="text-slate-700">Precio unitario (último registrado)</dt>
          <dd className="text-right">{formatearPrecio(c.precioUnitario)}</dd>
          <dt className="text-slate-700">Comisiones</dt>
          <dd className="text-right">USD 0,00</dd>
          <dt className="text-slate-700">Total</dt>
          <dd className="text-right text-base font-bold">{formatearUSD(c.montoCentavos)}</dd>
          <dt className="text-slate-700">Saldo disponible</dt>
          <dd className="text-right">{formatearUSD(c.saldoDisponibleCentavos)}</dd>
          <dt className="text-slate-700">Saldo después</dt>
          <dd className="text-right">{formatearUSD(c.saldoDespuesCentavos)}</dd>
          {c.tipo === 'VENTA' && c.gananciaEstimadaCentavos !== null && (
            <>
              <dt className="text-slate-700">Ganancia o pérdida estimada</dt>
              <dd className="text-right">
                <ConSigno valor={c.gananciaEstimadaCentavos}>{formatearUSD(c.gananciaEstimadaCentavos)}</ConSigno>
              </dd>
            </>
          )}
        </dl>
        {insuficiente && (
          <Alerta tipo="advertencia">
            Tu saldo no alcanza para esta compra: si confirmas, la orden será rechazada.
          </Alerta>
        )}
        {excede && (
          <Alerta tipo="advertencia">
            Solo posees {formatearCantidad(c.cantidadPoseida)} {c.instrumento.simbolo}: si confirmas, la orden será
            rechazada.
          </Alerta>
        )}
        <div className="flex flex-wrap gap-2">
          <Boton onClick={confirmar} cargando={ocupado}>
            Confirmar {c.tipo === 'COMPRA' ? 'compra' : 'venta'}
          </Boton>
          <Boton variante="secundario" onClick={cancelar} disabled={ocupado}>
            Cancelar orden
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={revisar} className="flex flex-col gap-3" noValidate>
      {permitirCambioTipo && (
        <Pestanas
          etiqueta="Tipo de operación"
          valor={tipo}
          onCambio={(t) => {
            setTipo(t);
            setError(null);
          }}
          opciones={[
            { valor: 'COMPRA', texto: 'Comprar' },
            { valor: 'VENTA', texto: 'Vender' },
          ]}
        />
      )}
      {compraBloqueada ? (
        <Alerta tipo="advertencia">
          Este instrumento fue desactivado: ya no se ofrece para compra, pero puedes vender lo que tengas.
        </Alerta>
      ) : (
        <>
          <Selector
            etiqueta="Portafolio"
            name="portafolio"
            value={portafolioId}
            onChange={(e) => setPortafolioId(Number(e.target.value))}
          >
            {portafolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Selector>
          <Campo
            etiqueta={`Cantidad de ${instrumento.simbolo}`}
            name="cantidad"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            error={error}
            ayuda={esCripto ? 'Puedes usar hasta 8 decimales, por ejemplo 0,05.' : 'Solo unidades enteras.'}
          />
          {instrumento.precioActual !== null && Number(cantidad.replace(',', '.')) > 0 && (
            <p className="text-sm text-slate-700">
              Monto estimado:{' '}
              <strong>
                {formatearUSD(Math.round(Number(cantidad.replace(',', '.')) * instrumento.precioActual * 100))}
              </strong>
            </p>
          )}
          <Boton type="submit" cargando={ocupado}>
            Revisar orden
          </Boton>
        </>
      )}
    </form>
  );
}
