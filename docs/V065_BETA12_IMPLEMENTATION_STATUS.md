# V0.6.5-beta.12 — Implementation Status

Fecha: **28/08/2026 (RD)**.

## Estado

- Rama: `feature/v065-beta12-live-tracking`
- PR: `#43 — V0.6.5-beta.12 · Live Operations Tracking`
- Producción Cloudflare continúa en **0.6.5-beta.11** hasta merge + deploy manual.
- Supabase beta.12 ya recibió las vistas ejecutivas aditivas.
- Primera validación TypeScript + Vite del PR: SUCCESS.

## Módulo nuevo

Ruta: `/tracking`

Permiso: `tracking.view`

Defaults:

- Administrador: permitido;
- Supervisor: permitido;
- Vendedor/Gestor/Recepción/SoloLectura: no por defecto.

La autorización visual no sustituye backend scoping.

## Modelo de Tracking

Beta.12 implementa **near-live operational tracking**, no GPS background continuo.

Fuentes GPS reales actuales:

- `route_sessions.start_*`;
- `visits.start_*`;
- `visits.end_*`;
- `operational_incidents.latitude/longitude`;
- `route_sessions.end_*` cuando el cierre físico pertenece al mismo día operacional.

La UI siempre muestra `último registro` y frescura. Nunca presenta una coordenada antigua como ubicación actual confirmada.

## Vistas Supabase

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

## Seguridad validada

Simulación autenticada:

- Administrador Jorge Rios -> 6 snapshots / 2 Vendedores en histórico existente.
- Vendedor Cesar Caba -> 4 snapshots / 1 único employee_id, exclusivamente Cesar Caba.

Las vistas usan:

```text
private.is_admin()
OR employee_id = private.current_employee_id()
```

`private.is_admin()` reconoce Administrador/Supervisor.

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
- selección de Vendedor;
- playback;
- timeline.

### `src/components/LiveTrackingMap.tsx`

Leaflet con:

- última posición registrada;
- paradas;
- eventos GPS;
- polilínea estimada;
- marcador de playback;
- tooltips con advertencia de naturaleza del dato.

### `src/styles/tracking.css`

Responsive desktop/tablet/móvil y reduced-motion.

## Playback

Solo se habilita con eventos GPS reales.

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
- [x] scoping backend validado;
- [x] build TypeScript + Vite inicial SUCCESS;
- [ ] Generate territorial GeoJSON final SUCCESS;
- [ ] CI final sobre último commit documental;
- [ ] revisar PR #43;
- [ ] merge a `main`;
- [ ] usuario Fetch/Pull;
- [ ] build local;
- [ ] deploy Cloudflare;
- [ ] registrar Current Version ID;
- [ ] validar visualmente Administrador;
- [ ] validar fecha histórica con playback;
- [ ] validar filtros y vista conjunta;
- [ ] decidir fase futura de GPS periódico solo con aprobación explícita.
