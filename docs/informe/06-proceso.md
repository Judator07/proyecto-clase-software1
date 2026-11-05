# 6. Descripción del proceso

> ⚠️ **Por confirmar por el equipo.** Esta sección reconstruye el proceso a partir de la evidencia disponible: el historial de revisiones del SRS, la fecha del Taller UML y el historial de commits. La **distribución de roles y de trabajo** de la §6.3 es una _propuesta_ que el equipo debe ajustar a lo que realmente hizo cada integrante antes de entregar.

## 6.1 Modelo de proceso

Se usó un proceso **ágil basado en Scrum**, como fija el SRS §2.5, con estos elementos:

- **Product backlog** formado por los requerimientos del SRS (RU → RF/RNF), priorizados con la prioridad de desarrollo del propio SRS: primero los Alta, luego los Media y por último los Baja.
- **Sprints con entregable verificable.** Cada sprint termina con un incremento revisable: un documento aprobado o software desplegado.
- **Definición de terminado (DoD) del producto:**
  - código en el repositorio;
  - lint y tipos sin errores;
  - pruebas en verde en la CI;
  - requerimiento trazado a su prueba;
  - integración a `main` mediante pull request y despliegue automático.
- **Control de versiones.** Git y GitHub con ramas de trabajo, pull requests y commits en estilo convencional. Ver la [guía de contribución](../../CONTRIBUTING.md).

## 6.2 Sprints

| Sprint | Periodo             | Objetivo                                | Incremento y evidencia                                                                                                                                                             |
| ------ | ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Semanas 1–2         | Propuesta y conformación del equipo     | Selección del proyecto _Plataforma de Simulación de Inversión_ y propuesta (entrega de la semana 2).                                                                               |
| 1      | Semanas 3–5         | Ingeniería de requerimientos            | Necesidades y RU; prototipos del SRS en clase (v0.1 identificación inicial, v0.2 refinamiento).                                                                                    |
| 2      | Hasta el 25/09/2026 | Especificación y análisis               | **SRS v1.0** (18/09/2026): 22 RF, 12 RNF, 9 RN, 11 IU. **Taller de análisis UML** (25/09/2026): clases, casos de uso, estados y actividades.                                       |
| 3      | 04/11/2026          | Construcción asistida por IA            | Software desplegado en producción, informe 01–04 y pruebas. Las iteraciones de este sprint están en la tabla siguiente.                                                            |
| 4      | Hasta la semana 16  | Validación con usuarios y entrega final | Pendiente: prueba de usabilidad con 5 usuarios (RNF-08), 2 semanas de monitoreo de disponibilidad (RNF-09), pruebas en Firefox y Edge (RNF-12), video demostrativo y presentación. |

### Iteraciones del sprint 3 (historial de commits, hora UTC)

