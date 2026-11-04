# Guía de contribución

## Flujo de trabajo

1. Crea una rama desde `main`: `feat/<tema>`, `fix/<tema>` o `docs/<tema>`.
2. Haz commits pequeños con mensajes en español y en estilo convencional:
   - `feat(portafolios): crear portafolio con límite de 10 (RF-12, RN-05)`
   - `fix(ordenes): rechazar cantidades fraccionarias en acciones (RN-02)`
   - `docs(informe): sección de validación`
   - `test(dominio): criterios de aceptación de RF-10`
3. Antes de abrir el PR, ejecuta `npm run lint && npm run typecheck && npm test`.
4. Abre un Pull Request hacia `main` usando la plantilla. Indica qué requerimientos cubre.
5. La CI de GitHub Actions debe quedar en verde. Al integrar a `main`, Cloudflare Workers Builds despliega automáticamente.

## Reglas de código

- Respeta las capas: `dominio` (funciones puras), `server/rutas`, `server/servicios`, `server/datos` y `client`.
- Los montos se manejan en centavos enteros y las cantidades en unidades × 10⁸ (ver `CLAUDE.md`).
- Toda regla de negocio nueva va acompañada de una prueba unitaria que cite su identificador (RN-xx, RF-xx).
- Las migraciones ya aplicadas en producción no se modifican: se crea una nueva.
