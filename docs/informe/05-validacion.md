# 5. Validación del sistema

## 5.1 Estrategia de pruebas

| Nivel             | Herramienta                                                                      | Alcance                                                      | Ubicación           | Cantidad            | Resultado                         |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- | ------------------- | --------------------------------- |
| Unitarias         | Vitest + cobertura v8                                                            | Capa de dominio: reglas de negocio y cálculos financieros    | `tests/unit`        | 36                  | ✅ 36/36                          |
| Integración       | Vitest + `@cloudflare/vitest-plugin` (runtime de Workers + D1 real en Miniflare) | API completa: rutas, servicios, repositorios y base de datos | `tests/integracion` | 42                  | ✅ 42/42                          |
| Extremo a extremo | Playwright (Chromium) + axe-core                                                 | Flujos de usuario en el navegador, en escritorio y a 360 px  | `tests/e2e`         | 5 × 2 vistas        | ✅ 10/10 en local y en producción |
| Carga             | Script propio en Node.js (`tests/carga/carga.mjs`)                               | 50 usuarios virtuales concurrentes contra producción         | `tests/carga`       | 1 corrida de 10 min | Ver §5.4                          |
| Revisión estática | ESLint, TypeScript estricto y un agente revisor independiente                    | Calidad, tipos, seguridad y conformidad con el SRS           | —                   | —                   | ✅ 9 hallazgos corregidos         |

La **integración continua** (GitHub Actions) ejecuta lint, tipos, pruebas unitarias y de integración, cobertura y build en cada push y en cada pull request. Antes de integrar a `main` se verifica que la CI esté en verde.

**Criterios de aceptación como pruebas.** Cada criterio de aceptación numérico del SRS es una aserción automatizada con el mismo valor. Los valores esperados de las estadísticas (RF-16) se calcularon **de forma independiente** con el módulo `statistics` de Python sobre 25 cierres reales de AAPL, para cumplir la tolerancia de 0,01 que exige el SRS.

## 5.2 Cobertura

Cobertura de la capa de dominio (RNF-11 exige al menos 70 %):

| Métrica    | Resultado |
| ---------- | --------- |
| Líneas     | 100 %     |
| Sentencias | 100 %     |
| Funciones  | 100 %     |
| Ramas      | 98,5 %    |

## 5.3 Matriz de trazabilidad: requerimiento → prueba → resultado

