# 2. Requerimientos del sistema

La especificación completa está en el [SRS v1.0](../entregas/SRS_Plataforma_Simulacion_Inversion_v1.0.pdf) (plantilla IEEE 830 / Wiegers). Esta sección resume los requerimientos por nivel de abstracción y documenta los cambios de la **versión 1.1**, que surgieron del análisis UML y de la implementación.

## 2.1 Niveles de requerimientos

| Nivel                         | Cantidad | Identificadores |
| ----------------------------- | -------- | --------------- |
| Necesidades                   | 4        | N-01 a N-04     |
| Requerimientos de usuario     | 6        | RU-01 a RU-06   |
| Requerimientos funcionales    | 22       | RF-01 a RF-22   |
| Requerimientos no funcionales | 12       | RNF-01 a RNF-12 |
| Reglas de negocio             | 9        | RN-01 a RN-09   |
| Interfaces de usuario         | 11       | IU-01 a IU-11   |

### Requerimientos de usuario y trazabilidad

| RU    | Funcionalidad             | Necesidades      | RF            |
| ----- | ------------------------- | ---------------- | ------------- |
| RU-01 | Registro y perfil         | N-01, N-02       | RF-01 a RF-05 |
| RU-02 | Simulación de inversiones | N-01, N-02, N-03 | RF-06 a RF-11 |
| RU-03 | Portafolios               | N-02, N-04       | RF-12 a RF-14 |
| RU-04 | Datos y gráficos          | N-03, N-04       | RF-15 a RF-18 |
| RU-05 | Aprendizaje y guías       | N-01             | RF-19, RF-20  |
| RU-06 | Simulación de escenarios  | N-01, N-04       | RF-21, RF-22  |

### Requerimientos funcionales

| ID    | Nombre                                         | Tipo      | Prioridad | Crítico |
| ----- | ---------------------------------------------- | --------- | --------- | ------- |
| RF-01 | Registrar usuario                              | Necesario | Alta      | Sí      |
| RF-02 | Iniciar y cerrar sesión                        | Necesario | Alta      | Sí      |
| RF-03 | Consultar perfil de usuario                    | Necesario | Media     | No      |
| RF-04 | Actualizar perfil de usuario                   | Deseable  | Baja      | No      |
| RF-05 | Reiniciar cuenta por bancarrota                | Deseable  | Media     | No      |
| RF-06 | Consultar catálogo de instrumentos financieros | Necesario | Alta      | Sí      |
| RF-07 | Consultar precios actuales e históricos        | Necesario | Alta      | Sí      |
| RF-08 | Comprar instrumento financiero                 | Necesario | Alta      | Sí      |
| RF-09 | Vender instrumento o retirar ahorro            | Necesario | Alta      | Sí      |
| RF-10 | Simular cuenta de ahorro con interés compuesto | Necesario | Media     | No      |
| RF-11 | Consultar historial de transacciones           | Necesario | Media     | No      |
| RF-12 | Crear portafolio                               | Necesario | Alta      | Sí      |
| RF-13 | Gestionar portafolio (renombrar o eliminar)    | Necesario | Media     | No      |
| RF-14 | Consultar rendimiento y balance de portafolio  | Necesario | Alta      | Sí      |
| RF-15 | Generar gráficos de rendimiento                | Necesario | Media     | No      |
| RF-16 | Mostrar estadísticas y tendencias              | Deseable  | Baja      | No      |
| RF-17 | Actualizar precios de mercado                  | Necesario | Alta      | Sí      |
| RF-18 | Gestionar catálogo de instrumentos             | Necesario | Media     | No      |
| RF-19 | Consultar contenido educativo                  | Necesario | Media     | No      |
| RF-20 | Gestionar contenido educativo                  | Necesario | Baja      | No      |
| RF-21 | Simular escenario de mercado                   | Necesario | Media     | No      |
| RF-22 | Ajustar variables del escenario                | Necesario | Media     | No      |

### Requerimientos no funcionales

