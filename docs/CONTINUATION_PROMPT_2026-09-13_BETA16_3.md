# Prompt de continuación — Gestión de Ventas Diaria — beta.16.3

Continúa el proyecto `jjriosjose/Gestion_de_Ventas_Diaria`.

Este chat es continuación directa de **Gestión de Ventas Diaria**. GitHub `main`, Supabase, CI y Cloudflare reales son la fuente de verdad; no asumas que algo existe únicamente porque fue mencionado en conversaciones anteriores.

## Leer primero

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`
3. `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`
4. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
5. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
6. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`

Después verifica el estado real de:

- GitHub `main` y `package.json`;
- PRs y GitHub Actions recientes;
- Supabase `ccvzosnhxitfeochnflr`;
- producción Cloudflare.

## Release productivo vigente

**0.6.5-beta.16.3**

Cloudflare:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Cloudflare Version ID validado:

`6fb1d46c-3a45-4a46-9930-6725b4449591`

PR #64 fue fusionado a `main`.

Merge commit beta.16.3:

`6a4790f3bfebed352abac0052b09399e63cd5bf0`

## Beta.16.3 — resolución administrativa de rutas no ejecutadas

Se agregó a **Rutas** un control administrativo no destructivo para planificaciones que vencieron sin iniciarse.

Regla crítica:

- `NO_INICIADA` describe lo que ocurrió operacionalmente;
- `REVISADA`, `ANULADA` o `REPROGRAMADA` describen la decisión administrativa posterior;
- nunca borrar físicamente la ruta o sus `route_stops` mediante este flujo;
- nunca crear una `route_session` artificial ni marcar visitas inexistentes;
- reprogramar crea una nueva planificación y conserva la original.

Migración ya aplicada; **NO REPETIR POR MEMORIA**:

`20260913210416_route_plan_admin_resolution`

QA productivo confirmado:

- versión visible: `0.6.5-beta.16.3`;
- panel administrativo de Rutas visible para usuario autorizado;
- producción mostró 11 rutas no ejecutadas pendientes de resolución antes de efectuar acciones;
- modal de resolución indica explícitamente que el historial no se eliminará;
- anulación exige motivo/observación y conserva histórico.

## Beta.16.2 preservada

Los Vendedores pueden descubrir rutas históricas no ejecutadas sin filtrar día por día. `Ver no ejecutadas` abre Jornadas en rango personalizado anual con `Estado = No ejecutada`.

QA previo con Virmania:

- 01/09/2026 — 15 paradas;
- 30/08/2026 — 8 paradas;
- ambas visibles juntas.

## Captación

Beta.16.3 no modifica Captación. La prueba de Captación libre del 13/09 se realizó en domingo; no modificar ese comportamiento sin reproducir una necesidad en día operativo normal.

## Reglas permanentes

- Todos los datos actuales siguen siendo TEST hasta que el usuario declare Go-Live.
- No limpiar datos TEST sin backup y aprobación explícita.
- No repetir migraciones por memoria.
- No hacer refactor masivo de RLS/Auth durante una entrega funcional.
- Sin polling por defecto.
- Sin Realtime por defecto.
- Sin GPS continuo.
- Para desarrollo nuevo: feature branch → PR → CI → QA → autorización → merge → deploy.
- `main` es la fuente productiva de código.
- GitHub Desktop para sincronización local; CMD/PowerShell para npm/build/deploy.

Si el estado vivo contradice este documento, prevalece GitHub/Supabase/CI/Cloudflare reales y se debe actualizar `docs/CHAT_CONTINUATION_CURRENT.md`.
