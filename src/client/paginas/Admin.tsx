/** IU-11: panel de administración del catálogo (RF-18) y del contenido educativo (RF-20). */
import { useState, type FormEvent } from 'react';
import {
  TEMAS,
  type ArticuloDto,
  type ArticuloResumenDto,
  type InstrumentoDto,
  type Tema,
} from '../../compartido/tipos';
import { formatearFecha, formatearPrecio } from '../../dominio/formato';
import { NOMBRES_TIPO } from '../../dominio/reglas';
import { api, useApi } from '../api';
import {
  Alerta,
  Boton,
  Campo,
  Cargando,
  Dialogo,
  Insignia,
  Pestanas,
  Selector,
  Tarjeta,
  Titulo,
} from '../componentes/ui';

function Catalogo() {
  const { datos, error, cargando, recargar } = useApi<InstrumentoDto[]>('/admin/instrumentos');
  const [nuevo, setNuevo] = useState({
    simbolo: '',
    simboloProveedor: '',
    nombre: '',
    tipo: 'ACCION',
    descripcion: '',
  });
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const i = await api.post<InstrumentoDto>('/admin/instrumentos', {
        ...nuevo,
        simboloProveedor: nuevo.simboloProveedor || null,
      });
      setMensaje({ tipo: 'exito', texto: `${i.simbolo} agregado con precio ${formatearPrecio(i.precioActual)}.` });
      setNuevo({ simbolo: '', simboloProveedor: '', nombre: '', tipo: 'ACCION', descripcion: '' });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  async function actualizarPrecios() {
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await api.post<{ actualizados: number; fallidos: string[] }>('/admin/precios/actualizacion');
      setMensaje({
        tipo: r.fallidos.length ? 'error' : 'exito',
        texto: `Precios actualizados: ${r.actualizados}.${r.fallidos.length ? ` Fallaron: ${r.fallidos.join(', ')}.` : ''}`,
      });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(i: InstrumentoDto) {
    try {
      await api.patch(`/admin/instrumentos/${i.id}`, { activo: !i.activo });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Tarjeta
        titulo="Catálogo de instrumentos"
        className="lg:col-span-2"
        acciones={
          <Boton variante="secundario" onClick={actualizarPrecios} cargando={guardando}>
            Actualizar precios ahora
          </Boton>
        }
      >
        {cargando && !datos && <Cargando />}
        {error && <Alerta tipo="error">{error}</Alerta>}
        {datos && (
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla con desplazamiento">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="py-2">
                    Símbolo
                  </th>
                  <th scope="col" className="py-2">
                    Tipo
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Precio
                  </th>
                  <th scope="col" className="py-2">
                    Estado
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      <span className="font-semibold">{i.simbolo}</span>
                      <span className="block text-slate-700">{i.nombre}</span>
                    </td>
                    <td className="py-2">{NOMBRES_TIPO[i.tipo]}</td>
                    <td className="py-2 text-right tabular-nums">
                      {i.tipo === 'AHORRO' ? '—' : formatearPrecio(i.precioActual)}
                    </td>
                    <td className="py-2">
                      {i.activo ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}
                    </td>
                    <td className="py-2 text-right">
                      <Boton variante="secundario" onClick={() => alternar(i)}>
                        {i.activo ? 'Desactivar' : 'Activar'}
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      <Tarjeta titulo="Agregar instrumento">
        <form onSubmit={agregar} className="flex flex-col gap-3">
          <Campo
            etiqueta="Símbolo"
            name="simbolo"
            required
            value={nuevo.simbolo}
            onChange={(e) => setNuevo({ ...nuevo, simbolo: e.target.value.toUpperCase() })}
          />
          <Campo
            etiqueta="Símbolo en el proveedor (opcional)"
            name="simboloProveedor"
            value={nuevo.simboloProveedor}
            onChange={(e) => setNuevo({ ...nuevo, simboloProveedor: e.target.value.toUpperCase() })}
            ayuda="Para criptomonedas usa el par en USD, p. ej. DOGE-USD."
          />
          <Campo
            etiqueta="Nombre"
            name="nombreInstrumento"
            required
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          />
          <Selector
            etiqueta="Tipo"
            name="tipo"
            value={nuevo.tipo}
            onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
          >
            <option value="ACCION">Acción</option>
            <option value="ETF">ETF</option>
            <option value="CRIPTO">Criptomoneda</option>
          </Selector>
          <Campo
            etiqueta="Descripción (opcional)"
            name="descripcion"
            value={nuevo.descripcion}
            onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
          />
          {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}
          <Boton type="submit" cargando={guardando}>
            Agregar al catálogo
          </Boton>
        </form>
      </Tarjeta>
    </div>
  );
}

const VACIO = {
  titulo: '',
  tema: 'CONCEPTOS_BASICOS' as Tema,
  resumen: '',
  cuerpo: '',
  estado: 'BORRADOR' as 'BORRADOR' | 'PUBLICADO',
};

function Contenido() {
  const { datos, error, cargando, recargar } = useApi<ArticuloResumenDto[]>('/admin/contenido');
  const [edicion, setEdicion] = useState<(typeof VACIO & { id?: number }) | null>(null);
  const [aEliminar, setAEliminar] = useState<ArticuloResumenDto | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function editar(id: number) {
    const a = await api.get<ArticuloDto>(`/admin/contenido/${id}`);
    setEdicion({ id: a.id, titulo: a.titulo, tema: a.tema, resumen: a.resumen, cuerpo: a.cuerpo, estado: a.estado });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!edicion) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const { id, ...cuerpo } = edicion;
      if (id) await api.put(`/admin/contenido/${id}`, cuerpo);
      else await api.post('/admin/contenido', cuerpo);
      setMensaje({ tipo: 'exito', texto: 'Artículo guardado.' });
      setEdicion(null);
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    try {
      await api.del(`/admin/contenido/${aEliminar.id}`);
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message });
    } finally {
      setAEliminar(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}
      {edicion ? (
        <Tarjeta titulo={edicion.id ? 'Editar artículo' : 'Nuevo artículo'}>
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <Campo
              etiqueta="Título"
              name="titulo"
              required
              maxLength={150}
              value={edicion.titulo}
              onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                etiqueta="Tema"
                name="tema"
                value={edicion.tema}
                onChange={(e) => setEdicion({ ...edicion, tema: e.target.value as Tema })}
              >
                {Object.entries(TEMAS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Selector>
              <Selector
                etiqueta="Estado"
                name="estado"
                value={edicion.estado}
                onChange={(e) => setEdicion({ ...edicion, estado: e.target.value as 'BORRADOR' | 'PUBLICADO' })}
              >
                <option value="BORRADOR">Borrador (no visible)</option>
                <option value="PUBLICADO">Publicado</option>
              </Selector>
            </div>
            <Campo
              etiqueta="Resumen"
              name="resumen"
              maxLength={300}
              value={edicion.resumen}
              onChange={(e) => setEdicion({ ...edicion, resumen: e.target.value })}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="cuerpo" className="text-sm font-medium text-slate-800">
                Cuerpo (Markdown)
              </label>
              <textarea
                id="cuerpo"
                required
                rows={14}
                value={edicion.cuerpo}
                onChange={(e) => setEdicion({ ...edicion, cuerpo: e.target.value })}
                className="rounded-lg border border-slate-400 bg-white px-3 py-2 font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Boton type="submit" cargando={guardando}>
                Guardar
              </Boton>
              <Boton type="button" variante="secundario" onClick={() => setEdicion(null)}>
                Cancelar
              </Boton>
            </div>
          </form>
        </Tarjeta>
      ) : (
        <Tarjeta
          titulo="Contenido educativo"
          acciones={<Boton onClick={() => setEdicion({ ...VACIO })}>Nuevo artículo</Boton>}
        >
          {cargando && !datos && <Cargando />}
          {error && <Alerta tipo="error">{error}</Alerta>}
          <ul className="divide-y divide-slate-100">
            {datos?.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{a.titulo}</p>
                  <p className="text-sm text-slate-700">
                    {TEMAS[a.tema]} · Actualizado el {formatearFecha(a.actualizadoEn)}{' '}
                    {a.estado === 'PUBLICADO' ? (
                      <Insignia tono="verde">Publicado</Insignia>
                    ) : (
                      <Insignia tono="ambar">Borrador</Insignia>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Boton variante="secundario" onClick={() => editar(a.id)}>
                    Editar
                  </Boton>
                  <Boton variante="peligro" onClick={() => setAEliminar(a)}>
                    Eliminar
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      <Dialogo abierto={aEliminar !== null} titulo="¿Eliminar artículo?" onCerrar={() => setAEliminar(null)}>
        <p className="mb-4">Se eliminará "{aEliminar?.titulo}". Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setAEliminar(null)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={eliminar}>
            Eliminar
          </Boton>
        </div>
      </Dialogo>
    </div>
  );
}

export default function Admin() {
  const [pestana, setPestana] = useState<'catalogo' | 'contenido'>('catalogo');
  return (
    <div>
      <Titulo subtitulo="Gestión del catálogo de instrumentos y del contenido educativo.">Administración</Titulo>
      <div className="mb-6">
        <Pestanas
          etiqueta="Sección de administración"
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: 'catalogo', texto: 'Catálogo de instrumentos' },
            { valor: 'contenido', texto: 'Contenido educativo' },
          ]}
        />
      </div>
      {pestana === 'catalogo' ? <Catalogo /> : <Contenido />}
    </div>
  );
}
