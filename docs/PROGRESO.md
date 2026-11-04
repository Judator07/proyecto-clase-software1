# Progreso del proyecto

Bitácora de avance. Sirve de punto de control para retomar el trabajo y de evidencia del proceso.

## Fases

| Fase | Contenido                                                                                  | Estado                                         |
| ---- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 0+1  | Repo profesional, esqueleto desplegable (Vite + React + Hono + D1), CI, D1 creada          | ✅ Hecho                                       |
| 2    | Informe 01–03, dominio + pruebas unitarias, migraciones 0003–0004 (contenido e históricos) | ✅ Hecho                                       |
| 3    | API completa RF-01..RF-22, cron RF-17, pruebas de integración, revisión crítica            | ✅ Hecho                                       |
| 4    | Frontend IU-01..IU-11                                                                      | ✅ Hecho                                       |
| 5    | Verificación en producción, cuenta de administrador                                        | ✅ Hecho (E2E 10/10 en producción)             |
| 6    | Validación: E2E, accesibilidad, carga, cobertura, informe 05                               | ✅ Hecho, con pendientes (ver abajo)           |
| 7    | Informe 04, 06, 07, 08, manual, README final                                               | ✅ Hecho; faltan capturas del manual y los PDF |
| 8    | Auditoría final de trazabilidad y PR final                                                 | ✅ Auditoría hecha y corregida; PR #2 en curso |

## Decisiones tomadas con el equipo

- Despliegue con **Cloudflare Workers Builds**: rama de producción `main`, URL <https://simulador-inversion.juandanieltorresr.workers.dev>.
- Proveedor de datos: **Yahoo Finance**, verificado desde la red de Cloudflare, con respaldo en los últimos precios (RNF-04).
- Informe en Markdown (`docs/informe/`) y PDF (`npm run informe:pdf`).

## Pendientes

### Del agente (próxima sesión de trabajo)

- [ ] Después de la medianoche UTC, cuando se reinicia la cuota de escrituras de D1:
  - verificar que el cron actualice precios (`estado_precio = 'ACTUALIZADO'`);
  - borrar los 56 usuarios de prueba (`correo LIKE '%@prueba.co' OR correo LIKE '%@p.co'`, en orden: transaccion, deposito_ahorro, posicion, valoracion_portafolio, portafolio, sesion, usuario);
  - repetir la carga con perfil realista: `npm run test:carga -- <url> 50 600 10000`;
  - actualizar §5.4.
- [ ] Tomar las capturas del manual en producción (`docs/manual/{panel,instrumento,portafolio,escenarios}.png`) y generar los PDF en `docs/entregas/`.

### Del equipo (acciones humanas)

- [ ] Confirmar la distribución de roles Scrum de `docs/informe/06-proceso.md` §6.3.
- [ ] Prueba de usabilidad con 5 usuarios (RNF-08) y monitoreo de 2 semanas en UptimeRobot (RNF-09); protocolos en `docs/informe/05-validacion.md` §5.6.
- [ ] Probar en Firefox y Edge (RNF-12).
- [ ] Grabar el video demostrativo (SRS §2.6).
- [ ] Cambiar la contraseña de la cuenta de administrador.

## Bitácora

- **2026-11-04 (UTC)**
  - Se leyeron completos el SRS v1.0 y el Taller UML y se aprobó el plan.
  - Fases 0–7: esqueleto, dominio, API, revisión crítica, interfaz, E2E con axe, despliegue a producción (PR #1) e informe 01–08.
  - Prueba de carga en producción (50 usuarios, ~97 req/s): p95 de 738 ms y 0 saldos inconsistentes. Hubo 13 % de errores porque se agotó la **cuota diaria de 100.000 filas escritas** del plan gratuito de D1, confirmado con el error 7500. Mientras no se reinicie la cuota (medianoche UTC), la producción no admite escrituras.
  - Correcciones: renovación de sesión de mejor esfuerzo, 503 explícito, lecturas en lote y cron con unas 2.000 filas al día. También el desborde a 360 px en IU-08 y el botón de administración "Actualizar precios ahora".
