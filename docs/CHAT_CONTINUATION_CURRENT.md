# Continuación actual — Gestión de Ventas Diaria / Logística

Fecha: **09/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub, Supabase, CI y Cloudflare reales son la fuente de verdad. Verificar estado real antes de escribir, mergear o desplegar.

## Orden recomendado de lectura

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
3. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
4. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
5. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
6. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
7. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

Si hay discrepancia, prevalecen GitHub/Supabase/CI/Cloudflare reales y el checkpoint más reciente.

# Producción base antes de P1

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Main base de P1: `734e1da5f586066083ad3010bccf0aeb8431a020`

Versión base: **0.6.5-beta.13.0**

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Version ID base: `5b491c77-0dd2-4f7d-a5d9-72fc45226cf5`

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# Release en promoción

Rama: **`feature/logistics-trip-history-v1`**

PR: **#59**

Release objetivo: **0.6.5-beta.14.0**

Estado al actualizar este documento:

**P1 IMPLEMENTADO / MAPAS QA OK / FILTRO FECHA QA OK / EXCEL GENERA / P1.4 BUILD VERDE / PROMOCIÓN A PRODUCCIÓN AUTORIZADA POR EL USUARIO.**

Después del merge/deploy se debe actualizar este documento con:

- SHA final de `main`;
- Cloudflare Version ID final;
- confirmación de smoke test productivo.

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

- sin polling;
- sin Realtime;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación;
- no reescribir RLS global a ciegas.

# P1 — Historial por Viaje / Recorrido Operativo

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

Operaciones e Historial comparten:

`src/lib/logisticsMapCore.ts`

Centraliza OpenStreetMap sin API key, contexto RD, zoom, fitBounds, seguridad de popups y límites territoriales oficiales.

El proveedor CARTO independiente fue eliminado. QA del usuario confirmó que todos los mapas funcionan bien.

## P1.2 — Desde / Hasta

El período se aplica directamente a `delivery_trips.trip_date` en Supabase y gobierna Documentos + Viajes.

No depende de los 250 viajes más recientes.

QA confirmado por el usuario con rango `08/09/2026 → 08/09/2026`.

## P1.3 — Excel

`Exportar Excel` respeta:

- Desde/Hasta;
- búsqueda;
- estado.

Hojas finales:

1. `Resumen`
2. `Viajes`
3. `Tramos`
4. `Paradas`
5. `Documentos`
6. `Eventos`
7. `Incidencias`

Eventos e incidencias masivos se consultan únicamente al exportar y por lotes.

## P1.4 — Distancia operativa estimada liviana

Nuevo núcleo:

`src/lib/logisticsTripDistance.ts`

Decisión de producto: **NO implementar breadcrumbs ni tracking periódico** para no aumentar consumo y complejidad sobre Supabase Free.

La distancia se calcula client-side con puntos ya existentes.

Prioridad por parada:

1. coordenada real de entrega;
2. evento GPS de la parada;
3. coordenada planificada;
4. sin ubicación si no existe ninguna.

Origen/retorno usan coordenadas ya disponibles del viaje o eventos existentes.

El KPI ahora es:

**Distancia operativa estimada**

- formato adaptativo m/km;
- suma Haversine de segmentos rectos;
- indica cantidad de segmentos;
- indica paradas con GPS;
- indica paradas estimadas por ubicación planificada;
- indica paradas sin ubicación.

El Excel incorpora la misma lógica y la hoja `Tramos` transparenta cada segmento.

### Consumo P1.4

- 0 tablas nuevas;
- 0 migraciones;
- 0 filas GPS nuevas;
- 0 escrituras adicionales;
- 0 polling;
- 0 Realtime;
- cálculo en navegador.

## Semántica obligatoria

`Trayectoria GPS estimada` y `Distancia operativa estimada` **no son recorrido vial exacto**.

Nunca afirmar calles transitadas ni kilometraje real si no existe tracking correspondiente.

# Base de datos

P1 no requiere cambios de esquema/RLS.

Usa datos existentes de:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- POD/evidencias para Documentos.

# QA / CI

Confirmado por el usuario:

- Operaciones / Torre de Control: OK;
- Historial / mapas: OK;
- mapa grande: OK;
- sin `API KEY REQUIRED`;
- filtro Desde/Hasta: OK;
- Excel inicial generado correctamente.

P1.4:

- TypeScript + Vite: **SUCCESS**.

# Seguridad y consumo

Hallazgos previos del Security Advisor siguen como backlog dedicado; P1 no modifica RLS ni seguridad.

No interpretar datos TEST y coordenadas QA artificiales como conducta real del chofer.

# Reglas de trabajo

- producción solo después de CI final verde;
- no introducir GPS continuo sin decisión explícita futura;
- no agregar consumo de Supabase para fabricar rutas más detalladas;
- no limpiar TEST;
- antes de cualquier cambio futuro revalidar `main`, Supabase, CI y producción.
