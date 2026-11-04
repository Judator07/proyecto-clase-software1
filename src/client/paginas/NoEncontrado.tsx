import { Link } from 'react-router';

export default function NoEncontrado() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">Página no encontrada</h1>
      <p className="mt-2 text-slate-700">La dirección que buscas no existe.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-emerald-800 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
