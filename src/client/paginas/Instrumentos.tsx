/** IU-04: catálogo de instrumentos con búsqueda y filtro por tipo (RF-06). */
import { useState } from 'react';
import { Link } from 'react-router';
import type { InstrumentoDto } from '../../compartido/tipos';
import { formatearFechaHora, formatearPct, formatearPrecio } from '../../dominio/formato';
import { NOMBRES_TIPO, type TipoInstrumento } from '../../dominio/reglas';
import { useApi } from '../api';
import { Alerta, Cargando, ConSigno, Insignia, Pestanas, Titulo, Vacio } from '../componentes/ui';

type Filtro = TipoInstrumento | 'TODOS';

export function EstadoPrecio({ i }: { i: Pick<InstrumentoDto, 'estadoPrecio' | 'fechaActualizacion'> }) {
  if (i.estadoPrecio === 'ACTUALIZADO') return null;
  return (
    <Insignia tono="ambar">
      {i.fechaActualizacion ? `Precio desactualizado (${formatearFechaHora(i.fechaActualizacion)})` : 'Sin precio'}
    </Insignia>
  );
}

export default function Instrumentos() {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const p = new URLSearchParams();
  if (filtro !== 'TODOS') p.set('tipo', filtro);
  if (busqueda) p.set('q', busqueda);
  const { datos, error, cargando } = useApi<InstrumentoDto[]>(`/instrumentos?${p}`);

  return (
    <div>
      <Titulo subtitulo="Busca acciones, ETF, criptomonedas o la cuenta de ahorro y consulta su precio actual.">
        Instrumentos
      </Titulo>
      <div className="mb-4 flex flex-col gap-3">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusqueda(texto.trim());
          }}
        >
          <label htmlFor="buscar-instrumento" className="sr-only">
            Buscar por símbolo o nombre
          </label>
          <input
            id="buscar-instrumento"
            type="search"
            placeholder="Símbolo o nombre, por ejemplo AAPL o Bitcoin"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (!e.target.value) setBusqueda('');
            }}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-400 bg-white px-3"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
          >
            Buscar
          </button>
        </form>
        <Pestanas
          etiqueta="Filtrar por tipo"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { valor: 'TODOS', texto: 'Todos' },
            { valor: 'ACCION', texto: 'Acciones' },
            { valor: 'ETF', texto: 'ETF' },
            { valor: 'CRIPTO', texto: 'Criptomonedas' },
            { valor: 'AHORRO', texto: 'Cuenta de ahorro' },
          ]}
        />
      </div>
      {cargando && !datos && <Cargando />}
      {error && <Alerta tipo="error">{error}</Alerta>}
      {datos && datos.length === 0 && <Vacio>No se encontraron instrumentos.</Vacio>}
      {datos && datos.length > 0 && (
        <div
          className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
          tabIndex={0}
          role="region"
          aria-label="Tabla con desplazamiento"
        >
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Instrumentos disponibles para la simulación</caption>
            <thead className="bg-slate-100 text-left text-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Instrumento
                </th>
                <th scope="col" className="px-4 py-3">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Precio actual
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Variación diaria
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={i.tipo === 'AHORRO' ? '/ahorro' : `/instrumentos/${i.simbolo}`}
                      className="font-semibold text-emerald-800 underline"
                    >
                      {i.simbolo}
                    </Link>
                    <span className="block text-slate-700">{i.nombre}</span>
                    <EstadoPrecio i={i} />
                  </td>
                  <td className="px-4 py-3">{NOMBRES_TIPO[i.tipo]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {i.tipo === 'AHORRO' ? 'Tasa a tu elección' : formatearPrecio(i.precioActual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.tipo === 'AHORRO' ? (
                      '—'
                    ) : (
                      <ConSigno valor={i.variacionDiariaPct}>{formatearPct(i.variacionDiariaPct, true)}</ConSigno>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
