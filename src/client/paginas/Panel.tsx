/** IU-03: panel principal con el resumen del usuario y sus portafolios (RF-03, RF-12). */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PerfilDto, ResumenPortafolioDto } from '../../compartido/tipos';
import { formatearUSD } from '../../dominio/dinero';
import { formatearPct } from '../../dominio/formato';
import { MAX_PORTAFOLIOS } from '../../dominio/reglas';
import { api, ErrorCliente, useApi } from '../api';
import { Alerta, Boton, Campo, Cargando, ConSigno, Indicador, Tarjeta, Titulo, Vacio } from '../componentes/ui';

export function AvisoBancarrota() {
  return (
    <Alerta tipo="error" className="mb-6">
      <strong>Tu cuenta está en bancarrota simulada:</strong> tu patrimonio es menor que USD 100,00. No puedes hacer
      nuevas compras ni depósitos.{' '}
      <Link to="/perfil" className="font-semibold underline">
        Reinicia tu cuenta desde tu perfil
      </Link>{' '}
      para volver a empezar con USD 10.000,00.
    </Alerta>
  );
}

export default function Panel() {
  const [parametros] = useSearchParams();
  const { datos: perfil, error, cargando, recargar } = useApi<PerfilDto>('/perfil');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setCreando(true);
    setErrorNombre(null);
    try {
      await api.post<ResumenPortafolioDto>('/portafolios', { nombre, descripcion: descripcion || null });
      setNombre('');
      setDescripcion('');
      recargar();
    } catch (err) {
      setErrorNombre(err instanceof ErrorCliente ? err.message : 'No se pudo crear el portafolio.');
    } finally {
      setCreando(false);
    }
  }

  if (cargando && !perfil) return <Cargando />;
  if (error || !perfil) return <Alerta tipo="error">{error}</Alerta>;
  const limite = perfil.portafolios.length >= MAX_PORTAFOLIOS;

  return (
    <div>
      <Titulo subtitulo="Este es el resumen de tus inversiones simuladas.">Hola, {perfil.nombre.split(' ')[0]}</Titulo>
      {parametros.get('bienvenida') && (
        <Alerta tipo="exito" className="mb-6">
          ¡Bienvenido! Tienes USD 10.000,00 ficticios. Para tu primera inversión: crea un portafolio aquí abajo, ve a{' '}
          <Link to="/instrumentos" className="font-semibold underline">
            Instrumentos
          </Link>
          , elige uno y compra.
        </Alerta>
      )}
      {perfil.enBancarrota && <AvisoBancarrota />}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Indicador etiqueta="Saldo disponible" valor={formatearUSD(perfil.saldoCentavos)} />
        <Indicador etiqueta="Valor invertido (mercado)" valor={formatearUSD(perfil.valorInvertidoCentavos)} />
        <Indicador
          etiqueta="Patrimonio total"
          valor={formatearUSD(perfil.patrimonioCentavos)}
          detalle={
            <ConSigno valor={perfil.patrimonioCentavos - 1_000_000}>
              {formatearPct(((perfil.patrimonioCentavos - 1_000_000) / 1_000_000) * 100, true)} frente al saldo inicial
            </ConSigno>
          }
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="titulo-portafolios">
          <h2 id="titulo-portafolios" className="mb-3 text-xl font-semibold">
            Mis portafolios ({perfil.portafolios.length}/{MAX_PORTAFOLIOS})
          </h2>
          {perfil.portafolios.length === 0 ? (
            <Vacio>Aún no tienes portafolios. Crea el primero para empezar a invertir.</Vacio>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {perfil.portafolios.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/portafolios/${p.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-600"
                  >
                    <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
                    {p.descripcion && <p className="text-sm text-slate-700">{p.descripcion}</p>}
                    <p className="mt-2 text-xl font-bold tabular-nums">{formatearUSD(p.valorCentavos)}</p>
                    <p className="text-sm">
                      Rendimiento:{' '}
                      <ConSigno valor={p.rendimientoPct}>
                        {p.rendimientoPct === null ? '—' : formatearPct(p.rendimientoPct, true)}
                      </ConSigno>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Tarjeta titulo="Crear portafolio">
          {limite ? (
            <Alerta tipo="info">
              Alcanzaste el límite de {MAX_PORTAFOLIOS} portafolios. Elimina uno para crear otro.
            </Alerta>
          ) : (
            <form onSubmit={crear} className="flex flex-col gap-3" noValidate>
              <Campo
                etiqueta="Nombre"
                name="nombre"
                maxLength={50}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={errorNombre}
              />
              <Campo
                etiqueta="Descripción (opcional)"
                name="descripcion"
                maxLength={200}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
              <Boton type="submit" cargando={creando}>
                Crear portafolio
              </Boton>
            </form>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
