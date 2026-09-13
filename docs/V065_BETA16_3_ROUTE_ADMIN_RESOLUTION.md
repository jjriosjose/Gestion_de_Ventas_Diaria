# V0.6.5-beta.16.3 — Resolución administrativa de rutas no ejecutadas

Fecha: 13/09/2026 (RD)

## Objetivo

Permitir que Administración/Supervisión gestione desde **Rutas** las planificaciones de visitas que vencieron sin iniciar, sin borrar ni alterar el histórico operacional original.

## Regla de negocio

El estado operativo y la decisión administrativa permanecen separados:

- una ruta que venció sin iniciar continúa siendo operacionalmente **NO_INICIADA / No ejecutada**;
- la decisión posterior puede ser **REVISADA**, **ANULADA** o **REPROGRAMADA**;
- nunca se crea una `route_session` artificial;
- nunca se marca una parada como visitada;
- nunca se elimina la ruta original ni sus `route_stops` mediante este flujo.

## Acciones

### Dar por revisada

Reconoce administrativamente la no ejecución y retira la ruta de la cola de pendientes administrativos. El plan y sus paradas permanecen intactos.

### Anular planificación

Registra que la planificación no debe ejecutarse. El registro histórico original permanece disponible para auditoría.

### Reprogramar ruta

Crea una nueva planificación para otra fecha, copiando las paradas originales como `PENDIENTE`. La ruta vencida permanece `NO_INICIADA` y queda vinculada a la nueva planificación mediante `reprogrammed_route_id`.

La nueva fecha no puede estar en el pasado y se bloquea si el Vendedor ya tiene una ruta planificada/activa en esa fecha.

## Seguridad

La RPC `public.resolve_unstarted_route_plan(uuid,text,text,date)` exige `private.is_admin()`, por lo que solo usuarios activos con `app_role` Administrador o Supervisor pueden resolver rutas no ejecutadas.

También valida que:

- la ruta sea `PLANIFICADA`;
- sea de tipo `VISITAS` o `MIXTA`;
- su fecha ya haya vencido;
- no tenga `route_session`;
- ninguna parada tenga `visit_id` ni estado diferente de `PENDIENTE`;
- no haya sido resuelta previamente;
- exista motivo administrativo.

## Datos agregados a `route_plans`

- `resolution_status`
- `resolution_reason`
- `resolved_at`
- `resolved_by`
- `reprogrammed_route_id`

Constraint: `resolution_status` solo admite `REVISADA`, `ANULADA`, `REPROGRAMADA` o NULL.

## Migración

Supabase productivo recibió la migración:

`20260913210416_route_plan_admin_resolution`

El archivo GitHub se alinea con ese mismo timestamp:

`supabase/migrations/20260913210416_route_plan_admin_resolution.sql`

No repetir la migración por memoria.

## Frontend

`RoutesWorkspace` agrega para perfiles con `planning.manage + journeys.manage`:

- banner global de rutas vencidas sin resolver;
- panel **Rutas no ejecutadas**;
- opción de incluir resoluciones anteriores;
- modal de resolución con motivo obligatorio;
- reprogramación con nueva fecha;
- navegación al histórico de Jornadas.

Los Vendedores mantienen el comportamiento de beta.16.2: solo consultan sus rutas históricas no ejecutadas y no pueden resolverlas administrativamente.

## Alcance deliberadamente no modificado

No se modifican:

- Captación;
- CRM / llamadas;
- Agenda / Showroom / Recepción;
- Tracking;
- Logística / POD;
- GPS;
- Realtime;
- políticas de consumo;
- datos existentes de rutas no ejecutadas.

## Estado

Backend/migración aplicado. Frontend en PR #64, sujeto a Build validation y merge antes del despliegue Cloudflare.
