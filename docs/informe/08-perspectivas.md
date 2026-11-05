# 8. Perspectivas

Mejoras identificadas durante el proyecto, ordenadas por el valor que aportarían.

## 8.1 Validación pendiente (antes de la entrega final)

1. **Prueba de usabilidad con 5 usuarios nuevos (RNF-08).** Seguir el protocolo de la §5.6 y registrar tiempos y observaciones. La prueba automatizada indica que el flujo cabe con holgura en 5 minutos, pero eso no sustituye a personas reales.
2. **Monitoreo de disponibilidad durante 2 semanas (RNF-09)** con un servicio externo sobre `/api/salud`.
3. **Pruebas manuales en Firefox y Edge (RNF-12).** La suite automatizada solo se ejecutó en Chromium.

## 8.2 Producto

- **Historial de valor desde el primer día.** Hoy la curva de un portafolio empieza el día en que se crea, porque las valoraciones se guardan una vez al día. El valor de días pasados podría reconstruirse a partir de las transacciones y de los cierres históricos, con lo que se tendría una curva desde la primera compra. También permitiría un modo de _backtesting_: "¿qué habría pasado si hubiera comprado hace un año?".
- **Más tipos de orden y de eventos.** Órdenes límite y _stop-loss_, dividendos y _splits_. El SRS los excluye hoy (RN-03), pero son el siguiente paso natural para el aprendizaje.
- **Comparación con un índice de referencia** (por ejemplo, el S&P 500) en el rendimiento del portafolio, y ranking anónimo entre estudiantes de un mismo curso para fomentar el aprendizaje.
- **Contenido educativo interactivo**: cuestionarios por tema y recomendaciones según el comportamiento del usuario. Por ejemplo, sugerir el artículo de diversificación cuando más del 80 % del portafolio está en un solo tipo.
- **Aplicación instalable (PWA)** y notificaciones. Las aplicaciones nativas están fuera del alcance (SRS §1.4).

## 8.3 Técnica

- **Proveedor de datos oficial.** Yahoo Finance es una API no oficial. Para un uso sostenido conviene un proveedor con contrato y clave (Twelve Data, Alpha Vantage o Finnhub). La interfaz `ProveedorDatosMercado` permite cambiarlo sin tocar la lógica.
- **Observabilidad y alertas.** Alertas automáticas cuando el cron registre fallas consecutivas del proveedor, y métricas de latencia por ruta.
- **Pruebas de carga más largas y en CI**, y pruebas E2E en Firefox y WebKit ejecutadas en GitHub Actions.
- **Entornos separados**: una base D1 de _staging_ para las vistas previas de ramas, de modo que las versiones de prueba no compartan la base de producción.
- **Recuperación de cuenta** por correo. El SRS §3.4 excluye el envío de correos, pero es la función que más extrañaría un usuario real.

## 8.4 Proceso

- Registrar el seguimiento del backlog (issues y tablero) desde el primer sprint, para que la evidencia del proceso no dependa solo de los commits.
- Incorporar la revisión crítica por agentes de IA como práctica fija de cada pull request, junto con la revisión humana.
