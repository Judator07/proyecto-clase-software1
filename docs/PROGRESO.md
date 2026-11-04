# Progreso del proyecto

Bitácora de avance. Sirve de punto de control para retomar el trabajo y de evidencia del proceso.

## Fases

| Fase | Contenido                                                                                  | Estado       |
| ---- | ------------------------------------------------------------------------------------------ | ------------ |
| 0+1  | Repo profesional, esqueleto desplegable (Vite + React + Hono + D1), CI, D1 creada          | ✅ Hecho     |
| 2    | Informe 01–03, dominio + pruebas unitarias, migraciones 0003–0004 (contenido e históricos) | ⏳ Pendiente |
| 3    | API completa RF-01..RF-22, cron RF-17, pruebas de integración, revisión crítica            | ⏳ Pendiente |
| 4    | Frontend IU-01..IU-11                                                                      | ⏳ Pendiente |
| 5    | Verificación en producción, cuenta de administrador                                        | ⏳ Pendiente |
| 6    | Validación: E2E, accesibilidad, carga, cobertura, informe 05                               | ⏳ Pendiente |
| 7    | Informe 04, 06, 07, 08, PDF y README final                                                 | ⏳ Pendiente |
| 8    | Auditoría final de trazabilidad y PR final                                                 | ⏳ Pendiente |

## Decisiones tomadas con el equipo

- Despliegue con **Cloudflare Workers Builds**. El repositorio se conecta desde el dashboard; la rama de producción es `main`.
- Proveedor de datos de mercado: **Yahoo Finance** (API de gráficos, sin clave), con respaldo en los últimos precios guardados (RNF-04).
- Informe final en Markdown (`docs/informe/`) y PDF generado.

## Pendientes del equipo (acciones humanas)

- [ ] Conectar el repositorio en Cloudflare Workers Builds (pasos en el README, sección _Despliegue_).
- [ ] Confirmar la distribución de roles Scrum de `docs/informe/06-proceso.md`.
- [ ] Ejecutar la prueba de usabilidad con 5 usuarios (RNF-08) y el monitoreo de disponibilidad (RNF-09), siguiendo los protocolos de `docs/informe/05-validacion.md`.

## Bitácora

- **2026-11-04**: lectura completa del SRS v1.0 y del Taller UML y plan aprobado.
  - Se creó la D1 `simulador-inversion-db`.
  - Esqueleto con `/api/salud` y sondas temporales del proveedor y de PBKDF2.
  - Migraciones 0001 (esquema) y 0002 (catálogo).
