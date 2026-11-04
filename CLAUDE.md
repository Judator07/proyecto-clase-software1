# Memoria del proyecto para agentes de IA

Proyecto de clase de **Ingeniería de Software I (UIS)**: Plataforma de Simulación de Inversión.
Equipo: Juan Daniel Torres Ramírez, Camilo Andrés Velandia Mendoza, Santiago Fonseca Hernández.

**Antes de trabajar, lee `docs/PROGRESO.md`.** Ahí está el estado de las fases, lo que falta y desde dónde retomar.
El plan aprobado está resumido en ese mismo archivo.

## Fuentes de verdad

- Requerimientos: `docs/entregas/SRS_Plataforma_Simulacion_Inversion_v1.0.pdf`. Los cambios posteriores están en `docs/informe/02-requerimientos.md` (SRS v1.1).
- Análisis UML: `docs/entregas/Taller_UML_Plataforma_Simulacion_Inversion_v1.0.pdf` y `docs/uml/`.
- Identificadores: N-xx, RU-xx, RF-01..RF-22, RNF-01..RNF-12, RN-01..RN-09, IU-01..IU-11. Cítalos en el código y en las pruebas cuando apliquen.

## Stack

- Un solo proyecto Vite: React (SPA) + Hono en Cloudflare Workers + D1 (SQLite).
- Worker: `simulador-inversion`.
- D1: `simulador-inversion-db` (`9e63e22a-2244-4b10-8ffe-26f71a5286f9`).
- Despliegue con Workers Builds: rama de producción `main`, comando `npm run deploy`, que aplica las migraciones y luego despliega.
- Rama de trabajo: `claude/sweet-cori-gem2mb`. Se integra a `main` mediante PR.

## Comandos

```bash
npm install            # usa legacy-peer-deps (ver .npmrc)
npm run db:migrar:local
npm run dev            # http://localhost:5173
npm run lint && npm run typecheck && npm test
npm run test:e2e
```

## Convenciones

- Código, nombres de dominio, mensajes de UI y commits **en español**. Los commits siguen el estilo convencional, p. ej. `feat(ordenes): compra atómica (RF-08)`.
- Capas (RNF-11):
  - `src/dominio`: funciones puras, sin E/S.
  - `src/server/rutas`: HTTP.
  - `src/server/servicios`: lógica de negocio.
  - `src/server/datos`: SQL y proveedor de mercado.
  - `src/client`: SPA.
- Dinero:
  - Siempre en **centavos enteros** (`*_centavos`).
  - Cantidades en **unidades × 10⁸** (`cantidad_e8`).
  - Precios como número (USD).
  - Formato de presentación: `USD 1.500,00`; fechas: `dd/mm/aaaa`.
- Las migraciones aplicadas en producción **no se editan**: se agrega una nueva (`migrations/000N_*.sql`).
- Las operaciones que mueven saldo usan `DB.batch()`, porque D1 las ejecuta como transacción. Las invariantes se protegen con CHECK en la BD.
- No exponer secretos en el repo. La cuenta de administrador se crea por SQL con un hash generado localmente.
- Hacer commit y push al terminar cada paso significativo, y actualizar `docs/PROGRESO.md`.
