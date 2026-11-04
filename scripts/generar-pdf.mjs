#!/usr/bin/env node
/**
 * Genera los PDF del informe final y del manual de usuario a partir de los Markdown de docs/:
 * pandoc (Markdown → HTML con los diagramas SVG incrustados) y Chromium (HTML → PDF A4).
 * Uso: node scripts/generar-pdf.mjs   (requiere pandoc instalado)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const raiz = resolve(import.meta.dirname, '..');
const salida = join(raiz, 'docs', 'entregas');
const temporal = join(raiz, 'docs', 'informe', 'build');
mkdirSync(temporal, { recursive: true });
const fecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
}).format(new Date());

function portada(titulo, subtitulo) {
  return `<div class="portada">
  <div><div>UNIVERSIDAD INDUSTRIAL DE SANTANDER</div><div>Escuela de Ingeniería de Sistemas e Informática</div>
  <div class="titulo">${titulo}</div><div class="subtitulo">${subtitulo}</div>
  <div class="subtitulo">Asignatura: Ingeniería de Software I · Docente: Gabriel Pedraza Ferreira</div></div>
  <div class="equipo"><strong>Integrantes</strong><br>Juan Daniel Torres Ramírez<br>Camilo Andrés Velandia Mendoza<br>Santiago Fonseca Hernández</div>
  <div class="pie">Bucaramanga, ${fecha}<br>Repositorio: github.com/Judator07/proyecto-clase-software1<br>Aplicación: simulador-inversion.juandanieltorresr.workers.dev</div>
</div>`;
}

async function generar({ archivos, rutaRecursos, titulo, subtitulo, nombre, indice }) {
  const html = join(temporal, `${nombre}.html`);
  const antes = join(temporal, `${nombre}-portada.html`);
  writeFileSync(antes, portada(titulo, subtitulo));
  execFileSync('pandoc', [
    ...archivos,
    '--from',
    'gfm',
    '--to',
    'html5',
    '--standalone',
    '--embed-resources',
    '--resource-path',
    rutaRecursos,
    '--metadata',
    `title=${titulo}`,
    '--metadata',
    'lang=es',
    '--css',
    join(raiz, 'docs', 'plantilla', 'estilo.css'),
    '--include-before-body',
    antes,
    ...(indice ? ['--toc', '--toc-depth=2', '--metadata', 'toc-title=Contenido'] : []),
    '-o',
    html,
  ]);
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  await pagina.goto(`file://${html}`, { waitUntil: 'load' });
  const pdf = join(salida, `${nombre}.pdf`);
  await pagina.pdf({
    path: pdf,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7pt;width:100%;text-align:right;padding-right:18mm;color:#555">${titulo} · Plataforma de Simulación de Inversión</div>`,
    footerTemplate:
      '<div style="font-size:8pt;width:100%;text-align:center;color:#555"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '22mm', bottom: '20mm', left: '18mm', right: '18mm' },
  });
  await navegador.close();
  console.log(`PDF generado: ${pdf}`);
}

const informe = join(raiz, 'docs', 'informe');
await generar({
  archivos: readdirSync(informe)
    .filter((f) => /^\d{2}-.*\.md$/.test(f))
    .sort()
    .map((f) => join(informe, f)),
  rutaRecursos: informe,
  titulo: 'Informe final del proyecto',
  subtitulo: 'Plataforma de Simulación de Inversión',
  nombre: 'Informe_Final_Plataforma_Simulacion_Inversion',
  indice: true,
});
await generar({
  archivos: [join(raiz, 'docs', 'manual-usuario.md')],
  rutaRecursos: join(raiz, 'docs'),
  titulo: 'Manual de usuario',
  subtitulo: 'Plataforma de Simulación de Inversión',
  nombre: 'Manual_de_Usuario_Plataforma_Simulacion_Inversion',
  indice: false,
});
