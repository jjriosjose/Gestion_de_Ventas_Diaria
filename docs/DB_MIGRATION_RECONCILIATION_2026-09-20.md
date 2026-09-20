# Reconciliación de migraciones GitHub ↔ Supabase — 20/09/2026

> Auditoría **read-only**. No se aplicó DDL ni se modificó producción.

Proyecto Supabase: `ccvzosnhxitfeochnflr`

GitHub auditado: `main` después de la reconciliación 16.3.9.

## Resultado cuantitativo

- archivos SQL de migración en GitHub: **64**
- migraciones registradas en Supabase remoto: **70**
- mismo nombre + mismo timestamp: **34**
- mismo nombre con timestamp diferente: **28**
- solo en Supabase por nombre: **8**
- solo en GitHub por nombre: **2**

La diferencia no debe interpretarse como “faltan 8 archivos y sobran 2” de forma automática. Parte del historial fue aplicado con timestamps distintos y algunos archivos de GitHub pueden consolidar varias migraciones remotas. La prueba correcta es **rebuild + schema diff**, no replay ciego.

## Migraciones que existen solo en Supabase por nombre

1. `20260822042836_management_cadence_showroom_workflow`
2. `20260822043027_allow_pending_showroom_without_date`
3. `20260822043434_manual_client_assignment_overrides`
4. `20260822043549_protect_manual_assignments_from_homologation`
5. `20260822043954_bulk_management_frequency`
6. `20260822215430_geographic_intelligence_v2`
7. `20260822215459_enable_http_for_official_geodata_sync`
8. `20260916234943_protect_showroom_purchase_amount_admin_only`

La #8 es especialmente relevante: creó/protegió la regla administrativa del monto de Showroom. La migración posterior `20260917162843_showroom_manager_close_amount_and_realtime_notifications` reemplaza la función de protección, pero un rebuild debe confirmar que el trigger asociado también se crea correctamente desde el historial versionado.

## Archivos que existen solo en GitHub por nombre

1. `supabase/migrations/20260822043000_add_operation_coverage_showroom.sql`
2. `supabase/migrations/20260822223000_add_geo_intelligence_assessments.sql`

Hipótesis a comprobar: estos archivos podrían ser consolidaciones locales de varias migraciones aplicadas remotamente. **No asumir equivalencia hasta comparar SQL y esquema resultante.**

## Mismo nombre, timestamp distinto

Se detectaron **28** migraciones con igual nombre lógico pero diferente versión/timestamp entre GitHub y Supabase. Entre ellas:

- `track_initial_cartera_import`
- `add_tms_light_and_geo_quality`
- `harden_geo_quality_workflow`
- `add_portfolio_homologation`
- `add_territorial_planning_helpers`
- `allow_assigned_route_execution`
- `fix_territory_geometry_multipolygon`
- `coverage_counts_assigned_responsible`
- `correct_operational_daily_metrics`
- `enforce_single_open_visit_per_employee`
- `v061_operational_date_and_showroom_routing`
- `v061_client_type_filters`
- `v064_route_closure_and_distance_metrics`
- `v064_operational_visit_day_alignment`
- `v064_align_core_executive_route_day`
- `v065b_capture_context`
- `v065c_journey_lifecycle_and_reporting`
- `v065c_expired_journey_admin_resolution`
- `v065c_route_territory_snapshot`
- `v065c_official_territory_reporting_view`
- `v065c_scoped_executive_views`
- `v065_beta11_operational_intelligence`
- `v065_beta11_visit_count_metric`
- `v065_beta12_live_tracking_views`
- `v065_beta12_tracking_historical_event_guard`
- `v065_beta12_tracking_permission_guard`
- `v065_beta12_tracking_permission_finalize`
- `v065_beta12_1_gps_quality_guard`

Esto afecta principalmente la **reproducibilidad histórica**, no significa por sí mismo que producción esté corrupta.

## Riesgo

Si se crea una base nueva y se ejecutan únicamente los archivos actuales de GitHub, todavía no está demostrado que el esquema final sea idéntico a producción.

Por tanto, hasta completar esta reconciliación:

- no declarar disaster recovery validado;
- no usar “todas las migraciones están en GitHub” como supuesto;
- no borrar historial remoto;
- no renombrar timestamps de migraciones ya aplicadas en producción;
- no reejecutar migraciones antiguas sobre producción.

## Plan seguro de remediación

### Paso 1 — inventario de objetos críticos
Comparar en producción y rebuild:
- tablas/columnas/defaults;
- constraints;
- índices;
- RLS/policies;
- triggers;
- functions/RPC;
- views;
- publications Realtime;
- Storage policies.

### Paso 2 — reconstrucción fuera de producción
Usar un entorno aislado:
- Supabase local o staging;
- aplicar migraciones del repositorio desde cero;
- no copiar datos productivos inicialmente.

### Paso 3 — schema diff
Comparar el esquema reconstruido contra producción.

Clasificar diferencias:
- equivalencia funcional con timestamp distinto;
- migración consolidada;
- objeto faltante;
- objeto extra/obsoleto.

### Paso 4 — corregir GitHub
Agregar únicamente los SQL necesarios para que una base vacía llegue al estado deseado. No alterar la historia de producción sin una estrategia explícita.

### Paso 5 — test de rebuild
El criterio de cierre es:
> una base nueva creada solo con el repositorio produce el mismo esquema funcional esperado y pasa pruebas RLS/RPC críticas.

## Prioridad

**P0 antes de Go-Live**, pero no requiere detener el desarrollo funcional mientras:
- no se hagan cambios destructivos;
- se mantenga producción respaldada;
- toda nueva migración sí quede versionada desde el inicio.

