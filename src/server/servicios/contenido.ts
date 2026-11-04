/** Centro de aprendizaje: consulta pública (RF-19) y administración del contenido educativo (RF-20). */
import type { ArticuloDto, ArticuloResumenDto, Tema } from '../../compartido/tipos';
import { ErrorAplicacion, noEncontrado } from '../errores';

interface FilaArticulo {
  id: number;
  slug: string;
  titulo: string;
  tema: Tema;
  resumen: string;
  cuerpo?: string;
  estado: 'BORRADOR' | 'PUBLICADO';
  publicado_en: string | null;
  actualizado_en: string;
}

const COLUMNAS_RESUMEN = 'id, slug, titulo, tema, resumen, estado, publicado_en, actualizado_en';

function aResumen(f: FilaArticulo): ArticuloResumenDto {
  return {
    id: f.id,
    slug: f.slug,
    titulo: f.titulo,
    tema: f.tema,
    resumen: f.resumen,
    estado: f.estado,
    publicadoEn: f.publicado_en,
    actualizadoEn: f.actualizado_en,
  };
}

function aArticulo(f: FilaArticulo): ArticuloDto {
  return { ...aResumen(f), cuerpo: f.cuerpo ?? '' };
}

export async function listarArticulos(
  db: D1Database,
  filtro: { tema?: Tema; texto?: string; incluirBorradores?: boolean },
): Promise<ArticuloResumenDto[]> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  if (!filtro.incluirBorradores) condiciones.push("estado = 'PUBLICADO'");
  if (filtro.tema) {
    condiciones.push('tema = ?');
    valores.push(filtro.tema);
  }
  if (filtro.texto) {
    condiciones.push('(titulo LIKE ? OR resumen LIKE ? OR cuerpo LIKE ?)');
    const patron = `%${filtro.texto}%`;
    valores.push(patron, patron, patron);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`SELECT ${COLUMNAS_RESUMEN} FROM contenido_educativo ${donde} ORDER BY tema, titulo`)
    .bind(...valores)
    .all<FilaArticulo>();
  return results.map(aResumen);
}

/** RF-19 / RF-20: un artículo en borrador no es visible para los usuarios. */
export async function articuloPublicado(db: D1Database, slug: string): Promise<ArticuloDto> {
  const fila = await db
    .prepare("SELECT * FROM contenido_educativo WHERE slug = ? AND estado = 'PUBLICADO'")
    .bind(slug)
    .first<FilaArticulo>();
  if (!fila) throw noEncontrado('Artículo');
  return aArticulo(fila);
}

export async function articuloPorId(db: D1Database, id: number): Promise<ArticuloDto> {
  const fila = await db.prepare('SELECT * FROM contenido_educativo WHERE id = ?').bind(id).first<FilaArticulo>();
  if (!fila) throw noEncontrado('Artículo');
  return aArticulo(fila);
}

export interface DatosArticulo {
  titulo: string;
  tema: Tema;
  resumen: string;
  cuerpo: string;
  estado: 'BORRADOR' | 'PUBLICADO';
}

function exigirCompleto(d: DatosArticulo) {
  if (!d.titulo.trim() || !d.cuerpo.trim() || !d.tema) {
    throw new ErrorAplicacion(400, 'El título, el tema y el cuerpo del artículo son obligatorios.');
  }
}

export function generarSlug(titulo: string): string {
  return (
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'articulo'
  );
}

/** RF-20: crear artículo (borrador o publicado). */
export async function crearArticulo(db: D1Database, autorId: number, d: DatosArticulo): Promise<ArticuloDto> {
  exigirCompleto(d);
  const base = generarSlug(d.titulo);
  const existentes = await db
    .prepare('SELECT slug FROM contenido_educativo WHERE slug = ? OR slug LIKE ?')
    .bind(base, `${base}-%`)
    .all<{ slug: string }>();
  const usados = new Set(existentes.results.map((r) => r.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  const ahora = new Date().toISOString();
  let fila: FilaArticulo | null;
  try {
    fila = await db
      .prepare(
        `INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, autor_id, publicado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(
        slug,
        d.titulo.trim(),
        d.tema,
        d.resumen.trim(),
        d.cuerpo,
        d.estado,
        autorId,
        d.estado === 'PUBLICADO' ? ahora : null,
      )
      .first<FilaArticulo>();
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw new ErrorAplicacion(409, 'Ya existe un artículo con un título equivalente. Intenta de nuevo.');
    throw e;
  }
  return aArticulo(fila!);
}

/** RF-20: editar y publicar. */
export async function actualizarArticulo(db: D1Database, id: number, d: DatosArticulo): Promise<ArticuloDto> {
  exigirCompleto(d);
  const actual = await articuloPorId(db, id);
  const ahora = new Date().toISOString();
  const publicadoEn = d.estado === 'PUBLICADO' ? (actual.publicadoEn ?? ahora) : null;
  await db
    .prepare(
      `UPDATE contenido_educativo SET titulo = ?, tema = ?, resumen = ?, cuerpo = ?, estado = ?, publicado_en = ?,
              actualizado_en = ? WHERE id = ?`,
    )
    .bind(d.titulo.trim(), d.tema, d.resumen.trim(), d.cuerpo, d.estado, publicadoEn, ahora, id)
    .run();
  return articuloPorId(db, id);
}

/** RF-20: eliminar (la confirmación se pide en la interfaz). */
export async function eliminarArticulo(db: D1Database, id: number): Promise<void> {
  const r = await db.prepare('DELETE FROM contenido_educativo WHERE id = ?').bind(id).run();
  if (!r.meta.changes) throw noEncontrado('Artículo');
}
