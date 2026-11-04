/** Estado de la sesión del usuario en la SPA (RF-02, RNF-06). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { UsuarioDto } from '../compartido/tipos';
import { api, registrarAlExpirarSesion } from './api';
import { Cargando } from './componentes/ui';

interface ContextoSesion {
  usuario: UsuarioDto | null;
  cargando: boolean;
  /** true cuando la sesión terminó por inactividad (RNF-06). */
  expirada: boolean;
  iniciar: (usuario: UsuarioDto) => void;
  salir: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [expirada, setExpirada] = useState(false);

  useEffect(() => {
    api
      .get<{ usuario: UsuarioDto }>('/auth/sesion')
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
    registrarAlExpirarSesion(() => {
      setUsuario((actual) => {
        if (actual) setExpirada(true);
        return null;
      });
    });
  }, []);

  const iniciar = useCallback((u: UsuarioDto) => {
    setUsuario(u);
    setExpirada(false);
  }, []);

  const salir = useCallback(async () => {
    await api.post('/auth/salida').catch(() => undefined);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, expirada, iniciar, salir }),
    [usuario, cargando, expirada, iniciar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const c = useContext(Contexto);
  if (!c) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return c;
}

/** Protege las pantallas privadas: sin sesión redirige al inicio de sesión (RNF-06). */
export function RutaPrivada({ children, soloAdmin = false }: { children: ReactNode; soloAdmin?: boolean }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  if (soloAdmin && usuario.rol !== 'ADMINISTRADOR') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-2 text-slate-700">Esta sección es solo para administradores.</p>
      </div>
    );
  }
  return <>{children}</>;
}
