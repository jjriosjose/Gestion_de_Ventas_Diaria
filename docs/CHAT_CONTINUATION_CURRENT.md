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

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Main productivo: `734e1da5f586066083ad3010bccf0aeb8431a020`

Versión productiva: **0.6.5-beta.13.0**

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Version ID: `5b491c77-0dd2-4f7d-a5d9-72fc45226cf5`

Logística / Delivery V1 está mergeada y desplegada en producción.

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# P0 Logística

Validados antes de promoción:

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
- región: `ca-central-1`.

Política vigente:

- sin polling;
- sin Realtime;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación;
- no reescribir RLS global a ciegas.

# P1 actual — Historial por Viaje / Recorrido Operativo

Rama: **`feature/logistics-trip-history-v1`**

PR: **#59 Draft**

Base exacta: `main` @ `734e1da5f586066083ad3010bccf0aeb8431a020`.

Estado:

**IMPLEMENTADO EN RAMA / MAPAS QA OK / BUILD FUNCIONAL VERDE / FECHA+EXCEL PENDIENTES QA LOCAL / NO MERGE / NO DEPLOY**

Documento principal:

`docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`

## P1 — Viajes

`Historial / POD` tiene:

- `Documentos`;
- `Viajes`.

Viajes incluye:

- búsqueda por viaje/chofer/placa/transportista;
- filtros Todos / Finalizados / En curso / Excepciones;
- KPIs de duración, bultos, GPS, permanencia y resultados;
- mapa profesional;
- secuencia planificada;
- trayectoria GPS estimada;
- desviaciones plan/real;
- incidencias;
- mapa grande / encajar;
- paradas numeradas y estado;
- selección mapa/lista;
- lectura gerencial;
- timeline operativo;
- precisión GPS por evento.

## P1.1 — Shared Logistics Map Core

`Operaciones / Torre de Control` e `Historial / Recorrido` comparten:

`src/lib/logisticsMapCore.ts`

Centraliza:

- OpenStreetMap sin API key;
- centro/límites de RD;
- zoom y fitBounds;
- sanitización de popups;
- colores de rutas;
- infraestructura de límites territoriales oficiales.

El proveedor CARTO independiente fue eliminado. Ya no aparece `API KEY REQUIRED`.

QA visual del usuario:

- Operaciones: funciona;
- mapas grande/Control Tower: funcionan;
- Historial: funciona;
- usuario confirmó que todos los mapas funcionan bien.

## P1.2 — Filtro de período

Nuevo toolbar global `Desde / Hasta` en `Historial / POD`.

Características:

- default: primer día del mes actual → hoy RD;
- `Aplicar período`;
- indicador del rango cargado;
- filtro aplicado en Supabase sobre `delivery_trips.trip_date`, no solo en memoria;
- viajes paginados en bloques de 500;
- stops/documentos/POD/evidencias cargados por lotes de IDs;
- el período gobierna Documentos y Viajes.

Esto elimina la limitación anterior de depender de los 250 viajes más recientes.

## P1.3 — Exportación Excel

Nuevo botón `Exportar Excel` en el explorador de Viajes.

La exportación respeta:

1. período Desde/Hasta aplicado;
2. búsqueda;
3. filtro de estado.

Genera:

`Historial_Viajes_<desde>_a_<hasta>.xlsx`

Hojas:

- `Resumen`;
- `Viajes`;
- `Paradas`;
- `Documentos`;
- `Eventos`;
- `Incidencias`.

Incluye formatos profesionales, filtros, encabezado congelado, moneda/fechas/porcentajes, colores de estado y nota de semántica GPS.

Los eventos/incidencias masivos se consultan únicamente al pulsar exportar, por lotes; la navegación normal conserva carga lazy por viaje seleccionado.

## Regla semántica obligatoria

La línea GPS es una **trayectoria estimada entre eventos GPS registrados**.

Nunca presentarla como tracking continuo ni ruta vial exacta.

## Base de datos

P1/P1.1/P1.2/P1.3 no requieren migración ni cambios de esquema/RLS.

Usan tablas existentes:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- `delivery_proofs` / `delivery_evidence` para vista documental.

## Build

Head funcional de fecha/export validado antes de commits documentales:

`c1d2628ee008ed4f8d99f0d0327ffdc1323adfcc`

Build validation:

- TypeScript + Vite: **SUCCESS**.

Nota: hubo un primer build fallido únicamente por una llamada `getRange` ajena a ExcelJS; se corrigió y el siguiente build quedó verde.

# QA pendiente antes de merge

1. actualizar rama local `feature/logistics-trip-history-v1`;
2. confirmar toolbar Desde/Hasta;
3. probar rango de un solo día y rango de varios días;
4. comprobar actualización de contadores/lista;
5. combinar fecha + búsqueda + filtro de estado;
6. pulsar `Exportar Excel`;
7. abrir archivo y validar las 6 hojas;
8. confirmar registros, formatos, fechas, montos y GPS;
9. confirmar que Excel coincide con viajes visibles;
10. revisar responsive del toolbar.

# Seguridad y consumo

- sin cambios RLS;
- sin polling;
- sin Realtime;
- sin tracking continuo;
- eventos/incidencias masivos solo bajo demanda al exportar;
- no interpretar coordenadas QA artificiales como conducta real del chofer.

# Reglas de trabajo desde aquí

- NO modificar `main` hasta QA y aprobación explícita.
- NO desplegar P1 a Cloudflare todavía.
- NO crear migraciones innecesarias.
- NO activar GPS continuo.
- NO limpiar datos TEST.
- PR #59 debe permanecer Draft hasta cerrar QA.
- Antes de merge futuro: revalidar main, Supabase, CI y producción.
