# Continuation prompt — Gestion de Ventas Diaria — 16/09/2026

Este chat continúa el proyecto `jjriosjose/Gestion_de_Ventas_Diaria`.

## Regla principal

GitHub `main`, Supabase productivo y el despliegue real de Cloudflare son la fuente de verdad. El historial del chat sirve como contexto, pero no debe prevalecer sobre el estado vivo.

Antes de modificar código, base de datos o desplegar:

1. Lee `docs/CHAT_CONTINUATION_CURRENT.md` completo.
2. Verifica `main`, `package.json`, CI y migraciones Supabase.
3. No repitas migraciones ya aplicadas.
4. No limpies datos sin backup + aprobación explícita.
5. No introduzcas polling, Realtime ni GPS continuo por defecto.
6. No alteres módulos no relacionados durante una corrección puntual.

## Baseline actual

- Versión visible/productiva: `0.6.5-beta.16.3.1`.
- `package.json`: `0.6.5-beta.16.3.1`.
- Cloudflare URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Último deploy confirmado por el usuario: Cloudflare Version ID `00950cb3-4ea4-4715-be39-d7ad519a69ea`.
- Código funcional de beta.16.3.1: Administrador/Supervisor puede cambiar directamente Vendedor y Gestor desde Clientes > Editar maestro; las asignaciones manuales quedan protegidas de futuras homologaciones/importaciones.
- Commit de ese cambio: `304afd0f606f9915bd9145b9c360e5aaeb393693`.

## Reparación crítica de Jornada Libre — 16/09/2026

Se detectó una sesión activa de Rendy Mejias creada con `route_plan_id = NULL`, por lo que Rutas y Jornadas no podían mostrarla aunque la sesión existía.

Se reparó sin perder la sesión original, su hora ni GPS:

- sesión original: `5da99a7c-5f95-419b-b806-303e586aa777`;
- vendedor: Rendy Mejias;
- inicio original: `2026-09-16 13:32:43.135234+00`;
- nuevo contenedor LIBRE: `73e8d8a3-9a25-45f9-ab12-878aaf4cc8f7`;
- plan code: `OPEN-20260916-9be03f0f-5DA99A`;
- estado del plan y sesión: `ACTIVA`;
- la hora y GPS originales se conservaron.

Migración aplicada en Supabase y versionada en GitHub:

`20260916152328_repair_orphan_open_journey_and_require_route_plan`

Archivo:

`supabase/migrations/20260916152328_repair_orphan_open_journey_and_require_route_plan.sql`

La migración también endurece integridad:

- repara sesiones activas huérfanas del día si existieran;
- `public.route_sessions.route_plan_id` queda `NOT NULL`;
- una Jornada operativa ya no puede persistirse sin `route_plan`.

Commit runtime:

`7a8eb61cfb82916c9afc458f25ff04d4a07ed29e` — `fix: repair orphan open journey and require route plan`.

CI:

- Build validation `#1025` — SUCCESS.

Validaciones posteriores:

- `route_sessions` sin `route_plan_id`: `0`;
- `route_plan_id` es `NOT NULL` en producción;
- Rendy continúa con la misma sesión activa y el plan LIBRE vinculado;
- durante la validación Rendy ya tenía 2 visitas registradas, 1 de ellas abierta;
- Eduar Ceballos también tenía una Jornada Libre activa normal con plan vinculado.

## QA pendiente inmediato

En el siguiente chat, antes de cualquier otra actualización, confirmar visualmente con Rendy:

1. refrescar Rutas/Actualizar;
2. debe aparecer `Jornada libre · 16/09/2026` activa;
3. debe permitir registrar/finalizar visita adicional;
4. Jornadas debe reflejar la jornada y sus tiempos/visitas;
5. no cerrar ni recrear la jornada de Rendy solo para probar.

Si el móvil conserva una vista vieja, refrescar la aplicación antes de diagnosticar otro fallo. La base ya está reparada.

## Estado de otros módulos a preservar

- Beta.16.3: resolución administrativa de rutas no ejecutadas (`REVISADA`, `ANULADA`, `REPROGRAMADA`) conservando histórico.
- Beta.16.2: lifecycle de rutas/jornadas y consulta de `NO_INICIADA`.
- CRM Territorial + Showroom/Recepción productivo.
- Street Operations/Jornada Libre productivo.
- Logística P0/P1 productiva.
- No GPS continuo, no polling permanente, no Realtime por defecto.

## Supabase

- Proyecto: `Gestion de Ventas Diaria`.
- Ref: `ccvzosnhxitfeochnflr`.
- Región: `ca-central-1`.
- Es el mismo proyecto transferido administrativamente entre cuentas; no fue clonado ni recreado.
- Todos los datos siguen considerándose TEST hasta declaración explícita de Go-Live.

## Observaciones de capacidad/rendimiento

Auditoría del 15/09/2026:

- proyecto `ACTIVE_HEALTHY`;
- base aprox. `163 MB`;
- 60 conexiones máximas configuradas; 14 cliente y 1 activa en la medición;
- 0 `idle in transaction`, 0 deadlocks, cache hit 100%;
- la mayor carga observada proviene de consultas geográficas (`client_geo_assessments`, `geo_intelligence_summary`), no de las escrituras de vendedores;
- `audit_log` era la tabla de mayor tamaño (~100 MB);
- Performance Advisor reportó foreign keys sin índice y políticas RLS múltiples; tratar en auditoría dedicada, no hacer refactor masivo durante correcciones funcionales.

## Próximo paso

Primero validar visualmente que la reparación de Rendy ya aparece en Rutas/Jornadas. Después continuar con la siguiente necesidad funcional. Si se va a modificar código, partir del `main` vivo y mantener el flujo rama feature -> CI -> QA -> merge -> deploy, salvo correcciones críticas explícitamente autorizadas.
