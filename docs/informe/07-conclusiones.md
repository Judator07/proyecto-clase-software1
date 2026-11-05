# 7. Conclusiones

## 7.1 Síntesis de resultados

| Aspecto                       | Resultado                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requerimientos funcionales    | **22 de 22 implementados** (RF-01 a RF-22), cada uno con al menos una prueba automatizada de sus criterios de aceptación.                                                                                                            |
| Reglas de negocio             | **9 de 9** implementadas; las críticas (RN-04, RN-05) se imponen también en la base de datos.                                                                                                                                        |
| Interfaces de usuario         | **11 de 11** pantallas del SRS, más el inicio, la política de datos y el detalle de artículo.                                                                                                                                        |
| Requerimientos no funcionales | **9 de 12 verificados** (RNF-01, 02, 03, 04, 05, 06, 07, 10 y 11). **2 parciales**: RNF-08 (automatizado; falta la prueba con personas) y RNF-12 (solo Chromium). **1 pendiente**: RNF-09 (2 semanas de monitoreo). Ver §5.3 a §5.6. |
| Pruebas                       | 36 unitarias, 43 de integración y 10 E2E, todas en verde. Cobertura del dominio: 100 % de líneas.                                                                                                                                    |
| Despliegue                    | En producción, con integración y entrega continuas: <https://simulador-inversion.juandanieltorresr.workers.dev>.                                                                                                                     |

## 7.2 Análisis

1. **Un buen SRS hizo posible construir rápido y verificar con precisión.** El equipo escribió criterios de aceptación con valores concretos: USD 1.500,00, USD 1.126,83, USD 700,00, el rango de USD 900 a 1.100. Así cada requerimiento se convirtió directamente en una prueba automatizada. Es la principal lección del curso puesta en práctica: un requerimiento verificable ahorra discusiones y defectos.
2. **El análisis UML guió el diseño, pero necesitó refinamiento.** El estado _Pendiente_ que agregó el Taller resultó correcto como concepto, pero persistirlo creaba riesgos (órdenes huérfanas, dobles confirmaciones). En el diseño se materializó como el paso de confirmación. El análisis responde _qué_ ocurre; el diseño, _cómo_ se garantiza.
3. **La revisión crítica encontró errores en todas las etapas, también en la nuestra:**
   - un hallazgo del Taller era incorrecto (RF-18 y RF-20 sí existían);
   - el SRS tenía vacíos que se documentaron en su versión 1.1;
   - el revisor independiente encontró 9 defectos de concurrencia y seguridad en la API;
   - las pruebas automatizadas revelaron fallas de accesibilidad y un comportamiento no evidente de SQLite.

   Ninguno de estos defectos se habría visto sin pruebas ni revisiones.

4. **La integridad de los datos debe residir en la base de datos.** Las restricciones CHECK y la ejecución atómica por lotes garantizan que el saldo nunca sea negativo, aun con solicitudes simultáneas (RNF-10). Las validaciones de la aplicación mejoran la experiencia, pero la base de datos es la que da la garantía.
5. **Las cuotas de la plataforma también son requerimientos no funcionales.** La primera prueba de carga confirmó la integridad (0 saldos inconsistentes), pero agotó la cuota diaria de escrituras del plan gratuito de D1, algo que el SRS no contemplaba. Después de las correcciones, una segunda corrida con perfil realista dio 0 % de errores y un p95 de 214 ms. Una prueba de carga debe presupuestar los límites del proveedor, y el diseño debe degradarse con elegancia cuando se alcanzan (§5.4).
6. **La IA aceleró la construcción, pero no reemplazó el criterio del equipo.** El asistente produjo código, pruebas y documentación en una fracción del tiempo habitual. Aun así, el resultado depende de un SRS bien hecho y de las decisiones del equipo (plataforma, proveedor, alcance). Las verificaciones con personas reales siguen siendo responsabilidad humana.

## 7.3 Riesgos y limitaciones

- **Proveedor de datos.** Yahoo Finance es una API no oficial y puede cambiar o bloquear el acceso. La mitigación (último precio guardado e históricos precargados) mantiene la aplicación operativa, pero sin precios nuevos.
- **Plan gratuito de Cloudflare.** 100.000 solicitudes diarias y 10 ms de CPU por solicitud son suficientes para un curso, pero limitan una adopción masiva.
- **Historial de valor de portafolios.** La gráfica de valor de un portafolio comienza el día en que se crea, porque las valoraciones se registran diariamente desde entonces.
