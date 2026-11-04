/** IU-09: centro de aprendizaje público (RF-19). */
import { useState } from 'react';
import { Link } from 'react-router';
import { TEMAS, type ArticuloResumenDto, type Tema } from '../../compartido/tipos';
import { useApi } from '../api';
import { Alerta, Cargando, Pestanas, Titulo, Vacio } from '../componentes/ui';

export default function Aprende() {
  const [tema, setTema] = useState<Tema | 'TODOS'>('TODOS');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const parametros = new URLSearchParams();
  if (tema !== 'TODOS') parametros.set('tema', tema);
  if (busqueda) parametros.set('q', busqueda);
  const { datos, error, cargando } = useApi<ArticuloResumenDto[]>(`/contenido?${parametros}`);

  return (
    <div>
      <Titulo subtitulo="Conceptos financieros explicados con ejemplos, sin necesidad de registrarte.">
        Centro de aprendizaje
      </Titulo>
      <div className="mb-6 flex flex-col gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setBusqueda(texto.trim());
          }}
          className="flex gap-2"
        >
          <label htmlFor="buscar-articulo" className="sr-only">
            Buscar un término
          </label>
          <input
            id="buscar-articulo"
            type="search"
            placeholder="Busca un término, por ejemplo: volatilidad"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-10 flex-1 rounded-lg border border-slate-400 bg-white px-3"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
          >
            Buscar
          </button>
        </form>
        <Pestanas
          etiqueta="Filtrar por tema"
          valor={tema}
          onCambio={setTema}
          opciones={[
            { valor: 'TODOS' as const, texto: 'Todos' },
            ...Object.entries(TEMAS).map(([valor, texto]) => ({ valor: valor as Tema, texto })),
          ]}
        />
      </div>
      {cargando && <Cargando />}
      {error && <Alerta tipo="error">{error}</Alerta>}
      {datos && datos.length === 0 && <Vacio>No encontramos artículos para tu búsqueda.</Vacio>}
      {datos && datos.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {datos.map((a) => (
            <li key={a.id}>
              <Link
                to={`/aprende/${a.slug}`}
                className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-600 hover:shadow"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{TEMAS[a.tema]}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{a.titulo}</h2>
                <p className="mt-2 text-sm text-slate-700">{a.resumen}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
