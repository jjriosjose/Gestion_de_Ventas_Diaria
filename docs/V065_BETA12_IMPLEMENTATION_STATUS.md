# V0.6.5-beta.12 — Implementation Status

Fecha: **28/08/2026 (RD)**.

## Estado

- Rama: `feature/v065-beta12-live-tracking`
- PR: `#43 — V0.6.5-beta.12 · Live Operations Tracking`
- Producción Cloudflare continúa en **0.6.5-beta.11** hasta merge + deploy manual.
- Supabase beta.12 ya recibió las vistas ejecutivas aditivas y el guard de permiso backend.
- Validaciones TypeScript + Vite durante desarrollo: SUCCESS; falta exigir CI sobre el head documental final antes del merge.

## Módulo nuevo

Ruta: `/tracking`

Permiso: `tracking.view`

Defaults:

- Administrador: permitido;
- Supervisor: permitido;
- Vendedor/Gestor/Recepción/SoloLectura: no por defecto.

La autorización visual y la autorización backend usan la misma intención. `tracking.view` puede concederse o revocarse mediante `permission_overrides`.

## Modelo de Tracking

Beta.12 implementa **near-live operational tracking**, no GPS background continuo.

Fuentes GPS reales actuales:

- `route_sessions.start_*`;
- `visits.start_*`;
- `visits.end_*`;
- `operational_incidents.latitude/longitude`;
- `route_sessions.end_*` cuando el cierre físico pertenece al mismo día operacional.

La UI siempre muestra `último registro` y frescura. Nunca presenta una coordenada antigua como ubicación actual confirmada.

## Vistas Supabase finales

Los nombres públicos estables son:

- `executive_tracking_events_v1`
- `executive_tracking_stops_v1`
- `executive_tracking_snapshot_v1`

Wrappers temporales `v2` usados durante el endurecimiento fueron eliminados antes de producción.

### `executive_tracking_events_v1`

Timeline GPS scoped:

- ROUTE_START;
- VISIT_START;
- VISIT_END;
- INCIDENT_START;
- INCIDENT_END;
- ROUTE_END físico válido.

Guard histórico aplicado:

Un `ROUTE_END` técnico registrado en fecha posterior a `session_date` no entra al playback. Se evita interpretar una regularización administrativa posterior como desplazamiento físico del Vendedor.

### `executive_tracking_stops_v1`

Paradas planificadas con:

- orden;
- estado;
- cliente/prospecto;
- GPS;
- territorio oficial congelado;
- Vendedor/fecha.

### `executive_tracking_snapshot_v1`

Una fila por plan/jornada con:

- tracking_status;
- última coordenada/evento;
- frescura;
- último cliente;
- siguiente parada;
- plan/visitados/cobertura;
- tiempo calle;
- atención;
- distancia;
- territorios oficiales.

Estados inferidos:

1. PENDIENTE_CIERRE
2. FINALIZADA
3. EVENTUALIDAD
4. EN_VISITA
5. EN_TRASLADO
6. PLANIFICADA
7. NO_EJECUTADA

## Seguridad backend final

Helper:

`private.current_user_can_view_tracking()`

Regla:

1. si `permission_overrides` contiene `tracking.view`, respeta explícitamente `true/false`;
2. si no existe override, Administrador/Supervisor tienen permiso por defecto;
3. otros perfiles no tienen Tracking por defecto.

Las vistas además conservan scoping defensivo:

```text
Administrador / Supervisor con permiso -> conjunto global
Usuario no ejecutivo con permiso       -> solo employee_id propio
Usuario sin tracking.view               -> 0 filas
```

Validaciones autenticadas:

- Jorge Rios / Administrador: `can_tracking = true`, 6 snapshots históricos visibles.
- Cesar Caba / Vendedor sin override: `can_tracking = false`, 0 filas.
- Prueba reversible con `tracking.view=true` para Cesar: 4 snapshots, 1 único employee_id, exclusivamente `Cesar Caba`; transacción revertida después de la prueba.

Esto impide que ocultar el menú sea la única defensa.

## Validación de datos

Últimos 30 días al construir beta.12:

- Visits: 6/6 inicio con GPS y 6/6 fin con GPS.
- Route sessions: 3/3 inicio con GPS y 3/3 fin con GPS.
- Incidentes: sin registros en la muestra actual.

Caso histórico 26/08:

Antes del guard, un cierre técnico posterior aparecía como último punto del recorrido.
Después del guard, el último evento físico es:

- `VISIT_END`
- cliente: `SUPERMERCADO SAOMY`
- fecha/hora correspondiente al día operativo 26/08.

## Frontend

### `src/pages/Tracking.tsx`

Incluye:

- fecha;
- Vendedor / todos;
- estado;
- frescura;
- Región/Provincia/Municipio oficial;
- solo con GPS;
- auto-refresh 30 s en fecha actual;
- KPI operativos;
- mapa + panel lateral;
- una tarjeta por jornada/plan;
- playback;
- timeline.

La vista general deduplica el marcador principal por Vendedor: se muestra una única última posición representativa por persona.

### Protección de múltiples jornadas

Un Vendedor puede poseer más de un `route_plan` en una misma fecha.

Beta.12 no mezcla esos recorridos:

- overview = una última posición por Vendedor;
- tarjeta = una jornada/plan;
- `Ubicar` = selecciona el `route_plan_id` exacto;
- `Recorrido` = filtra eventos y paradas por ese `route_plan_id`;
- playback y timeline jamás combinan dos planes distintos del mismo Vendedor.

### `src/components/LiveTrackingMap.tsx`

Leaflet con:

- última posición registrada;
- paradas;
- eventos GPS;
- polilínea estimada;
- marcador de playback;
- tooltips con advertencia de naturaleza del dato;
- selección por `route_plan_id`.

### `src/styles/tracking.css`

Responsive desktop/tablet/móvil y reduced-motion.

## Playback

Solo se habilita con eventos GPS reales de la jornada seleccionada.

Controles:

- reproducir/pausar;
- inicio;
- siguiente;
- ruta completa;
- velocidad 1x/2x/4x;
- progreso;
- timeline clicable.

La línea entre dos puntos es una unión estimada, no una reconstrucción vial exacta.

## No implementado deliberadamente

- background GPS periódico;
- seguimiento cada segundos/minutos fuera de eventos operativos;
- ETA de tráfico;
- geofencing persistente;
- proveedor de routing vial;
- optimización automática tipo fleet.

Estas capacidades requieren diseño separado por privacidad, batería, permisos, costos y limitaciones de PWA/background geolocation.

## Pendiente antes de producción

- [x] migraciones beta.12 aplicadas;
- [x] permiso backend y scoping validados;
- [x] guard de cierres históricos validado;
- [x] aislamiento de playback por `route_plan_id` implementado;
- [x] build TypeScript + Vite del código SUCCESS;
- [ ] Build validation final sobre este head.
- [ ] Generate territorial GeoJSON final SUCCESS.
- [ ] revisar PR #43 completo.
- [ ] merge a `main`.
- [ ] usuario Fetch/Pull.
- [ ] build local.
- [ ] deploy Cloudflare.
- [ ] registrar Current Version ID.
- [ ] validar visualmente Administrador.
- [ ] validar fecha histórica con playback.
- [ ] validar filtros y vista conjunta.
- [ ] decidir fase futura de GPS periódico solo con aprobación explícita.
