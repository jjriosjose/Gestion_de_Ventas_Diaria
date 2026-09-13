# Prompt de continuación — Gestión de Ventas Diaria

Copia y pega este texto al abrir un nuevo chat si el actual alcanza el límite:

---

Continúa el proyecto `jjriosjose/Gestion_de_Ventas_Diaria`.

Este chat es continuación directa del proyecto Gestión de Ventas Diaria. No quiero perder contexto ni lógica ya construida.

REGLA PRINCIPAL: GitHub `main`, Supabase, CI y Cloudflare reales son la fuente de verdad. El historial del chat es contexto, pero nunca asumas que algo existe solo porque fue mencionado. Antes de modificar código, migraciones, datos o producción, verifica el estado vivo.

Primero lee, en este orden:

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`
3. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
4. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
5. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
6. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
7. `PROJECT_HANDOFF.md` solo como contexto histórico cuando sea necesario; su cabecera puede estar desactualizada.

Después verifica:

- SHA actual de `main`.
- versión de `package.json`.
- PRs abiertos y últimos merges.
- estado de GitHub Actions del SHA actual.
- estado real de Supabase `ccvzosnhxitfeochnflr`.
- producción Cloudflare `https://gestion-de-ventas-diaria.jjriosjose.workers.dev` y versión visible en la UI.

Estado productivo confirmado al cierre del 13/09/2026:

- Release: **0.6.5-beta.16.2**.
- Cloudflare Version ID: `080a251b-41e7-4ca1-a7e8-fa8833a6f54e`.
- Versión visible validada en UI: `0.6.5-beta.16.2`.
- GitHub Desktop local quedó en `main`, `0 changed files`, sin stash pendiente.

Estado funcional más reciente a preservar:

- Street Operations/Jornadas y Jornada Libre están productivos.
- CRM Territorial + Showroom/Agenda/Recepción están productivos.
- Resumen ejecutivo y PDF ejecutivo están productivos.
- Logística/POD/Historial por viaje están productivos.
- La app mantiene política de bajo consumo: sin polling continuo, sin Realtime por defecto y sin GPS continuo.
- Todos los datos actuales siguen siendo TEST hasta que el usuario declare Go-Live.

Última corrección funcional aprobada: `0.6.5-beta.16.2`, PR #63.

Problema resuelto: rutas planificadas antiguas no ejecutadas podían quedar ocultas al Vendedor porque Rutas operaba por fecha y el enlace a Jornadas conservaba el mes actual. Ahora Rutas muestra un banner con el total de rutas vencidas `NO_INICIADA`; `Ver no ejecutadas` abre Jornadas en rango anual histórico y estado `No ejecutada`.

QA real aprobado con Virmania Inoa:

- 01/09/2026: ruta no ejecutada con 15 paradas.
- 30/08/2026: ruta no ejecutada con 8 paradas.
- Rutas mostró 2 rutas anteriores no ejecutadas.
- Jornadas mostró ambas juntas, 23 paradas planificadas y 0% cobertura.
- La misma validación fue repetida en producción beta.16.2 y aprobada.

Regla crítica: una ruta pertenece exclusivamente a su fecha operativa. Una ruta vencida sin iniciar se conserva como histórico `NO_INICIADA`; no se reabre ni se ejecuta fuera de fecha.

Captación: no fue modificada por beta.16.2. La validación del día domingo se consideró un caso especial de Captación Libre; no introducir cambios adicionales allí sin una nueva necesidad real.

No hacer sin autorización explícita:

- limpiar datos TEST;
- tocar `main` directamente durante desarrollo;
- repetir migraciones por memoria;
- refactor masivo de RLS/security;
- activar polling/Reatime/GPS continuo;
- cambiar semántica histórica de rutas cerradas/no ejecutadas.

Para nuevas actualizaciones usa rama feature + PR + Build validation + QA visual antes de promover a `main`.

Si la versión productiva que encuentres difiere de este texto, prevalece el estado vivo y actualiza `docs/CHAT_CONTINUATION_CURRENT.md` antes de continuar.

---
