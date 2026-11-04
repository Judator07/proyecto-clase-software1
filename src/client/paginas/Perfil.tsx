/** IU-02: perfil del usuario (RF-03), edición (RF-04) y reinicio por bancarrota (RF-05). */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { PerfilDto } from '../../compartido/tipos';
import { formatearUSD } from '../../dominio/dinero';
import { formatearFecha, formatearPct } from '../../dominio/formato';
import { validarContrasena } from '../../dominio/reglas';
import { api, ErrorCliente, useApi } from '../api';
import { Alerta, Boton, Campo, Cargando, ConSigno, Dialogo, Indicador, Tarjeta, Titulo } from '../componentes/ui';

export default function Perfil() {
  const { datos: perfil, error, cargando, recargar } = useApi<PerfilDto>('/perfil');
  const [nombre, setNombre] = useState<string | null>(null);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [mensajeReinicio, setMensajeReinicio] = useState<string | null>(null);

  if (cargando && !perfil) return <Cargando />;
  if (error || !perfil) return <Alerta tipo="error">{error}</Alerta>;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setExito(null);
    const errs: Record<string, string> = {};
    if (!actual) errs.contrasenaActual = 'Ingresa tu contraseña actual para guardar cambios.';
    if (nueva) {
      const reglas = validarContrasena(nueva);
      if (reglas.length) errs.nuevaContrasena = reglas.join(' ');
    }
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setGuardando(true);
    try {
      await api.patch('/perfil', {
        nombre: nombre ?? perfil!.nombre,
        contrasenaActual: actual,
        nuevaContrasena: nueva || undefined,
      });
      setActual('');
      setNueva('');
      setExito('Cambios guardados.');
      recargar();
    } catch (err) {
      if (err instanceof ErrorCliente && err.campo) setErrores({ [err.campo]: err.message });
      else setErrores({ general: (err as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  async function reiniciar() {
    try {
      const r = await api.post<{ mensaje: string }>('/perfil/reinicio');
      setMensajeReinicio(r.mensaje);
      recargar();
    } catch (err) {
      setMensajeReinicio((err as Error).message);
    } finally {
      setConfirmarReinicio(false);
    }
  }

  return (
    <div>
      <Titulo subtitulo={`Miembro desde el ${formatearFecha(perfil.creadoEn)}`}>Mi perfil</Titulo>
      {mensajeReinicio && (
        <Alerta tipo="exito" className="mb-6">
          {mensajeReinicio}{' '}
          <Link to="/aprende/riesgo-y-volatilidad" className="font-semibold underline">
            Leer sobre riesgo y volatilidad
          </Link>
        </Alerta>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Saldo disponible" valor={formatearUSD(perfil.saldoCentavos)} />
        <Indicador etiqueta="Valor invertido" valor={formatearUSD(perfil.valorInvertidoCentavos)} />
        <Indicador etiqueta="Patrimonio total" valor={formatearUSD(perfil.patrimonioCentavos)} />
        <Indicador
          etiqueta="Bancarrotas simuladas"
          valor={perfil.contadorBancarrotas}
          detalle={
            perfil.fechaUltimoReinicio
              ? `Último reinicio: ${formatearFecha(perfil.fechaUltimoReinicio)}`
              : 'Ninguna hasta ahora'
          }
        />
      </div>

      {perfil.enBancarrota && (
        <Tarjeta titulo="Bancarrota simulada" className="mb-6 border-red-300">
          <p className="mb-3 text-slate-800">
            Tu patrimonio ({formatearUSD(perfil.patrimonioCentavos)}) es menor que USD 100,00. Puedes reiniciar tu
            cuenta: tus posiciones se cerrarán sin sumar su valor, tu saldo volverá a USD 10.000,00 y se sumará una
            bancarrota a tu contador. Tus portafolios (vacíos) y tu historial se conservan.
          </p>
          <Boton variante="peligro" onClick={() => setConfirmarReinicio(true)}>
            Reiniciar mi cuenta
          </Boton>
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Mis datos">
          <form onSubmit={guardar} className="flex flex-col gap-3" noValidate>
            <Campo
              etiqueta="Nombre completo"
              name="nombre"
              value={nombre ?? perfil.nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Campo etiqueta="Correo electrónico" name="correo" value={perfil.correo} disabled readOnly />
            <Campo
              etiqueta="Nueva contraseña (opcional)"
              name="nuevaContrasena"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              error={errores.nuevaContrasena}
              ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
            />
            <Campo
              etiqueta="Contraseña actual"
              name="contrasenaActual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              error={errores.contrasenaActual}
            />
            {errores.general && <Alerta tipo="error">{errores.general}</Alerta>}
            {exito && <Alerta tipo="exito">{exito}</Alerta>}
            <Boton type="submit" cargando={guardando}>
              Guardar cambios
            </Boton>
          </form>
        </Tarjeta>
        <Tarjeta titulo="Resumen de portafolios">
          {perfil.portafolios.length === 0 ? (
            <p className="text-slate-700">Aún no tienes portafolios.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {perfil.portafolios.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link to={`/portafolios/${p.id}`} className="font-medium text-emerald-800 underline">
                    {p.nombre}
                  </Link>
                  <span className="text-right text-sm tabular-nums">
                    {formatearUSD(p.valorCentavos)}
                    <br />
                    <ConSigno valor={p.rendimientoPct}>
                      {p.rendimientoPct === null ? '—' : formatearPct(p.rendimientoPct, true)}
                    </ConSigno>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Dialogo abierto={confirmarReinicio} titulo="¿Reiniciar tu cuenta?" onCerrar={() => setConfirmarReinicio(false)}>
        <p className="mb-4 text-slate-800">
          Se cerrarán tus posiciones sin sumar su valor a tu saldo y comenzarás de nuevo con USD 10.000,00. Esta acción
          no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setConfirmarReinicio(false)}>
            No, volver
          </Boton>
          <Boton variante="peligro" onClick={reiniciar}>
            Sí, reiniciar
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}
