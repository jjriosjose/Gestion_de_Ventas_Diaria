# Continuación actual — Gestión de Ventas Diaria

Fecha: **13/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub `main`, Supabase, CI y Cloudflare reales son la fuente de verdad. Antes de escribir, migrar, mergear o desplegar, verificar el estado vivo.

## Orden de lectura recomendado

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`
3. `docs/CONTINUATION_PROMPT_2026-09-13_BETA16_3.md`
4. `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`
5. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
6. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
7. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
8. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
9. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
10. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
11. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

`PROJECT_HANDOFF.md` se conserva como documento histórico; su cabecera original quedó desactualizada y no debe prevalecer sobre este checkpoint ni sobre el estado vivo.

# Estado vivo al cierre de este checkpoint

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva de código: `main`

Release productivo actual: **0.6.5-beta.16.3**

PR: **#64 — MERGED**

Merge funcional beta.16.3:

`6a4790f3bfebed352abac0052b09399e63cd5bf0`

Cloudflare productivo:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Deploy productivo beta.16.3 confirmado el 13/09/2026:

- Versión visible: **0.6.5-beta.16.3**.
- Cloudflare Version ID: `6fb1d46c-3a45-4a46-9930-6725b4449591`.
- Wrangler detectó y publicó 6 assets nuevos/modificados.
- QA productivo visual confirmado por el usuario.

Todos los datos actuales siguen siendo **TEST** hasta declaración explícita del usuario de Go-Live.

# Beta.16.3 — Resolución administrativa de rutas no ejecutadas — PRODUCTIVO

Documento:

`docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`

Objetivo resuelto: permitir que Administración/Supervisión gestione desde **Rutas** las planificaciones vencidas que nunca iniciaron, sin borrar ni alterar el histórico operacional.

Regla crítica:

- `NO_INICIADA` describe el hecho operacional;
- `REVISADA`, `ANULADA` y `REPROGRAMADA` describen la decisión administrativa posterior;
- nunca crear una `route_session` artificial;
- nunca marcar paradas como visitadas si no hubo ejecución;
- nunca eliminar físicamente la ruta original ni sus `route_stops` desde este flujo.

Acciones disponibles:

- **Dar por revisada**: reconoce administrativamente la no ejecución.
- **Anular planificación**: conserva ruta/paradas e incorpora motivo de anulación.
- **Reprogramar ruta**: crea una nueva planificación para otra fecha y mantiene la original como no ejecutada, vinculada mediante `reprogrammed_route_id`.

Migración aplicada en Supabase; **NO REPETIR POR MEMORIA**:

`20260913210416_route_plan_admin_resolution`

Datos agregados a `route_plans`:

- `resolution_status`;
- `resolution_reason`;
- `resolved_at`;
- `resolved_by`;
- `reprogrammed_route_id`.

QA productivo confirmado:

- panel administrativo visible en Rutas para usuario autorizado;
- antes de realizar resoluciones, producción mostró **11 rutas no ejecutadas requieren resolución administrativa**;
- el listado muestra fecha, Vendedor y cantidad de paradas;
- el modal indica explícitamente **No se eliminará el historial**;
- `Anular planificación` exige motivo/observación y no borra datos;
- producción muestra **0.6.5-beta.16.3**.

Beta.16.3 no modifica funcionalmente Captación, CRM/Llamadas, Agenda/Showroom, Recepción, Tracking, Logística/POD, GPS, Realtime ni los históricos existentes por defecto.

# Beta.16.2 — Journey / Route Lifecycle — PRODUCTIVO

Documento:

`docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`

Objetivo resuelto: un Vendedor ya no tiene que filtrar día por día para descubrir rutas planificadas antiguas que vencieron sin iniciarse.

Comportamiento vigente:

- Rutas consulta `executive_route_journeys_v4` para el estado operacional consolidado.
- Si existen rutas históricas `NO_INICIADA`, aparece un banner `N rutas anteriores no ejecutadas`.
- `Ver no ejecutadas` abre Jornadas con `status=NO_INICIADA`.
- Jornadas abre automáticamente un rango personalizado desde `01/01` del año hasta hoy.
- Las rutas vencidas se conservan como histórico y no pueden ejecutarse fuera de su fecha.
- Rutas actualiza al cargar y al recuperar foco/visibilidad; sin polling periódico de 30 segundos.

QA previo con Virmania Inoa:

- 01/09/2026 — Ruta de visitas — 15 paradas — no ejecutada;
- 30/08/2026 — Ruta de visitas — 8 paradas — no ejecutada;
- ambas visibles juntas en Jornadas.

Regla a preservar: **una ruta pertenece exclusivamente a su fecha operativa**. Si vence sin iniciarse, queda `NO_INICIADA` para consulta/auditoría y posible resolución administrativa posterior, pero no se reactiva como si fuera la misma jornada en otra fecha.

# Captación

Beta.16.2 y beta.16.3 **no modifican Captación**.

La prueba del 13/09 ocurrió en domingo y el módulo solicitó confirmación de `Captación libre`; ese comportamiento correspondió al contexto de día sin tarea activa. No introducir otra modificación en Captación sin una necesidad reproducible en un día operativo normal.

# Beta.16.1 — Reporting Executive Consistency V2

Release anterior: **0.6.5-beta.16.1**.

Incluye el Resumen ejecutivo de Inicio y exportación PDF ejecutivo validados visualmente. El PDF mantiene KPI, gráficas y rankings consistentes con la vista ejecutiva.

# CRM Territorial + Showroom Flow — PRODUCTIVO

Migración aplicada; **NO REPETIR POR MEMORIA**:

`20260913165442_crm_territorial_showroom_v1`

Flujo vigente:

**Interés → solicitud → validación del Gestor → cita confirmada → llegada → espera → atención → resultado comercial → salida física.**

Capacidades que deben preservarse:

- filtros territoriales en CRM;
- llamadas entrantes/salientes;
- resultado `COMPRO` con monto;
- venta CRM incluida en resumen ejecutivo;
- pre-agenda separada de cita confirmada;
- Gestor responsable separado de quién atendió;
- Recepción V2 con agenda futura, llegada, espera, atención y salida;
- todos los Gestores pueden consultar movimiento, pero las acciones sensibles respetan responsable/RLS;
- compras showroom alimentan Dashboard;
- alertas sin polling continuo.

# Street Operations / Jornadas — PRODUCTIVO

Documento:

`docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Reglas vigentes:

