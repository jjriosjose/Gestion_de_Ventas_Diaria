# Continuación actual — Gestión de Ventas Diaria

Fecha: **16/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub `main`, Supabase, CI y Cloudflare reales son la fuente de verdad. Antes de escribir, migrar, mergear o desplegar, verificar el estado vivo.

## Orden de lectura recomendado

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CONTINUATION_PROMPT_2026-09-16_BETA16_3_1.md`
3. `docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`
4. `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`
5. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
6. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
7. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
8. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
9. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`

`PROJECT_HANDOFF.md` se conserva como histórico y no prevalece sobre este checkpoint ni sobre el estado vivo.

# Estado vivo

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Versión de aplicación: **0.6.5-beta.16.3.1**

`package.json` confirmado: **0.6.5-beta.16.3.1**.

Cloudflare productivo:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último deploy estático confirmado por el usuario:

- versión visible: **0.6.5-beta.16.3.1**;
- Cloudflare Version ID: `00950cb3-4ea4-4715-be39-d7ad519a69ea`.

Todos los datos actuales siguen siendo **TEST** hasta declaración explícita del usuario de Go-Live.

# Beta.16.3.1 — Cambio administrativo de Vendedor/Gestor — PRODUCTIVO

Objetivo: permitir que un usuario Administrador/Supervisor modifique directamente Vendedor y Gestor desde **Clientes > Editar maestro**.

Comportamiento:

- Administrador/Supervisor puede seleccionar directamente Vendedor;
- Administrador/Supervisor puede seleccionar directamente Gestor;
- al seleccionar directamente se activa el modo `MANUAL`;
- la asignación manual queda protegida de futuras homologaciones/importaciones;
- `AUTO` continúa usando homologación `V-CARTERA` / `G-CARTERA`;
- otros perfiles no obtienen permisos administrativos nuevos.

Commit funcional:

`304afd0f606f9915bd9145b9c360e5aaeb393693`

No se modificaron Rutas, Jornadas, Agenda, Logística, Tracking ni Supabase estructuralmente por este cambio.

# Incidencia y reparación de Jornada Libre — 16/09/2026

## Incidencia detectada

Rendy Mejias tenía una `route_session` activa del 16/09/2026 con:

- sesión: `5da99a7c-5f95-419b-b806-303e586aa777`;
- hora original de inicio: `2026-09-16 13:32:43.135234+00`;
- GPS de inicio registrado;
- `route_plan_id = NULL`.

Consecuencia observada:

- Rutas mostraba `No hay rutas para esta fecha`;
- Jornadas mostraba 0 jornadas;
- no aparecía el flujo normal para registrar visitas;
- el backend sí detectaba una sesión activa y podía impedir iniciar otra jornada.

## Reparación aplicada

Se conservó la sesión original, su hora y GPS. Se creó el contenedor operativo LIBRE y se vinculó la sesión:

- route plan: `73e8d8a3-9a25-45f9-ab12-878aaf4cc8f7`;
- plan code: `OPEN-20260916-9be03f0f-5DA99A`;
- título: `Jornada libre · 16/09/2026`;
- `route_mode = LIBRE`;
- plan `ACTIVA`;
- sesión `ACTIVA`;
- no se reinició la jornada ni se perdió su inicio.

Migración aplicada en Supabase y versionada en GitHub; **NO REPETIR**:

`20260916152328_repair_orphan_open_journey_and_require_route_plan`

Archivo:

`supabase/migrations/20260916152328_repair_orphan_open_journey_and_require_route_plan.sql`

La migración:

- repara sesiones activas huérfanas del día si existen;
- garantiza que `public.route_sessions.route_plan_id` sea `NOT NULL`;
- evita que vuelva a persistirse una jornada operativa sin un plan asociado.

Commit runtime:

`7a8eb61cfb82916c9afc458f25ff04d4a07ed29e` — `fix: repair orphan open journey and require route plan`.

CI:

- Build validation **#1025 SUCCESS**.

Validación live posterior:

- sesiones con `route_plan_id IS NULL`: **0**;
- `route_sessions.route_plan_id`: **NOT NULL**;
- Rendy conserva la sesión original vinculada al nuevo plan LIBRE;
- durante la verificación Rendy ya tenía **2 visitas**, **1 abierta**;
- Eduar Ceballos también tenía una Jornada Libre activa normal con plan asociado.

## QA visual pendiente

Antes de cualquier otro cambio, confirmar desde el usuario de Rendy:

1. refrescar Rutas/Actualizar;
2. debe aparecer `Jornada libre · 16/09/2026` activa;
3. debe permitir registrar/finalizar visitas adicionales;
4. Jornadas debe reflejar jornada, tiempos y visitas;
5. no cerrar ni recrear la jornada solo para probar.

# Beta.16.3 — Resolución administrativa de rutas no ejecutadas — PRODUCTIVO

Documento: `docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`

Reglas vigentes:

