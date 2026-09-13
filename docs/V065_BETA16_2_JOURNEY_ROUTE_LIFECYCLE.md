# V0.6.5-beta.16.2 — Journey / Route Lifecycle

Fecha: 13/09/2026 (RD)

## Objetivo

Resolver la visibilidad de rutas planificadas de Vendedores que vencieron sin haberse iniciado, evitando que el usuario tenga que buscar manualmente fecha por fecha y preservando la regla temporal de que una ruta no puede ejecutarse fuera de su fecha operativa.

## Alcance implementado

- `RoutesWorkspace` consulta `executive_route_journeys_v4` como fuente consolidada del ciclo operativo.
- Se conserva el aviso de jornada activa o pendiente de cierre.
- Se agrega un aviso específico de rutas anteriores `NO_INICIADA` para el Vendedor.
- El aviso muestra cantidad total, fecha de la ruta no ejecutada más reciente y número de paradas de esa ruta.
- `Ver no ejecutadas` navega a Jornadas con `status=NO_INICIADA`.
- Cuando Jornadas se abre con `status=NO_INICIADA`, el período inicial cambia automáticamente a rango personalizado desde `01/01` del año operativo hasta hoy.
- Esto permite ver en una sola pantalla rutas vencidas de meses diferentes.
- Las rutas no ejecutadas permanecen como histórico: no se eliminan, no se crea sesión artificial y no pueden iniciarse posteriormente.
- Se eliminó el refresco periódico de 30 segundos del wrapper de Rutas; la actualización ocurre en carga inicial y al recuperar foco/visibilidad.

## Validación funcional real

Usuario TEST validado: Virmania Inoa.

Rutas históricas verificadas en Supabase:

- 01/09/2026 — Ruta de visitas — 15 paradas — `NO_INICIADA`.
- 30/08/2026 — Ruta de visitas — 8 paradas — `NO_INICIADA`.

Existe además una planificación histórica de Captación del 24/08/2026 sin paradas, pero queda correctamente fuera de este aviso porque el flujo de Jornadas/Rutas considera `VISITAS` y `MIXTA`, no Captación.

QA visual aprobado el 13/09/2026:

1. Virmania abre Rutas el 13/09/2026.
2. El banner informa `2 rutas anteriores no ejecutadas`.
3. Al pulsar `Ver no ejecutadas`, se abre Jornadas.
4. Jornadas queda en `Rango personalizado`, desde 01/01/2026 hasta 13/09/2026.
5. Estado queda en `No ejecutada`.
6. Se visualizan juntas las rutas del 01/09/2026 y 30/08/2026.
7. KPI muestra 2 jornadas y 0/23 planificados visitados, coherente con las dos rutas vencidas.

## Seguridad / datos / backend

- Sin migraciones Supabase nuevas.
- Sin cambios de RLS.
- Sin limpieza ni modificación de datos históricos.
- Sin sesiones artificiales.
- Sin polling nuevo.
- Sin Realtime nuevo.
- Sin GPS continuo.
- Captación no se modifica en esta entrega.

## Versionado y PR

- Versión de aplicación: `0.6.5-beta.16.2`.
- Rama: `feature/journey-route-lifecycle-beta16-2`.
- PR: #63 — `Journey/Route lifecycle — past unexecuted routes · beta.16.2`.
- Commit funcional final previo a documentación: `0c991c95d2fbae05f733516e3180f1387156ade5`.
- Build validation #992: SUCCESS.

## Regla funcional que debe preservarse

Una ruta pertenece exclusivamente a su fecha operativa. Si vence sin iniciarse, pasa a histórico `NO_INICIADA`. Puede consultarse y auditarse, pero no reactivarse ni ejecutarse en otra fecha.

## Producción

Promoción a producción autorizada por el usuario después del QA visual. El SHA final de `main` y el Cloudflare Version ID deben registrarse en `docs/CHAT_CONTINUATION_CURRENT.md` después del merge/deploy definitivo.