- Jornada Libre disponible cuando no existe ruta planificada del día;
- `route_mode = LIBRE`;
- máximo una Jornada Libre por vendedor y fecha;
- visitas adicionales dentro de una ruta planificada usan `planned=false` y no inflan cobertura;
- cobertura planificada = visitados del plan / planificados del plan;
- jornadas vencidas no pueden continuar al día siguiente;
- pendientes de cierre requieren revisión/cierre, no continuidad;
- rutas planificadas vencidas que nunca iniciaron se muestran como `NO_INICIADA`;
- la resolución administrativa posterior no altera el hecho operacional;
- no GPS periódico, no polling nuevo, no Realtime.

Migraciones aplicadas; **NO REPETIR**:

- `20260911225302_open_field_journeys_v1`;
- `20260912163228_open_field_journey_start_fix`;
- `20260912172056_open_field_one_free_journey_per_day`;
- `20260913210416_route_plan_admin_resolution`.

# Logística — PRODUCTIVO

P0 validado:

- reintentos trazables y saldo pendiente;
- bloqueo de documento entregado;
- bloqueo de saldo incorrecto;
- POD/firma en dos etapas;
- firma endurecida;
- Performance Fase 1;
- GPS móvil por HTTPS;
- cierre de viaje sin duplicación de eventos.

P1 Historial por Viaje:

- documentos + viajes;
- filtros y KPI;
- mapa compartido;
- secuencia planificada;
- trayectoria GPS estimada;
- timeline;
- permanencia/resultados;
- Excel estructurado;
- distancia operativa estimada.

La trayectoria/distancia es una estimación entre eventos GPS ya registrados; no representa ruta vial exacta. No implementar breadcrumbs ni tracking continuo sin decisión explícita.

Migraciones P0 aplicadas; **NO REPETIR**:

- `20260907094026_delivery_document_retry_traceability`;
- `20260907094801_delivery_document_retry_guard_refinement`.

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`.

La transferencia administrativa anterior fue del mismo proyecto; no se clonó ni recreó.

Política de datos y consumo:

- sin polling por defecto;
- sin Realtime por defecto;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación explícita;
- no repetir migraciones por memoria;
- no hacer refactor masivo de RLS/security durante una entrega funcional;
- Security Advisor pendiente se trata como auditoría dedicada.

# Reglas de trabajo obligatorias

1. `main` es la fuente de código productivo.
2. Desarrollo nuevo: rama feature → PR → CI → QA → autorización → merge.
3. Antes de escribir: verificar `main`, PRs, CI, Supabase y producción.
4. No usar conversaciones antiguas como fuente de verdad cuando contradigan el estado vivo.
5. No limpiar datos TEST sin backup y aprobación.
6. No alterar Auth/RLS/migraciones de forma masiva sin análisis dedicado.
7. No introducir polling, Realtime ni GPS continuo por defecto.
8. Mantener el producto SaaS-ready de forma progresiva sin improvisar multi-tenancy parcial.
9. GitHub Desktop se usa para sincronización local; CMD/PowerShell para `npm`, build y deploy.
10. En un chat nuevo, leer este documento y luego `docs/CONTINUATION_PROMPT_2026-09-13_BETA16_3.md`.

# Próximo paso inmediato

Beta.16.3 queda **cerrada y productiva**. No hay acción pendiente de merge, build o deploy para este release.

Antes de cualquier nueva actualización:

- hacer `Fetch origin`/`Pull origin` en `main`;
- verificar versión visible y estado vivo;
- crear una nueva feature branch;
- mantener el flujo PR → CI → QA → autorización → merge → deploy.