| Requerimiento   | Caso de prueba (criterio de aceptación verificado)                                                                                                                                                                     | Tipo                        | Resultado                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------- |
| RF-01           | CA1: con datos válidos se crea la cuenta con USD 10.000,00. CA2: no hay dos cuentas con el mismo correo (sin distinguir mayúsculas). Contraseña inválida, confirmación distinta y correo inválido son rechazados.      | Integración                 | ✅                                       |
| RF-02           | CA1 y CA2: inicio de sesión válido; tras cerrar sesión no hay acceso privado. Mensaje genérico para contraseña errada o cuenta inexistente. Bloqueo de 15 min tras 5 intentos, también con intentos simultáneos.       | Integración                 | ✅                                       |
| RF-03           | CA1: saldo = inicial − compras − depósitos + ventas + retiros; patrimonio = saldo + valor invertido.                                                                                                                   | Integración                 | ✅                                       |
| RF-04           | CA1: los cambios se reflejan. CA2: se ingresa con la nueva contraseña y no con la anterior. La contraseña actual es obligatoria.                                                                                       | Integración                 | ✅                                       |
| RF-05 / RN-09   | Con USD 80,00 se ofrece el reinicio; después hay USD 10.000,00, sin posiciones, contador +1 e historial conservado. Con patrimonio ≥ USD 100 no se permite reiniciar. Umbral exacto.                                   | Unitaria e integración      | ✅                                       |
| RF-06           | CA1: búsqueda de "AAPL" y de "BTC". CA2: el filtro ETF solo devuelve ETF. Búsqueda sin resultados.                                                                                                                     | Integración                 | ✅                                       |
| RF-07           | Serie del rango, aviso de rango incompleto y rango inválido.                                                                                                                                                           | Integración y E2E           | ✅                                       |
| RF-08           | CA1: 10 unidades a USD 150,00 cuestan USD 1.500,00. CA2: 0,05 BTC a USD 60.000,00 cuestan USD 3.000,00. CA3: las órdenes rechazadas o canceladas no modifican nada. Compra en 3 pasos y cancelación desde la interfaz. | Unitaria, integración y E2E | ✅                                       |
| RF-09           | CA1: costo USD 150 y venta de 10 a USD 160 → abono de USD 1.600 y ganancia de USD 100. CA2: no se vende más de lo poseído, ni siquiera en paralelo.                                                                    | Unitaria e integración      | ✅                                       |
| RF-10           | CA1: P = 1.000, r = 12 %, capitalización mensual, 1 año → USD 1.126,83. CA2: el depósito descuenta el saldo. Retiro con intereses, depósito mayor que el saldo y rangos de tasa y plazo.                               | Unitaria e integración      | ✅                                       |
| RF-11           | Orden del más reciente al más antiguo y filtros por tipo, instrumento y fechas (hora de Colombia).                                                                                                                     | Integración                 | ✅                                       |
| RF-12 / RN-05   | Portafolio vacío en USD 0,00; nombre único sin distinguir mayúsculas; límite de 10.                                                                                                                                    | Integración                 | ✅                                       |
| RF-13 / RN-07   | Renombrar; eliminar liquida al precio actual, abona el saldo, conserva el historial y libera el nombre.                                                                                                                | Integración                 | ✅                                       |
| RF-14           | CA1: el valor total es la suma de las posiciones. CA2: el rendimiento coincide con el cálculo manual. Portafolio vacío.                                                                                                | Unitaria e integración      | ✅                                       |
| RF-15           | Serie de valoración con el valor actual y composición por tipo que suma 100 %.                                                                                                                                         | Unitaria e integración      | ✅                                       |
| RF-16           | CA1: coincide con el cálculo independiente (tolerancia 0,01). "No disponible" con menos de 20 datos. Tendencia alcista y bajista.                                                                                      | Unitaria                    | ✅                                       |
| RF-17 / RNF-04  | Actualiza precios y guarda la valoración diaria. Ante una falla del proveedor conserva el último precio y lo marca como desactualizado. Los instrumentos desactivados siguen recibiendo precio.                        | Integración                 | ✅                                       |
| RF-18           | Símbolo desconocido (422) y repetido (409). Al desactivar, no se ofrece para compra pero sí se puede vender. Solo el administrador.                                                                                    | Integración                 | ✅                                       |
| RF-19           | Lectura sin sesión; artículos en los 6 temas; búsqueda por término.                                                                                                                                                    | Integración                 | ✅                                       |
| RF-20           | CA1: un borrador no es visible y al publicarlo sí. Validación de campos obligatorios. CA2: solo el administrador.                                                                                                      | Integración                 | ✅                                       |
| RF-21 / RN-08   | CA1: Crisis financiera sobre USD 1.000 solo en acciones → USD 700,00. Depósitos con la nueva tasa sin bajar de 0 %. Escenario alcista y portafolio mixto.                                                              | Unitaria                    | ✅                                       |
| RF-22           | CA1: proyectado USD 1.000 con volatilidad del 10 % → rango USD 900–1.100. Validación de rangos.                                                                                                                        | Unitaria                    | ✅                                       |
| RN-02           | Unidades enteras en acciones y ETF; hasta 8 decimales en cripto; cantidades inválidas rechazadas sin registrar la orden.                                                                                               | Unitaria e integración      | ✅                                       |
| RN-03           | Ejecución al último precio sin comisiones; si el precio cambia entre el resumen y la confirmación se pide revisar.                                                                                                     | Integración                 | ✅                                       |
| RN-06           | Costo promedio ponderado de dos compras (10 a 150 y 5 a 180 → 160).                                                                                                                                                    | Unitaria e integración      | ✅                                       |
| RNF-01 / RNF-02 | Prueba de carga con 50 usuarios concurrentes.                                                                                                                                                                          | Carga                       | Ver §5.4                                 |
| RNF-03          | El aviso educativo y el enlace a la política de datos son visibles en 13 rutas; ningún formulario pide datos de pago.                                                                                                                                   | E2E                         | ✅                                       |
| RNF-05          | Hash con sal (no hay contraseñas legibles en la base de datos) y política de contraseña. Solo HTTPS (`workers.dev` + HSTS).                                                                                            | Integración e inspección    | ✅                                       |
| RNF-06          | Pantallas privadas redirigen al inicio de sesión. 401 sin sesión. 403 sin rol. 404 ante un portafolio ajeno. Expiración a los 30 min. Al cambiar la contraseña se cierran las demás sesiones.                          | Integración y E2E           | ✅                                       |
| RNF-07          | El registro no es posible sin aceptar la política; la política está en el pie de página y se guarda la fecha del consentimiento.                                                                                       | Integración y E2E           | ✅                                       |
| RNF-08          | Un usuario nuevo se registra y hace su primera compra en 3 pasos: 2,6 s automatizado (límite: 5 min).                                                                                                                  | E2E                         | ✅ automatizada; ⏳ con personas (§5.6)  |
| RNF-09          | Disponibilidad ≥ 95 %.                                                                                                                                                                                                 | Monitoreo                   | ⏳ pendiente (§5.6)                      |
| RNF-10          | Dos compras simultáneas que superan el saldo: solo una se ejecuta. Ventas simultáneas. El saldo nunca es negativo (CHECK).                                                                                             | Integración y carga         | ✅                                       |
| RNF-11          | Capas en el repositorio y cobertura del dominio de 100 % en líneas.                                                                                                                                                    | Inspección y cobertura      | ✅                                       |
| RNF-12          | Sin desborde horizontal a 360 px; 0 violaciones WCAG 2.1 A/AA (axe) en 13 rutas (todas las IU excepto IU-11, que requiere cuenta de administrador), en escritorio y en móvil.                                                                                                         | E2E                         | ✅ en Chromium; ⏳ Firefox y Edge (§5.6) |

