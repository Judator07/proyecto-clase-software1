/** Página de inicio pública. */
import { Link } from 'react-router';
import { useSesion } from '../sesion';

const CARACTERISTICAS = [
  ['Dinero ficticio', 'Empiezas con USD 10.000 para practicar sin arriesgar nada real.'],
  ['Precios reales', 'Acciones, ETF y criptomonedas con precios del mercado actualizados cada 15 minutos.'],
  ['Portafolios', 'Organiza tus inversiones en hasta 10 portafolios y mide su rendimiento.'],
  ['Cuentas de ahorro', 'Simula depósitos con interés compuesto y compara plazos y tasas.'],
  ['Escenarios', 'Proyecta tu portafolio ante una crisis, un mercado alcista o un alza de tasas.'],
  ['Aprende', 'Guías claras sobre riesgo, rendimiento, diversificación y criptomonedas.'],
];

export default function Inicio() {
  const { usuario } = useSesion();
  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 px-6 py-12 text-white sm:px-10 sm:py-16">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Aprende a invertir sin arriesgar tu dinero
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-emerald-50">
          Simula inversiones en acciones, ETF, criptomonedas y cuentas de ahorro con datos reales del mercado y dinero
          ficticio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {usuario ? (
            <Link
              to="/panel"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link
                to="/registro"
                className="rounded-lg bg-white px-5 py-3 font-semibold text-emerald-900 hover:bg-emerald-50"
              >
                Crear cuenta gratis
              </Link>
              <Link
                to="/ingresar"
                className="rounded-lg border border-white px-5 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Iniciar sesión
              </Link>
            </>
          )}
          <Link to="/aprende" className="rounded-lg px-5 py-3 font-semibold text-white underline">
            Explorar el centro de aprendizaje
          </Link>
        </div>
      </section>
      <section aria-labelledby="titulo-funciones">
        <h2 id="titulo-funciones" className="mb-4 text-2xl font-bold">
          ¿Qué puedes hacer?
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARACTERISTICAS.map(([titulo, texto]) => (
            <li key={titulo} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-emerald-900">{titulo}</h3>
              <p className="mt-1 text-slate-700">{texto}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
