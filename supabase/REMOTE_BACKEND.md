# Backend remoto Supabase

El esquema se encuentra desplegado en el proyecto Supabase **Gestion de Ventas Diaria**.

Objetos principales:

- companies
- employees
- clients
- prospects
- territories
- route_plans
- route_stops
- route_sessions
- visits
- calls
- appointments
- follow_ups
- photos
- catalog_options
- app_settings
- audit_log
- daily_snapshots
- import_batches
- bootstrap_credentials (sin acceso de usuarios finales)
- daily_global_summary (view, security_invoker)
- daily_employee_summary (view, security_invoker)

Funciones geográficas:

- nearby_clients
- clients_in_territory
- create_territory_polygon

Edge Functions:

- login-by-username
- master-import
- admin-users

La fuente de verdad operacional es Supabase. Excel solo sirve para carga inicial/actualización masiva controlada; los datos individuales pueden editarse dentro de la aplicación.
