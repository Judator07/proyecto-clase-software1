/** Lectura de un artículo educativo (RF-19). El Markdown se renderiza sin permitir HTML crudo. */
import Markdown from 'react-markdown';
import { Link, useParams } from 'react-router';
import { TEMAS, type ArticuloDto } from '../../compartido/tipos';
import { useApi } from '../api';
import { Alerta, Cargando } from '../componentes/ui';

export default function Articulo() {
  const { slug } = useParams();
  const { datos, error, cargando } = useApi<ArticuloDto>(`/contenido/${slug}`);
  if (cargando) return <Cargando />;
  if (error || !datos) return <Alerta tipo="error">{error ?? 'Artículo no encontrado.'}</Alerta>;
  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/aprende" className="text-sm font-semibold text-emerald-800 underline">
        ← Volver al centro de aprendizaje
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-800">{TEMAS[datos.tema]}</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900">{datos.titulo}</h1>
      <div className="articulo mt-6">
        <Markdown>{datos.cuerpo}</Markdown>
      </div>
    </article>
  );
}