| ID     | Nombre                             | Atributo de calidad | Criterio de aceptación (resumen)                                              |
| ------ | ---------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| RNF-01 | Tiempo de respuesta                | Eficiencia          | p95 ≤ 3 s con 50 usuarios virtuales                                           |
| RNF-02 | Usuarios concurrentes              | Concurrencia        | 10 min con 50 usuarios: error < 1 % y saldos consistentes                     |
| RNF-03 | Uso exclusivamente educativo       | Seguridad (dominio) | Aviso en todas las pantallas y ningún dato de pago                            |
| RNF-04 | Tolerancia a fallas del proveedor  | Fiabilidad          | Funciona con el último precio y muestra aviso de precio desactualizado        |
| RNF-05 | Autenticación y contraseñas        | Seguridad           | Contraseña de 8 o más caracteres con letra y número, hash con sal, HTTPS      |
| RNF-06 | Control de acceso y sesión         | Seguridad           | Rol administrador, acceso solo a lo propio, expiración a los 30 min           |
| RNF-07 | Protección de datos personales     | Seguridad (legal)   | Ley 1581: consentimiento obligatorio y política accesible en el pie de página |
| RNF-08 | Facilidad de uso                   | Usabilidad          | Registro y primera compra en ≤ 5 min; compra en ≤ 3 pasos                     |
| RNF-09 | Disponibilidad                     | Disponibilidad      | ≥ 95 % durante el periodo de evaluación                                       |
| RNF-10 | Consistencia de operaciones        | Integridad          | Operaciones atómicas; saldo nunca negativo                                    |
| RNF-11 | Facilidad de mantenimiento         | Mantenibilidad      | Capas, control de versiones, pruebas de cálculos con cobertura ≥ 70 %         |
| RNF-12 | Acceso desde distintos navegadores | Accesibilidad       | Chrome, Firefox y Edge; pantallas desde 360 px; contraste WCAG 2.1 AA         |

### Reglas de negocio

| ID    | Regla                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| RN-01 | Saldo inicial ficticio de USD 10.000,00. No hay depósitos ni retiros de dinero real.                            |
| RN-02 | Acciones y ETF en unidades enteras mayores que cero; criptomonedas con hasta 8 decimales.                       |
| RN-03 | Las operaciones se ejecutan al último precio registrado, sin comisiones ni órdenes programadas.                 |
| RN-04 | Sin ventas en corto ni apalancamiento.                                                                          |
| RN-05 | Máximo 10 portafolios por usuario, con nombres únicos.                                                          |
| RN-06 | El costo de una posición es el costo promedio ponderado de sus compras.                                         |
| RN-07 | Al eliminar un portafolio, sus posiciones se liquidan al precio actual y el valor pasa al saldo.                |
| RN-08 | La simulación de escenarios es solo una proyección: no modifica datos.                                          |
| RN-09 | Bancarrota simulada si el patrimonio total es menor que USD 100,00; solo entonces se puede reiniciar la cuenta. |

## 2.2 Puntos por definir resueltos

| TBD                      | Decisión                                                                                                                                             | Justificación                                                                                                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TBD-1 Proveedor de datos | **Yahoo Finance** (API de gráficos `v8/finance/chart`), sin API key                                                                                  | Una sola llamada entrega el precio actual y hasta 5 años de cierres diarios de acciones, ETF y criptomonedas (`BTC-USD`). Es una API no oficial: el riesgo se mitiga con históricos precargados y con el último precio guardado (RNF-04). |
| TBD-2 Tecnologías        | TypeScript; React + Vite (cliente); Hono en **Cloudflare Workers** (servidor); **Cloudflare D1** (SQLite, relacional); despliegue con Workers Builds | Infraestructura gratuita, HTTPS por defecto, base de datos relacional administrada y un único lenguaje en todas las capas. Detalle en la sección de [diseño](04-diseno.md).                                                               |
| TBD-3 Acciones y ETF     | Acciones: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, JPM, KO. ETF: SPY, QQQ, VTI, EEM, GLD                                                                 | Alta liquidez, sectores variados y ETF de índice amplio, emergentes y oro, para practicar diversificación.                                                                                                                                |
| TBD-4 Criptomonedas      | BTC, ETH, SOL, XRP, ADA                                                                                                                              | Las de mayor capitalización, con perfiles de volatilidad distintos.                                                                                                                                                                       |