| Iteración                 | Commit                                                                | Resultado                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.0 Plan                  | —                                                                     | Lectura completa del SRS y del Taller, plan aprobado por el equipo, decisiones (despliegue, proveedor de datos, formato del informe) y revisión crítica del plan por un agente independiente. |
| 3.1 Esqueleto desplegable | `bfe735e`                                                             | Repositorio profesional, CI, D1 creada y primer despliegue. En producción se verificó el proveedor de datos y el costo de PBKDF2.                                                             |
| 3.2 Dominio y datos       | `0e364e8`                                                             | Reglas y cálculos financieros con 35 pruebas (en ese commit), contenido educativo y 25.419 cierres históricos.                                                                                |
| 3.3 Informe 01–03         | `82d1482`                                                             | Problema, requerimientos (SRS v1.1) y diagramas de análisis corregidos.                                                                                                                       |
| 3.4 API                   | `c9137e5`                                                             | RF-01 a RF-22, cron de RF-17 y 37 pruebas de integración (en ese commit; hoy son 43).                                                                                                         |
| 3.5 Revisión crítica      | `7fd5193`                                                             | Un agente revisor independiente encontró 9 defectos; se corrigieron todos y se agregaron pruebas de regresión.                                                                                |
| 3.6 Interfaz              | `01bbd6d`                                                             | Pantallas IU-01 a IU-11.                                                                                                                                                                      |
| 3.7 Validación E2E        | `ff5a4d9`                                                             | Suite Playwright con axe: encontró y corrigió 2 fallas de accesibilidad y 1 desborde a 360 px.                                                                                                |
| 3.8 Integración           | PR [#1](https://github.com/Judator07/proyecto-clase-software1/pull/1) | Integración a `main` y despliegue automático a producción.                                                                                                                                    |
| 3.9 Informe y cierre      | commits posteriores                                                   | Diseño, validación, proceso, conclusiones, perspectivas, PDF y auditoría final.                                                                                                               |
| 3.10 Revalidación         | PR [#2](https://github.com/Judator07/proyecto-clase-software1/pull/2) | Después del reinicio de la cuota de D1: cron verificado en producción y segunda prueba de carga con perfil realista, sin errores y con un p95 de 214 ms.                                      |

## 6.3 Roles y distribución del trabajo (propuesta)

| Rol Scrum            | Integrante (propuesto)         | Responsabilidades                                                                                                                      |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Product Owner        | Juan Daniel Torres Ramírez     | Priorizar el backlog, validar los criterios de aceptación del SRS y tomar las decisiones de producto (proveedor, despliegue, alcance). |
| Scrum Master         | Camilo Andrés Velandia Mendoza | Facilitar las reuniones, eliminar impedimentos y velar por la definición de terminado y el control de versiones.                       |
| Equipo de desarrollo | Los tres integrantes           | Análisis, diseño, implementación, pruebas y documentación.                                                                             |

| Área de trabajo                                                   | Responsable principal (propuesto) | Apoyo                          |
| ----------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| Requerimientos (SRS) y validación con usuarios                    | Juan Daniel Torres Ramírez        | Todo el equipo                 |
| Análisis UML (Taller) y diseño                                    | Camilo Andrés Velandia Mendoza    | Santiago Fonseca Hernández     |
| Pruebas, accesibilidad e informe de validación                    | Santiago Fonseca Hernández        | Camilo Andrés Velandia Mendoza |
| Supervisión del asistente de IA, revisión de código e integración | Juan Daniel Torres Ramírez        | Todo el equipo                 |

## 6.4 Uso de inteligencia artificial

Siguiendo la orientación del docente, la construcción (sprint 3) se hizo con **Claude Code**, el asistente de ingeniería de software de Anthropic, que trabajó sobre el repositorio con supervisión del equipo.

**Lo que hizo la IA:**

- Leyó de forma completa el SRS v1.0 y el Taller UML y propuso un plan, que el equipo aprobó.
- Generó el código, las migraciones, las pruebas, los diagramas de diseño y la mayor parte del informe técnico.
- Se **autorrevisó** con agentes independientes:
  - **Revisión del plan**, antes de escribir código. Cambió el orden del trabajo: primero un despliegue mínimo y verificar riesgos de la plataforma.
  - **Revisión de la API contra el SRS.** Encontró 9 defectos de concurrencia, seguridad y fechas, que se corrigieron con pruebas de regresión.
  - **Auditoría final de trazabilidad.**
- Detectó un error del propio Taller: el hallazgo 3 afirmaba que el administrador no tenía RF, pero RF-18 y RF-20 sí existen. También detectó vacíos del SRS que se documentaron en la versión 1.1.

**Lo que hizo el equipo:**

- Definió el problema, los requerimientos (SRS) y el análisis (Taller UML), que son la base de todo el trabajo.
- Tomó las decisiones con impacto: plataforma de despliegue, proveedor de datos, formato del informe y alcance.
- Conectó la infraestructura (Cloudflare Workers Builds) y revisa y valida el resultado.

**Controles de calidad aplicados al trabajo generado:**

- Cada criterio de aceptación numérico del SRS está automatizado como prueba.
- Las estadísticas se contrastaron con un cálculo independiente en Python.
- La CI ejecuta todas las pruebas en cada cambio.

**Limitaciones declaradas:**

- La IA no reemplaza las pruebas con personas: la usabilidad (RNF-08) y la disponibilidad prolongada (RNF-09) quedan a cargo del equipo.
- Toda decisión de diseño debe poder explicarla el equipo. Por eso cada una está justificada en la §4.7.