- `NO_INICIADA` describe el hecho operacional;
- decisión administrativa separada: `REVISADA`, `ANULADA`, `REPROGRAMADA`;
- nunca crear sesión artificial para una ruta que no inició;
- nunca marcar paradas como visitadas sin ejecución;
- nunca eliminar la ruta original ni sus paradas desde ese flujo.

Migración aplicada; **NO REPETIR**:

`20260913210416_route_plan_admin_resolution`

# Beta.16.2 — Lifecycle de Rutas/Jornadas — PRODUCTIVO

- rutas vencidas no iniciadas quedan `NO_INICIADA`;
- no pueden ejecutarse fuera de su fecha;
- vendedores pueden consultar históricas no ejecutadas;
- Jornadas abre rango histórico cuando se entra desde el banner;
- sin polling de 30 segundos; refresco por carga/foco/visibilidad.

Regla crítica: **una ruta pertenece exclusivamente a su fecha operativa**.

# Street Operations / Jornada Libre — PRODUCTIVO

Documento: `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Reglas:

- Jornada Libre solo cuando no existe ruta planificada disponible del día;
- `route_mode = LIBRE`;
- máximo una Jornada Libre por vendedor/día;
- visitas adicionales usan `planned=false`;
- no inflan cobertura del plan;
- jornadas vencidas no continúan al día siguiente;
- no GPS continuo, no polling nuevo, no Realtime.

Migraciones aplicadas; **NO REPETIR**:

- `20260911225302_open_field_journeys_v1`;
- `20260912163228_open_field_journey_start_fix`;
- `20260912172056_open_field_one_free_journey_per_day`;
- `20260916152328_repair_orphan_open_journey_and_require_route_plan`.

# CRM Territorial + Showroom / Recepción — PRODUCTIVO

Migración aplicada; **NO REPETIR**:

`20260913165442_crm_territorial_showroom_v1`

Flujo a preservar:

**Interés → solicitud → validación del Gestor → cita confirmada → llegada → espera → atención → resultado comercial → salida física.**

# Logística — PRODUCTIVO

P0/P1 se mantienen productivos:

- reintentos trazables;
- POD/firma;
- Performance;
- GPS móvil por HTTPS;
- Historial por Viaje;
- mapa/secuencia/timeline;
- trayectoria y distancia estimadas por eventos.

No implementar GPS continuo ni breadcrumbs sin decisión explícita.

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`;
- mismo proyecto transferido administrativamente entre cuentas; no fue clonado ni recreado.

Estado revisado recientemente: `ACTIVE_HEALTHY`.

Auditoría de consumo 15/09/2026:

- base aprox. `163 MB`;
- 60 conexiones máximas configuradas;
- medición: 14 conexiones cliente, 1 activa;
- 0 `idle in transaction`;
- 0 deadlocks;
- cache hit 100%;
- mayor carga observada: consultas geográficas (`client_geo_assessments`, `geo_intelligence_summary`), no escrituras normales de vendedores;
- `audit_log` era la tabla más grande (~100 MB).

Performance Advisor mostró foreign keys sin índice y algunas políticas RLS múltiples. Tratar en auditoría dedicada; no hacer refactor masivo durante una corrección funcional.

# Pendientes / ideas no implementadas

- mejora estética/UX del sidebar/menu lateral, discutida pero no implementada;
- posible paso de Supabase Free a Pro para uso real en trabajo;
- futura arquitectura SaaS/multi-tenant y comercialización por membresías: todavía conceptual, no implementada;
- auditoría dedicada de seguridad/RLS y performance antes de escalar comercialmente.

# Reglas de trabajo obligatorias

1. `main` y Supabase vivo son fuente de verdad.
2. Antes de modificar: verificar `main`, `package.json`, CI, migraciones y producción.
3. Desarrollo normal: rama feature → PR → CI → QA → autorización → merge → deploy.
4. Correcciones críticas solo con autorización explícita y alcance mínimo.
5. No limpiar datos TEST sin backup + aprobación.
6. No repetir migraciones por memoria.
7. No introducir polling, Realtime ni GPS continuo por defecto.
8. No hacer refactor masivo de RLS/security dentro de una entrega funcional.
9. GitHub Desktop para Fetch/Pull y manejo local; CMD/PowerShell para `npm`, build y deploy.
10. En un chat nuevo, leer este archivo y luego `docs/CONTINUATION_PROMPT_2026-09-16_BETA16_3_1.md`.

# Próximo paso inmediato

**No modificar nada más antes del QA visual de la Jornada Libre reparada de Rendy.**

En el nuevo chat:

- hacer `Fetch origin` / `Pull origin` porque `main` recibió la migración de reparación y documentación posterior al último deploy;
- verificar que local quede limpio;
- validar visualmente Rutas y Jornadas de Rendy;
- si todo aparece correctamente, continuar con la siguiente necesidad funcional sin tocar la sesión activa.