## 2.3 Cambios de la versión 1.1 del SRS

El Taller de análisis UML registró cuatro hallazgos sobre el SRS v1.0 (Taller §8). Al revisarlos de nuevo, de forma crítica, contra el SRS durante la implementación se obtuvieron las siguientes decisiones:

| #   | Hallazgo o vacío                                                                                                            | Decisión v1.1                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Las transacciones no tenían un estado previo a su desenlace (hallazgo 1 del Taller).                                        | Se acepta el estado **Pendiente** en el análisis. En el diseño corresponde al paso de confirmación (resumen de la orden) y **no se persiste**: la orden se registra al confirmarse como Ejecutada o Rechazada, o como Cancelada si el usuario desiste en el resumen. Así se evitan órdenes huérfanas y dobles ejecuciones. |
| 2   | No se definía si una cuenta en bancarrota puede comprar (hallazgo 2).                                                       | Se confirma el supuesto: **en bancarrota no se permiten compras ni depósitos**. Sí se permite vender, consultar y reiniciar.                                                                                                                                                                                               |
| 3   | El Taller afirma que las funciones del Administrador no tienen RF (hallazgo 3).                                             | **El hallazgo era incorrecto**: el SRS v1.0 sí incluye RF-18 (Gestionar catálogo) y RF-20 (Gestionar contenido educativo). Se corrigieron las etiquetas del diagrama de casos de uso.                                                                                                                                      |
| 4   | No se definía cómo se acreditan los intereses de la cuenta de ahorro (hallazgo 4).                                          | RF-10 sí da la fórmula. Se precisa que el valor a la fecha es VF = P·(1 + r/n)^(n·t), con _t_ igual al tiempo transcurrido desde el depósito y con tope en el plazo pactado. Se agrega la clase **DepósitoAhorro** al modelo.                                                                                              |
| 5   | En el diagrama de clases, `Transacción.tipo` solo admitía Compra y Venta.                                                   | Se amplía a **Compra, Venta, Depósito y Retiro**, como define el glosario del SRS.                                                                                                                                                                                                                                         |
| 6   | El diagrama de casos de uso no incluía la simulación de la cuenta de ahorro (RF-10) ni la actualización de precios (RF-17). | Se agregan ambos casos de uso.                                                                                                                                                                                                                                                                                             |
| 7   | RF-16 no definía con precisión la volatilidad ni la tendencia.                                                              | **Volatilidad**: desviación estándar muestral (n − 1) de los rendimientos diarios del rango, en %. **Tendencia**: alcista si el último precio está por encima de la media móvil de 20 días; bajista en caso contrario.                                                                                                     |
| 8   | RF-21 no decía cómo se aplica el horizonte.                                                                                 | Las variaciones de precio se aplican una sola vez. Los depósitos de ahorro se proyectan con la nueva tasa durante todo el horizonte.                                                                                                                                                                                       |
| 9   | RF-17 pide "guardar un registro de precio por consulta".                                                                    | Se guarda el **precio actual** del instrumento y el **cierre diario** (el último precio del día). Los registros cada 15 minutos no los consume ningún requerimiento y multiplicarían el almacenamiento, por lo que no se conservan.                                                                                        |
| 10  | El intervalo de RF-17 es "ajustable a los límites del proveedor".                                                           | Variable de configuración `INTERVALO_ACTUALIZACION_MIN` (15 por defecto).                                                                                                                                                                                                                                                  |
| 11  | No se definía cuándo se evalúa la bancarrota (RN-09).                                                                       | Se evalúa al consultar el perfil y el panel, y antes de cada compra o depósito.                                                                                                                                                                                                                                            |

## 2.4 Interfaces de usuario

Las 11 pantallas del SRS (IU-01 a IU-11) se implementaron. Se agregaron tres más:

- una página de inicio pública;
- la página de **política de tratamiento de datos** exigida por RNF-07;
- la página de detalle de un artículo educativo.

La correspondencia entre cada pantalla, su ruta y los RF está en la sección de [diseño](04-diseno.md#tabla-de-pantallas).
