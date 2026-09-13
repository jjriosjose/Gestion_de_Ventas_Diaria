# Continuación actual — Gestión de Ventas Diaria / Logística

Fecha: **11/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub, Supabase, CI y Cloudflare reales son la fuente de verdad. Verificar estado real antes de escribir, mergear o desplegar.

## Orden recomendado de lectura

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
3. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
4. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
5. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
6. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
7. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
8. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

Si hay discrepancia, prevalecen GitHub/Supabase/CI/Cloudflare reales y el checkpoint más reciente.

# Producción actual

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Main actual: `968671f26b4cbff3896ffdc11fb325fa861b96d9` (el último commit es documentación; código desplegado indicado abajo).

Release productivo: **0.6.5-beta.14.0**

SHA del código mergeado y desplegado: `055292797e4625896ed71e4d2a1e44dd62d33a47`

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Cloudflare Version ID: `ac7ee2e2-0dbf-473d-9877-f46b3455e300`

PR de promoción P1: **#59 — MERGED**

Estado productivo:

**P1 HISTORIAL POR VIAJE DESPLEGADO / SHARED MAP CORE ACTIVO / FILTRO DESDE-HASTA ACTIVO / EXCEL ESTRUCTURADO ACTIVO / DISTANCIA OPERATIVA ESTIMADA ACTIVA / SMOKE TEST PRODUCTIVO OK.**

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# Trabajo actual — Jornadas Libres + Visitas Adicionales

Rama: **`feature/open-field-journeys-v1`**

PR: **#60 — DRAFT / NO MERGED**

Documento técnico: `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Base exacta de la rama: `968671f26b4cbff3896ffdc11fb325fa861b96d9`.

Objetivo:

- permitir al vendedor iniciar una **Jornada Libre** cuando no exista ruta planificada disponible para hoy;
- permitir **Visitas Adicionales** dentro de una ruta planificada activa;
- mantener visitas adicionales fuera del numerador/denominador de cobertura planificada;
- mantener una sola jornada activa y una sola visita abierta por vendedor;
- conservar cierre, GPS, incidencias, Tracking, Jornadas y reportes.

Migración Supabase TEST ya aplicada y **no debe repetirse por memoria**:

`20260911225302_open_field_journeys_v1`

Cambios principales de DB:

- `route_plans.route_mode = PLANIFICADA | LIBRE`;
- RPC `start_open_journey(...)`;
- RPC `start_additional_visit(...)`;
- índice único parcial para una sola `route_session` ACTIVA por empleado;
- vista `executive_route_journeys_v4` con métricas Plan vs Adicionales vs Total.

Todos los 17 `route_plans` históricos existentes conservaron `route_mode = PLANIFICADA` por default; no se modificaron resultados históricos.

Estado actual de la implementación:

- frontend `Routes`: Jornada Libre + Visita adicional + métricas separadas;
- frontend `Journeys`: modo de jornada, adicionales y total;
- nuevo selector de cliente `AdditionalVisitModal`;
- migración versionada en GitHub;
- build funcional pre-documentación: **SUCCESS**;
- QA funcional con usuario Vendedor: **PENDIENTE**;
- producción: **NO MODIFICADA**.

Reglas obligatorias:

- no mergear PR #60 hasta completar QA;
- no desplegar esta funcionalidad todavía;
- un cliente que ya es parada planificada no puede registrarse como visita adicional;
- Jornada Libre no fabrica paradas planificadas;
- cobertura de una Jornada Libre se muestra `N/A`;
- visitas adicionales cuentan para actividad real/tiempo/frecuencia, pero no para cobertura del plan.

# Baseline anterior

Release anterior: **0.6.5-beta.13.0**

Main anterior: `734e1da5f586066083ad3010bccf0aeb8431a020`

Cloudflare Version ID anterior: `5b491c77-0dd2-4f7d-a5d9-72fc45226cf5`

Ese baseline fue reemplazado productivamente por `0.6.5-beta.14.0`.

# P0 Logística ya productivo

Validados previamente:

- reintentos trazables y saldo pendiente;
- bloqueo documento entregado;
- bloqueo saldo incorrecto;
- POD/firma en dos etapas;
- firma endurecida contra toque/microtrazo;
- Performance Fase 1;
- GPS móvil por HTTPS;
- cierre de viaje sin eventos duplicados.

Migraciones P0 ya aplicadas; **no repetir**:

- `20260907094026_delivery_document_retry_traceability`
- `20260907094801_delivery_document_retry_guard_refinement`

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`.

Política vigente:

- sin polling por defecto;
- sin Realtime por defecto;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación;
- no reescribir RLS global a ciegas.

# P1 — Historial por Viaje / Recorrido Operativo — PRODUCTIVO

Documento técnico principal:

`docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`

## Vista

`Historial / POD` mantiene:

- `Documentos`;
- `Viajes`.

Viajes incluye:

- explorador y búsqueda;
- filtros por estado;
- filtro global `Desde / Hasta`;
- KPIs;
- mapa profesional;
- secuencia planificada;
- trayectoria GPS estimada;
- desviaciones;
- incidencias;
- timeline;
- permanencia y resultados;
- Excel estructurado.

## P1.1 — Shared Logistics Map Core

Operaciones e Historial comparten `src/lib/logisticsMapCore.ts`.

Centraliza OpenStreetMap sin API key, contexto RD, zoom, fitBounds, seguridad de popups y límites territoriales oficiales.

QA confirmó todos los mapas funcionando y sin `API KEY REQUIRED`.

## P1.2 — Desde / Hasta

El período se aplica directamente a `delivery_trips.trip_date` en Supabase y gobierna Documentos + Viajes.

QA confirmado con rango `08/09/2026 → 08/09/2026`.

## P1.3 — Excel estructurado

Hojas finales:

1. `Resumen`
2. `Viajes`
3. `Tramos`
4. `Paradas`
5. `Documentos`
6. `Eventos`
7. `Incidencias`

## P1.4 — Distancia operativa estimada liviana

Núcleo: `src/lib/logisticsTripDistance.ts`.

Decisión de producto: **NO implementar breadcrumbs ni tracking periódico** para no aumentar consumo y complejidad sobre Supabase Free.

La distancia se calcula client-side con puntos ya existentes y es una estimación recta, no recorrido vial exacto.

# QA / CI / Producción P1

Confirmado:

- Operaciones / Torre de Control: OK;
- Historial / mapas: OK;
- mapa grande: OK;
- sin `API KEY REQUIRED`: OK;
- filtro Desde/Hasta: OK;
- Excel estructurado: OK;
- TypeScript + Vite: SUCCESS;
- CI pre/post merge: SUCCESS;
- deploy Cloudflare: SUCCESS;
- smoke test productivo `0.6.5-beta.14.0`: OK.

# Seguridad y consumo

Hallazgos previos del Security Advisor siguen como backlog dedicado; no hacer refactor masivo de RLS durante una entrega funcional.

No interpretar datos TEST y coordenadas QA artificiales como conducta real del vendedor/chofer.

# Reglas de trabajo

- producción actual: `0.6.5-beta.14.0`;
- feature actual: `feature/open-field-journeys-v1` / PR #60 Draft;
- no introducir GPS continuo sin decisión explícita futura;
- no limpiar TEST;
- antes de cualquier cambio revalidar `main`, Supabase, CI y producción;
- si se abre otro chat, leer este documento primero y verificar que el estado vivo siga coincidiendo con este checkpoint.
