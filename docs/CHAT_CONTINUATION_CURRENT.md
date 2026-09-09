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

# Producción actual

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Release productivo: **0.6.5-beta.14.0**

SHA del código mergeado y desplegado: `055292797e4625896ed71e4d2a1e44dd62d33a47`

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Cloudflare Version ID: `ac7ee2e2-0dbf-473d-9877-f46b3455e300`

PR de promoción: **#59 — MERGED**

Estado:

**P1 HISTORIAL POR VIAJE DESPLEGADO EN PRODUCCIÓN / SHARED MAP CORE ACTIVO / FILTRO DESDE-HASTA ACTIVO / EXCEL ESTRUCTURADO ACTIVO / DISTANCIA OPERATIVA ESTIMADA ACTIVA / SMOKE TEST PRODUCTIVO OK.**

La captura productiva posterior al deploy confirmó que `Historial / POD` carga correctamente y la UI muestra **Versión 0.6.5-beta.14.0**.

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

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

- sin polling;
- sin Realtime;
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

Operaciones e Historial comparten:

`src/lib/logisticsMapCore.ts`

Centraliza OpenStreetMap sin API key, contexto RD, zoom, fitBounds, seguridad de popups y límites territoriales oficiales.

El proveedor CARTO independiente fue eliminado. QA del usuario confirmó que todos los mapas funcionan bien y no aparece `API KEY REQUIRED`.

## P1.2 — Desde / Hasta

El período se aplica directamente a `delivery_trips.trip_date` en Supabase y gobierna Documentos + Viajes.

No depende de los 250 viajes más recientes.

QA confirmado por el usuario con rango `08/09/2026 → 08/09/2026`.

## P1.3 — Excel estructurado

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

Núcleo:

`src/lib/logisticsTripDistance.ts`

Decisión de producto: **NO implementar breadcrumbs ni tracking periódico** para no aumentar consumo y complejidad sobre Supabase Free.

La distancia se calcula client-side con puntos ya existentes.

Prioridad por parada:

1. coordenada real de entrega;
2. evento GPS de la parada;
3. coordenada planificada;
4. sin ubicación si no existe ninguna.

Origen/retorno usan coordenadas ya disponibles del viaje o eventos existentes.

KPI:

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

# QA / CI / Producción

Confirmado por el usuario y CI:

- Operaciones / Torre de Control: OK;
- Historial / mapas: OK;
- mapa grande: OK;
- sin `API KEY REQUIRED`: OK;
- filtro Desde/Hasta: OK;
- Excel estructurado: generado correctamente;
- P1.4 TypeScript + Vite: SUCCESS;
- CI final pre-merge: SUCCESS;
- CI post-merge en `main`: SUCCESS;
- deploy Cloudflare: SUCCESS;
- smoke test productivo `0.6.5-beta.14.0`: OK.

# Seguridad y consumo

Hallazgos previos del Security Advisor siguen como backlog dedicado; P1 no modifica RLS ni seguridad.

No interpretar datos TEST y coordenadas QA artificiales como conducta real del chofer.

# Reglas de trabajo

- producción actual: `0.6.5-beta.14.0`;
- no introducir GPS continuo sin decisión explícita futura;
- no agregar consumo de Supabase para fabricar rutas más detalladas;
- no limpiar TEST;
- antes de cualquier cambio futuro revalidar `main`, Supabase, CI y producción;
- si se abre otro chat, leer este documento primero y verificar que el estado vivo siga coincidiendo con este checkpoint.
