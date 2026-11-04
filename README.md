# Plataforma de Simulación de Inversión

[![CI](https://github.com/Judator07/proyecto-clase-software1/actions/workflows/ci.yml/badge.svg)](https://github.com/Judator07/proyecto-clase-software1/actions/workflows/ci.yml)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-green)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020)

Aplicación web **educativa** para simular inversiones en **acciones, ETF, criptomonedas y cuentas de ahorro** con dinero ficticio. Permite crear portafolios, comprar y vender a precios reales del mercado, analizar el rendimiento con gráficos y estadísticas, simular escenarios (crisis, mercado alcista, alza de tasas) y aprender conceptos financieros sin arriesgar dinero real.

> Proyecto final de **Ingeniería de Software I**, Escuela de Ingeniería de Sistemas e Informática, Universidad Industrial de Santander (2026-2). Docente: Gabriel Pedraza Ferreira.

> ⚠️ Plataforma de simulación con fines educativos. No usa dinero real ni constituye asesoría financiera.

## Funcionalidades

| Módulo                    | Qué permite                                                                                                  | Requerimientos |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------- |
| Registro y perfil         | Cuenta con saldo ficticio de USD 10.000, perfil y reinicio por bancarrota simulada                           | RF-01 a RF-05  |
| Simulación de inversiones | Catálogo, precios actuales e históricos, compra y venta, cuentas de ahorro con interés compuesto e historial | RF-06 a RF-11  |
| Portafolios               | Hasta 10 portafolios con balance y rendimiento                                                               | RF-12 a RF-14  |
| Datos y gráficos          | Gráficos de precio, valor y composición, estadísticas y tendencias, actualización automática de precios      | RF-15 a RF-18  |
| Aprendizaje               | Centro de contenido educativo público                                                                        | RF-19, RF-20   |
| Escenarios                | Proyección ante crisis, mercado alcista o alza de tasas, con variables ajustables                            | RF-21, RF-22   |

## Arquitectura

```
Navegador (SPA React)  ──HTTPS/JSON──►  Cloudflare Worker (Hono)  ──►  Cloudflare D1 (SQLite)
                                              │   ▲
                                              │   └── Cron Trigger cada 15 min (RF-17)
                                              └──► Yahoo Finance (precios actuales e históricos)
```

- **Capas (RNF-11):**
  - `src/dominio`: reglas y cálculos financieros puros.
  - `src/server/rutas`: API.
  - `src/server/servicios`: lógica de negocio.
  - `src/server/datos`: persistencia y proveedor de mercado.
  - `src/client`: interfaz.
- **Stack:** TypeScript, React, Tailwind CSS, Recharts, Hono, Zod, Cloudflare Workers, D1, Vite, Vitest y Playwright.

## Inicio rápido

Requisitos: Node.js 22 o superior.

```bash
npm install
```

```bash
npm run db:migrar:local
```

```bash
npm run dev
```

La aplicación queda en `http://localhost:5173` y usa una base D1 local (en `.wrangler/`).

## Scripts

| Script                                | Descripción                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                         | Servidor de desarrollo (SPA y Worker)                              |
| `npm run build`                       | Compilación de producción                                          |
| `npm run lint` / `npm run typecheck`  | Calidad de código                                                  |
| `npm test` / `npm run test:cobertura` | Pruebas unitarias e integración, con cobertura                     |
| `npm run test:e2e`                    | Pruebas de extremo a extremo con Playwright                        |
| `npm run db:migrar:local`             | Aplica las migraciones a la D1 local                               |
| `npm run deploy`                      | Aplica las migraciones remotas y despliega (lo usa Workers Builds) |

## Despliegue (Cloudflare Workers Builds)

El despliegue es automático en cada push a `main`. Configuración inicial, una sola vez:

1. En el [dashboard de Cloudflare](https://dash.cloudflare.com/), entra a **Workers & Pages → Create → Import a repository**.
2. Autoriza la app de Cloudflare en GitHub para el repositorio `Judator07/proyecto-clase-software1` y selecciónalo.
3. Configura el proyecto:
   - **Project name:** `simulador-inversion`. Debe coincidir con `name` en `wrangler.jsonc`.
   - **Production branch:** `main`.
   - **Build command:** `npm run build`.
   - **Deploy command:** `npm run deploy`.
   - **Non-production branch deploy command:** `npx wrangler versions upload`. Así no se aplican migraciones desde otras ramas.
4. Guarda y despliega. La URL queda como `https://simulador-inversion.<subdominio>.workers.dev`.

La base de datos D1 `simulador-inversion-db` ya existe y está enlazada en `wrangler.jsonc`.

## Documentación

- [Informe del proyecto](docs/informe/): problema, requerimientos, análisis, diseño, validación, proceso, conclusiones y perspectivas.
- [SRS v1.0](docs/entregas/SRS_Plataforma_Simulacion_Inversion_v1.0.pdf) y [Taller de análisis UML](docs/entregas/Taller_UML_Plataforma_Simulacion_Inversion_v1.0.pdf).
- [Progreso del proyecto](docs/PROGRESO.md).
- [Guía de contribución](CONTRIBUTING.md).

## Equipo

- Juan Daniel Torres Ramírez
- Camilo Andrés Velandia Mendoza
- Santiago Fonseca Hernández

## Uso de inteligencia artificial

Siguiendo la orientación de la asignatura, el proyecto se desarrolló con apoyo de un asistente de IA (Claude Code). El equipo definió los requerimientos y el análisis, y revisó y validó el resultado. El detalle está en el informe, sección _Proceso_.

## Licencia

[MIT](LICENSE)
