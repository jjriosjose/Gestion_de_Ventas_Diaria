# V0.6.5-beta.12 — Deployment Status

Fecha: **28/08/2026 (RD)**.

## Estado productivo

- Versión: **0.6.5-beta.12**
- Rama estable: `main`
- PR funcional: **#43 — V0.6.5-beta.12 · Live Operations Tracking**
- Merge commit: `4028f4dd067e0b61829714df1c97a1908715cb0c`
- Cloudflare URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Wrangler: `4.125.0`
- Cloudflare Current Version ID: **`0707a082-57aa-40e4-ae92-9c182b710ff6`**
- Assets: 18 leídos; 7 nuevos/modificados cargados; 8 ya existentes.
- Deploy Wrangler: SUCCESS.

## CI previo al merge

- Build validation — TypeScript + Vite: **SUCCESS**
- Generate territorial GeoJSON: **SUCCESS**

## Supabase beta.12

Migraciones/capas de Tracking aplicadas antes del deploy:

- `v065_beta12_live_tracking_views`
- `v065_beta12_tracking_historical_event_guard`
- `v065_beta12_tracking_permission_guard`
- `v065_beta12_tracking_permission_finalize`

Vistas públicas finales:

- `executive_tracking_events_v1`
- `executive_tracking_stops_v1`
- `executive_tracking_snapshot_v1`

Seguridad validada:

- Administrador/Supervisor con `tracking.view` -> visión global.
- Usuario sin `tracking.view` -> 0 filas.
- Vendedor con permiso explícito -> solo su propio `employee_id`.

## Alcance funcional beta.12

Nuevo módulo `/tracking` con:

- vista conjunta de Vendedores;
- filtros por fecha, Vendedor, estado, frescura y territorio oficial;
- última posición GPS realmente registrada;
- estado operacional inferido;
- paradas planificadas y próxima parada;
- KPI operativos;
- auto-refresh cada 30 s en el día actual;
- playback por `route_plan_id`;
- timeline clicable;
- puntos GPS reales;
- tramos visuales entre puntos explícitamente estimados;
- protección contra mezcla de múltiples jornadas del mismo Vendedor;
- exclusión de cierres administrativos cross-day como movimiento físico.

## Definición importante

Beta.12 implementa **near-live operational tracking basado en eventos GPS persistidos**. No implementa GPS continuo en background. La interfaz debe presentar la coordenada como `último registro` con su frescura, no como ubicación actual confirmada cuando el dato no es reciente.

## Validación visual pendiente post-deploy

1. Administrador: módulo Tracking visible.
2. Día actual: vista conjunta, filtros, KPI y auto-refresh.
3. Mapa: marcadores, estados, última actividad y próxima parada.
4. Histórico 26/08: playback de César Caba.
5. Confirmar aislamiento por `route_plan_id` cuando existen dos planes en una misma fecha.
6. Confirmar que el cierre administrativo posterior no aparece como desplazamiento físico.
7. Responsive desktop/tablet/móvil.

## Estado

```text
GitHub main      = 0.6.5-beta.12
Supabase backend = beta.12 Tracking aplicado
Cloudflare UI    = 0.6.5-beta.12 desplegada
Visual QA        = pendiente
```
