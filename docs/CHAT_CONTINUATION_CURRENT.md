# Continuación actual — Gestión de Ventas Diaria / Logística

Fecha: **08/09/2026 (RD)**

> **LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub, Supabase, CI y Cloudflare reales son la fuente de verdad. Verificar estado real antes de escribir, mergear o desplegar.

## Orden recomendado de lectura

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
3. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
4. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
5. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
6. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
7. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

Si hay discrepancia, prevalecen GitHub/Supabase/CI/Cloudflare reales y el checkpoint más reciente.

# Producción actual

Repositorio:

`jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva:

`main`

Main validado después de promover Logística V1:

`734e1da5f586066083ad3010bccf0aeb8431a020`

Versión productiva:

**0.6.5-beta.13.0**

Cloudflare:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Version ID del despliegue productivo:

`5b491c77-0dd2-4f7d-a5d9-72fc45226cf5`

Logística / Delivery V1 está mergeada y desplegada en producción.

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# Estado P0

Los P0 de Logística fueron validados antes de la promoción:

- reintentos trazables y saldo pendiente: APROBADO;
- bloqueo de documento ya entregado: APROBADO;
- bloqueo por saldo incorrecto: APROBADO;
- POD/firma en dos etapas: APROBADO;
- firma endurecida contra toque/microtrazo: IMPLEMENTADO;
- Performance Fase 1: APROBADO funcionalmente;
- GPS móvil por HTTPS: APROBADO;
- cierre de viaje y ausencia de eventos duplicados: APROBADO.

Migraciones P0 ya aplicadas; no repetir:

- `20260907094026_delivery_document_retry_traceability`
- `20260907094801_delivery_document_retry_guard_refinement`

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`;
- mismo proyecto administrativamente transferido el 06/09/2026, no clonado.

Política vigente:

- sin polling;
- sin Realtime;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación;
- no reescribir RLS global a ciegas.

Hallazgos conocidos del Security Advisor siguen como backlog dedicado y no fueron introducidos por P1.

# P1 actual — Historial por Viaje / Recorrido Operativo

Rama de trabajo:

**`feature/logistics-trip-history-v1`**

Base exacta de la rama:

`main` en `734e1da5f586066083ad3010bccf0aeb8431a020`.

Estado:

**IMPLEMENTADO EN RAMA / BUILD VERDE / PENDIENTE QA VISUAL LOCAL / NO MERGE / NO DEPLOY**

Documento técnico:

`docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`

## Lo implementado

`Historial / POD` ahora puede operar en dos modos:

- `Documentos` — mantiene la funcionalidad previa;
- `Viajes` — nueva vista integral del recorrido y comportamiento.

Nueva vista de Viajes:

- explorador/buscador de viajes;
- filtros Todos / Finalizados / En curso / Excepciones;
- KPIs de duración, bultos, GPS, permanencia y resultados;
- mapa Leaflet profesional;
- capas de secuencia planificada, GPS estimado, desviaciones e incidencias;
- mapas base Claro / Calles / Satélite;
- mapa grande y encajar;
- selección sincronizada de parada desde mapa/lista;
- lectura gerencial de anomalías;
- indicadores de secuencia, gaps GPS y desviación plan/real;
- lista de paradas con tiempos y bultos;
- timeline operativo completo;
- precisión GPS visible por evento.

## Regla semántica obligatoria

La línea GPS es una **trayectoria estimada entre eventos GPS registrados**.

Nunca presentarla como tracking continuo ni ruta vial exacta.

## Rendimiento

Los eventos e incidencias NO se cargan masivamente para todos los viajes.

Se consultan solo cuando el usuario selecciona un viaje y se cachean en memoria durante la sesión de la vista.

No se agregó polling ni Realtime.

## Base de datos

P1 no requiere migración ni cambios de esquema.

Usa:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`.

## Build

Build validation sobre el código funcional inicial:

- TypeScript: SUCCESS;
- Vite: SUCCESS.

Tras cambios documentales, verificar nuevamente el head final antes de PR/merge.

# QA visual pendiente para P1

1. Cambiar localmente a `feature/logistics-trip-history-v1`.
2. Abrir `Historial / POD`.
3. Confirmar que `Documentos` conserva comportamiento previo.
4. Abrir `Viajes`.
5. Validar lista de viajes TEST.
6. Seleccionar viaje de 5 paradas.
7. Validar mapa y popups.
8. Alternar capas Planificada / GPS / Desviación / Incidencias.
9. Alternar Claro / Calles / Satélite.
10. Probar Mapa grande / Encajar.
11. Seleccionar paradas en lista y en mapa.
12. Comparar KPIs/timeline con Supabase.
13. Revisar responsive.

# Seguridad y consumo

P1 no modifica seguridad ni RLS.

P1 evita consultas masivas de `delivery_events`/`delivery_incidents`.

No interpretar datos QA viejos como comportamiento real de un chofer; existen viajes TEST con coordenadas y tiempos artificiales.

# Reglas de trabajo desde aquí

- NO modificar `main` para P1 hasta QA y aprobación explícita.
- NO desplegar P1 a Cloudflare todavía.
- NO crear migraciones innecesarias.
- NO activar GPS continuo para fabricar una ruta exacta.
- NO limpiar datos TEST.
- Abrir PR Draft después de dejar CI final verde.
- Antes de merge futuro: revalidar main, Supabase, CI y producción.