## 5.4 Prueba de carga (RNF-01, RNF-02)

_Resultados en §5.4.1._

## 5.5 Defectos encontrados por las pruebas y las revisiones

| Origen                        | Defecto                                                                                                                        | Corrección                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Pruebas de integración        | Las ventas siempre se rechazaban: SQLite evalúa el `CHECK` sobre la fila que intenta insertar antes de resolver el `UPSERT`.   | Nuevo patrón: `INSERT OR IGNORE` de la posición seguido de un `UPDATE` que resta. |
| Revisión independiente (IA)   | Nueve hallazgos de concurrencia, seguridad y fechas (detalle en el commit `7fd5193`).                                          | Todos corregidos, con 5 pruebas de regresión.                                     |
| E2E (axe)                     | Las tablas con desplazamiento no eran accesibles por teclado (`scrollable-region-focusable`).                                  | Las regiones ahora son enfocables y tienen etiqueta.                              |
| E2E (360 px)                  | El campo de búsqueda desbordaba horizontalmente.                                                                               | `min-width: 0` en el campo flexible.                                              |
| Recorrido manual (Playwright) | La pantalla quedaba en blanco: `window.scrollTo` devuelve una promesa en Chromium y React la trataba como función de limpieza. | El efecto ya no devuelve ese valor.                                               |

## 5.6 Pruebas pendientes a cargo del equipo

Estas pruebas requieren personas o tiempo real, así que **no las ejecutó el asistente de IA**. Quedan con su protocolo:

1. **Usabilidad (RNF-08).** Prueba con 5 personas que no conozcan la plataforma.
   - Consigna: "regístrate y compra tu primera acción", sin ayuda.
   - Registrar por persona el tiempo (cronómetro), el número de errores y los comentarios.
   - Criterio: al menos 4 de 5 terminan en 5 minutos o menos.
   - Plantilla de registro:

     | Persona | Tiempo | ¿Terminó sin ayuda? | Errores y observaciones |
     | ------- | ------ | ------------------- | ----------------------- |
     | 1       |        |                     |                         |

2. **Disponibilidad (RNF-09).**
   - Crear en UptimeRobot (gratuito) un monitor HTTP cada 5 minutos a `https://simulador-inversion.juandanieltorresr.workers.dev/api/salud`.
   - Tras 2 semanas, adjuntar la captura del porcentaje de disponibilidad. Criterio: 95 % o más.
3. **Navegadores (RNF-12).** Recorrer las funciones principales en las dos últimas versiones de Firefox y de Edge: registro, compra, portafolio, ahorro, escenarios y aprendizaje.
