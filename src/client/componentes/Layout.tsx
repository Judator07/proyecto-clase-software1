/** Estructura común de todas las pantallas: menú de navegación y pie con el aviso educativo (SRS §3.1, RNF-03). */
import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useSesion } from '../sesion';
import { cx } from './ui';

export const AVISO_EDUCATIVO =
  'Plataforma de simulación con fines educativos. No usa dinero real ni constituye asesoría financiera.';

function Enlace({ a, children, alNavegar }: { a: string; children: ReactNode; alNavegar: () => void }) {
  return (
    <NavLink
      to={a}
      onClick={alNavegar}
      className={({ isActive }) =>
        cx(
          'block rounded-md px-3 py-2 text-sm font-medium md:inline-block',
          isActive ? 'bg-emerald-800 text-white' : 'text-emerald-50 hover:bg-emerald-800/70',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  async function cerrarSesion() {
    cerrar();
    await salir();
    navegar('/ingresar');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Saltar al contenido
      </a>
      <header className="bg-emerald-900 text-white shadow">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2"
        >
          <Link to={usuario ? '/panel' : '/'} className="flex items-center gap-2 py-1 font-bold" onClick={cerrar}>
            <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#ecfdf5" />
              <path
                d="M6 23l7-7 5 4 8-10"
                fill="none"
                stroke="#065f46"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Simulador de Inversión
          </Link>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-emerald-800 md:hidden"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            onClick={() => setAbierto((a) => !a)}
          >
            {abierto ? 'Cerrar' : 'Menú'}
          </button>
          <div
            id="menu-principal"
            className={cx('w-full md:flex md:w-auto md:items-center md:gap-1', abierto ? 'block' : 'hidden')}
          >
            {usuario ? (
              <>
                <Enlace a="/panel" alNavegar={cerrar}>
                  Panel
                </Enlace>
                <Enlace a="/instrumentos" alNavegar={cerrar}>
                  Instrumentos
                </Enlace>
                <Enlace a="/ahorro" alNavegar={cerrar}>
                  Ahorro
                </Enlace>
                <Enlace a="/escenarios" alNavegar={cerrar}>
                  Escenarios
                </Enlace>
                <Enlace a="/aprende" alNavegar={cerrar}>
                  Aprende
                </Enlace>
                {usuario.rol === 'ADMINISTRADOR' && (
                  <Enlace a="/admin" alNavegar={cerrar}>
                    Administración
                  </Enlace>
                )}
                <Enlace a="/perfil" alNavegar={cerrar}>
                  Mi perfil
                </Enlace>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-emerald-50 hover:bg-emerald-800/70 md:inline-block md:w-auto"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Enlace a="/aprende" alNavegar={cerrar}>
                  Aprende
                </Enlace>
                <Enlace a="/ingresar" alNavegar={cerrar}>
                  Iniciar sesión
                </Enlace>
                <Enlace a="/registro" alNavegar={cerrar}>
                  Crear cuenta
                </Enlace>
              </>
            )}
          </div>
        </nav>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong className="text-slate-900">Aviso:</strong> {AVISO_EDUCATIVO}
          </p>
          <p className="flex flex-wrap gap-x-4">
            <Link to="/privacidad" className="font-medium text-emerald-800 underline">
              Política de tratamiento de datos
            </Link>
            <span>UIS · Ingeniería de Software I · 2026</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
