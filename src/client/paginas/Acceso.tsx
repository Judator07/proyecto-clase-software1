/** IU-01: registro (RF-01) e inicio de sesión (RF-02). */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import type { UsuarioDto } from '../../compartido/tipos';
import { correoValido, validarContrasena } from '../../dominio/reglas';
import { api, ErrorCliente } from '../api';
import { Alerta, Boton, Campo, Tarjeta } from '../componentes/ui';
import { useSesion } from '../sesion';

function Contenedor({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{titulo}</h1>
      <Tarjeta>{children}</Tarjeta>
    </div>
  );
}

export function Ingreso() {
  const { usuario, iniciar, expirada } = useSesion();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const destino = parametros.get('volver') || '/panel';

  if (usuario) return <Navigate to={destino} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<{ usuario: UsuarioDto }>('/auth/ingreso', { correo, contrasena });
      iniciar(r.usuario);
      navegar(destino, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Contenedor titulo="Iniciar sesión">
      {expirada && (
        <Alerta tipo="advertencia" className="mb-4">
          Tu sesión expiró por inactividad. Inicia sesión de nuevo.
        </Alerta>
      )}
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo
          etiqueta="Correo electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        {error && <Alerta tipo="error">{error}</Alerta>}
        <Boton type="submit" cargando={enviando}>
          Ingresar
        </Boton>
        <p className="text-sm text-slate-700">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-emerald-800 underline">
            Regístrate
          </Link>
        </p>
      </form>
    </Contenedor>
  );
}

export function Registro() {
  const { usuario, iniciar } = useSesion();
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ nombre: '', correo: '', contrasena: '', confirmacion: '' });
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/panel" replace />;

  const cambiar = (campo: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!datos.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (!correoValido(datos.correo)) e.correo = 'Ingresa un correo válido, por ejemplo ana@correo.com.';
    const reglas = validarContrasena(datos.contrasena);
    if (reglas.length) e.contrasena = reglas.join(' ');
    if (datos.confirmacion !== datos.contrasena) e.confirmacion = 'La confirmación no coincide con la contraseña.';
    if (!acepta) e.aceptaPolitica = 'Debes aceptar la política de tratamiento de datos para registrarte.';
    return e;
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    setErrorGeneral(null);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      const r = await api.post<{ usuario: UsuarioDto }>('/auth/registro', { ...datos, aceptaPolitica: acepta });
      iniciar(r.usuario);
      navegar('/panel?bienvenida=1', { replace: true });
    } catch (err) {
      if (err instanceof ErrorCliente && err.campo) setErrores({ [err.campo]: err.message });
      else setErrorGeneral((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Contenedor titulo="Crear cuenta">
      <p className="mb-4 text-sm text-slate-700">Recibirás USD 10.000,00 ficticios para empezar a practicar.</p>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo
          etiqueta="Nombre completo"
          name="nombre"
          autoComplete="name"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
        />
        <Campo
          etiqueta="Correo electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          value={datos.correo}
          onChange={cambiar('correo')}
          error={errores.correo}
        />
        <Campo
          etiqueta="Contraseña"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          value={datos.contrasena}
          onChange={cambiar('contrasena')}
          error={errores.contrasena}
          ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
        />
        <Campo
          etiqueta="Confirmar contraseña"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          value={datos.confirmacion}
          onChange={cambiar('confirmacion')}
          error={errores.confirmacion}
        />
        <div>
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-emerald-700"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
            />
            <span>
              Autorizo el tratamiento de mis datos personales (nombre y correo) según la{' '}
              <Link to="/privacidad" className="font-semibold text-emerald-800 underline" target="_blank">
                política de tratamiento de datos
              </Link>{' '}
              (Ley 1581 de 2012).
            </span>
          </label>
          {errores.aceptaPolitica && (
            <p className="mt-1 text-sm text-red-700" role="alert">
              {errores.aceptaPolitica}
            </p>
          )}
        </div>
        {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
        <Boton type="submit" cargando={enviando}>
          Crear cuenta
        </Boton>
        <p className="text-sm text-slate-700">
          ¿Ya tienes cuenta?{' '}
          <Link to="/ingresar" className="font-semibold text-emerald-800 underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </Contenedor>
  );
}
