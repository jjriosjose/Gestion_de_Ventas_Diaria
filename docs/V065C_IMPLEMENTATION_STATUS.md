# V0.6.5-beta.9 — Estado de implementación

Fecha de checkpoint: 27/08/2026 (hora operativa RD; commits registrados en UTC del 28/08).

## Estado general

- Rama: `feature/v065-beta9-jornadas-reportes`.
- PR: #38 `V0.6.5-beta.9 · Jornadas, cierre diario y reportes multiperíodo`.
- Versión frontend: `0.6.5-beta.9`.
- Build TypeScript + Vite: **SUCCESS**.
- Supabase V065C: **APLICADO EN PRODUCCIÓN**.
- Cloudflare: **NO DESPLEGADO TODAVÍA**. La UI productiva sigue en beta.8 hasta el deploy controlado.

## Migraciones V065C aplicadas

El ledger remoto de Supabase contiene:

1. `v065c_journey_lifecycle_and_reporting`
2. `v065c_expired_journey_admin_resolution`
3. `v065c_route_territory_snapshot`
4. `v065c_official_territory_reporting_view`
5. `v065c_scoped_executive_views`

Los timestamps del ledger remoto pueden diferir de los prefijos de archivo del repositorio. No intentar corregirlos con replay manual.

## Jornadas

Nuevo módulo `/jornadas`:

- Admin/Supervisor: Control de jornadas global.
- Vendedor: Mis jornadas.
- filtros por período, vendedor, estado, tipo de cliente y División Territorial Oficial;
- KPI de jornadas, cobertura, resolución, tiempo, distancia y eventualidades;
- detalle de paradas y eventualidades;
- exportación Excel/PDF;
- jornada vencida visible como `PENDIENTE_CIERRE`;
- nunca se ofrece `Continuar` para días anteriores.

## Regla temporal fuerte

Una `route_session` solo puede ejecutar actividad cuando su `session_date` coincide con el día operativo actual en `America/Santo_Domingo`.

Backend bloquea sobre una sesión vencida:

- nuevas visitas;
- cierre operacional de visitas en un día posterior;
- nuevas eventualidades;
- cambios de estado de paradas para continuar ejecución.

Una jornada vencida puede cerrarse de forma trazable, pero no continuar.

## Regularización administrativa

Si una jornada vencida conserva una visita/eventualidad abierta:

- el Vendedor no puede continuarla;
- Admin/Supervisor puede ejecutar regularización administrativa;
- la actividad se corta técnicamente al límite del día operativo;
- la parada incompleta queda `NO_VISITADO`;
- no aumenta falsamente la cobertura;
- se conserva motivo y notas de regularización.

## Tiempo histórico

`executive_route_journeys` limita sesiones abiertas al fin de su día operativo. Una jornada olvidada no sigue acumulando 24/48/72 horas en las nuevas métricas de Jornadas/Reportes.

## Territorio histórico oficial

`route_stops` ahora conserva snapshot al planificar:

- `official_region_at_plan`
- `official_province_at_plan`
- `official_municipality_at_plan`

Validación realizada después del backfill:

- 72/72 paradas existentes con cliente tienen Región oficial.
- 72/72 tienen Provincia oficial.
- 72/72 tienen Municipio oficial.

La vista `executive_route_journeys_v2` expone arrays de territorio oficial congelado para filtros históricos.

Ejemplos reales verificados incluyen rutas en Ozama y Valdesia, con provincias/municipios correspondientes.

## Seguridad de Jornadas

`executive_route_journeys_v2` impone alcance también en backend:

- Administrador/Supervisor -> todas las jornadas.
- otros perfiles -> solamente `employee_id = private.current_employee_id()`.

Prueba ejecutada simulando rol `authenticated`:

- Vendedor Cesar Caba: 3 filas, 1 único empleado, solamente Cesar Caba.
- Administrador: 5 filas, 2 empleados con jornadas existentes.

También se crearon wrappers scoped para las vistas ejecutivas diaria y de distancia para evolución segura de Reportes.

## Reportes V2

`/reportes` evolucionó a multiperíodo:

- Día.
- Semana.
- Mes.
- Rango personalizado.
- Tipo de colaborador.
- Colaborador.
- Estado de jornada.
- Tipo de cliente de ruta.
- Región oficial.
- Provincia oficial.
- Municipio oficial.

Reglas:

- el período de desempeño no se extiende a fechas futuras;
- cobertura período = `SUM(visitados) / SUM(planificados)`;
- cierre operativo = `SUM(resueltos) / SUM(planificados)`;
- nunca se promedian porcentajes diarios directamente;
- territorio oficial afecta métricas de ruta/jornada;
- actividades no territorializadas (llamadas/showroom/ventas generales) se limitan a días/colaboradores coincidentes y la UI informa esta semántica.

## Integración con otros módulos

### Inicio

Solo muestra resumen accionable:

- jornadas activas hoy;
- finalizadas hoy;
- pendientes de cierre;
- cobertura de hoy;
- enlace a Jornadas.

Inicio sigue siendo `qué ocurre hoy`, no histórico.

### Rutas

- banner global de jornada activa o pendiente;
- una jornada vencida dirige a `Revisar y cerrar`;
- controles de ejecución vencida se ocultan;
- backend sigue siendo la protección definitiva.

### Visitas

Si existe visita abierta de una jornada vencida:

- aviso contextual;
- no puede terminarse como actividad del día actual;
- dirige a Jornadas.

### Campana

Las jornadas pendientes de cierre se integran como alerta operativa.

## Validaciones realizadas

- TypeScript + Vite sobre versión con filtros territoriales oficiales: SUCCESS.
- Supabase: cinco migraciones V065C aplicadas correctamente.
- Snapshot territorial: 72/72 completo.
- Scoping vendedor/admin: validado.
- `executive_route_journeys_v2`: devuelve territorio oficial histórico correctamente.
- Cobertura vs resolución continúa separada; ejemplos históricos con baja cobertura y resolución 100% se mantienen correctamente.

## Pendiente antes de producción frontend

1. Esperar finalización de checks del PR #38.
2. Confirmar PR mergeable y sin checks fallidos.
3. Merge a `main`.
4. Actualizar `PROJECT_HANDOFF.md` con SHA de merge y estado final.
5. En equipo local del usuario: Fetch/Pull.
6. `npm run build`.
7. `npm run deploy`.
8. Registrar Cloudflare Version ID.
9. Validar en producción con Admin y Vendedor.
10. Actualizar nuevamente handoff con el deploy confirmado.

## Regla de recuperación en un nuevo chat

Leer en este orden:

1. `PROJECT_HANDOFF.md`.
2. `docs/V065C_IMPLEMENTATION_STATUS.md`.
3. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
4. Estado real de GitHub `main` / PR #38 si aún estuviera abierto.
5. Ledger real Supabase.
6. Estado real Cloudflare.

GitHub, Supabase y Cloudflare son fuente de verdad por encima del historial conversacional.
