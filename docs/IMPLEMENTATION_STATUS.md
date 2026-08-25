# Estado de implementación — Gestión de Ventas Diaria

**Baseline auditado:** V0.6.4  
**Fecha de auditoría documental:** 2026-08-25

> Este documento describe el estado técnico/funcional actual. Para continuidad de proyecto leer también `PROJECT_HANDOFF.md` y `docs/REQUIREMENTS_STATUS.md`.

---

# 1. Backend — implementado

Supabase central multiusuario con:

- PostgreSQL.
- Auth.
- Row Level Security.
- PostGIS.
- Storage privado `karaka-photos`.
- Edge Functions.
- Realtime disponible.
- Auditoría y trazabilidad de operaciones relevantes.

Tablas operativas principales:

- `clients`
- `employees`
- `route_plans`
- `route_stops`
- `route_sessions`
- `visits`
- `calls`
- `appointments`
- `reception_entries`
- `showroom_sessions`
- `operational_incidents`
- `prospects`
- `notifications`
- `photos`
- `follow_ups`
- `client_management_policies`
- `geo_verification_events`
- `administrative_areas`
- `portfolio_mappings`
- `audit_log`
- `app_settings`
- `catalog_options`
- `companies`
- `import_batches`
- `bootstrap_credentials`

Vistas ejecutivas V0.6.x:

- `client_management_coverage_current`
- `executive_daily_employee_summary`
- `executive_daily_global_summary`
- `executive_activity_timeline`
- `executive_daily_route_metrics`

Vistas geográficas relevantes:

- `client_geo_assessments`
- `geo_intelligence_summary`

---

# 2. Autenticación y permisos — implementado con deuda técnica controlada

Implementado:

- login por nick + contraseña;
- activación/vinculación con Supabase Auth;
- perfiles base:
  - Administrador
  - Supervisor
  - Gestor
  - Vendedor
  - Recepcion
  - SoloLectura
- permisos heredados por perfil;
- `permission_overrides` individuales;
- administración de usuarios vía Edge Function;
- cambio de contraseña desde Configuración;
- recuperación administrada si el canal automático no está disponible.

Riesgo permanente:

- frontend usa `access_profile` + `permission_overrides`;
- RLS sigue dependiendo también de `app_role` y funciones privadas;
- no asumir que ambas capas son equivalentes sin auditoría.

Pendiente futuro:

- auditoría integral de alineación frontend permissions ↔ RLS;
- sesiones administrativas de presencia/login para mostrar usuarios conectados.

---

# 3. Frontend — V0.6.4 funcional

Stack:

- React 19
- TypeScript
- Vite 7
- React Router
- Leaflet / OpenStreetMap
- Recharts
- ExcelJS
- jsPDF

Características generales:

- shell responsive desktop/tablet/móvil;
- sidebar colapsable;
- drawer móvil y bottom navigation;
- temas Karaka/Claro/Oscuro/Ejecutivo;
- color principal configurable;
- versión visible en login/sidebar/PDF;
- PWA productiva;
- Service Worker deshabilitado/limpiado en localhost para evitar caché antigua durante pruebas.

---

# 4. Estado por módulo — mismo orden visual

## Operación

### Inicio — funcional V0.6.4

- KPIs ejecutivos.
- Vendedores y Gestores separados.
- Planificados/visitados/cobertura.
- Distancia GPS estimada.
- Compras/ventas.
- Llamadas/citas/captaciones.
- Rankings por función.
- Excel/PDF.

### Clientes — funcional

- consulta y filtros;
- edición autorizada;
- Vendedor/Gestor;
- CADENA/REGULAR;
- territorio maestro;
- GPS;
- navegación Google Maps;
- asignaciones manuales protegidas.

### Mapa — funcional

- cartera completa paginada;
- filtros comerciales/territoriales;
- maestro vs división oficial;
- 593 áreas oficiales;
- coherencia geográfica;
- zonas;
- navegación.

### Planificación — funcional

- ruta VISITAS;
- tarea CAPTACION;
- vendedor/fecha;
- CADENA/REGULAR;
- Región/Provincia/Municipio/Distrito;
- gestor/empresa/GPS/calidad;
- mapa, polígono y radio;
- disponibilidad;
- orden aproximado por cercanía;
- fecha programada protegida.

### Rutas — funcional V0.6.4

- secuencia y mapa;
- GPS inicio/final;
- visita desde parada;
- Gestor responsable visible;
- Gestor ve sus clientes dentro de rutas del Vendedor;
- eventualidades;
- cobertura real;
- resueltos/cierre operativo;
- cierre normal o parcial;
- motivo obligatorio para pendientes;
- cierre backend transaccional;
- congelación por `ended_at`;
- `REPROGRAMADO` preservado;
- distancia GPS geodésica estimada por tramos.

### Captación — funcional

- asignación por vendedor;
- división oficial;
- rango de fechas;
- objetivos;
- sábado opcional;
- navegación a zona;
- mapa y clientes existentes como referencia;
- prospectos con GPS/fotos;
- asociación prospecto ↔ tarea.

## Gestión

### Cobertura cartera — funcional con mejora prioritaria

Disponible:

- frecuencia mensual de visitas/llamadas;
- metas individuales/masivas;
- estados `CUMPLIDO`, `PENDIENTE`, `SIN_META`;
- filtros;
- jornada libre;
- visita espontánea.

Pendiente V0.6.5:

- separar `Gestionado / No gestionado` de `Cumplido / Pendiente / Sin meta`.

### Visitas — funcional

- una visita abierta por empleado;
- GPS puntual llegada/salida;
- recibido;
- resultado comercial explícito;
- compra/no compra/pendiente;
- monto opcional;
- fotos/evidencias;
- seguimiento/showroom;
- validación geográfica.

### Llamadas — funcional

- CRM de cartera;
- filtros responsables/clientes;
- resultados;
- contacto;
- seguimiento;
- showroom;
- reportería.

### Agenda / Showroom — funcional

- intención;
- validación;
- contacto;
- confirmación/reprogramación;
- llegada;
- atención;
- resultado comercial;
- responsable vs atendido por;
- solicitud preservada aunque falte Gestor.

### Recepción — funcional

- citas;
- walk-ins;
- cliente/prospecto;
- llegada física;
- relación con showroom.

## Inteligencia

### Reportes — funcional V0.6.4

- Reporte Ejecutivo Diario;
- resumen personal;
- cobertura real;
- cierre operativo/resolución;
- jornada;
- atención;
- promedio visita;
- traslado/espera estimado;
- distancia GPS y tramos;
- llamadas/contactos;
- showroom;
- compras/ventas;
- eventualidades;
- cronología;
- Excel/PDF.

### Calidad geográfica — funcional

- 593 áreas oficiales cargadas;
- diagnóstico maestro/coordenada/GPS visita;
- revisión administrativa;
- no autocorrección automática de maestro/coordenadas.

## Sistema

### Administración — funcional con bloque pendiente

Implementado:

- importación `cartera` preview/apply;
- homologación V/G-CARTERA;
- usuarios;
- perfiles/permisos;
- activar/desactivar;
- contraseña administrada.

Pendiente V0.6.5:

- usuarios conectados;
- historial de sesiones;
- login/última actividad/logout;
- duración y estado de sesión.

### Configuración — funcional

- temas;
- color;
- cambio contraseña;
- perfil.

Pendiente externo:

- recuperación automática WhatsApp/OTP requiere proveedor configurado y validación.

---

# 5. Estado de datos auditado

Snapshot 2026-08-25:

- empleados activos: **12**;
- clientes: **1,997**;
- CADENA: **135**;
- REGULAR: **1,862**;
- con GPS: **929**;
- sin GPS: **1,068**;
- áreas oficiales: **593**.

Desglose cartográfico:

- 10 regiones;
- 32 provincias;
- 158 municipios;
- 393 distritos municipales.

---

# 6. Migraciones V0.6.4 aplicadas funcionalmente

Archivos GitHub relacionados:

- `20260824144500_v064_route_closure_and_distance_metrics.sql`
- `20260824151500_v064_operational_visit_day_alignment.sql`
- `20260824153000_v064_align_core_executive_route_day.sql`

Ledger observado en Supabase para esas operaciones:

- `v064_route_closure_and_distance_metrics`
- `v064_operational_visit_day_alignment`
- `v064_align_core_executive_route_day`

No asumir identidad exacta archivo ↔ versión de ledger. Antes de DDL, inspeccionar objetos y ledger real; nunca hacer replay ciego.

---

# 7. Producción

- versión: **0.6.4**;
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`;
- Cloudflare Version ID confirmado: `9ec25487-eee2-432e-8d13-1c0b09c52028`;
- deploy actual: manual mediante Wrangler desde repositorio local sincronizado.

Flujo:

1. rama feature;
2. build/CI;
3. prueba local;
4. PR;
5. validación usuario;
6. merge a `main`;
7. GitHub Desktop Fetch/Pull;
8. `npm run build`;
9. `npm run deploy`;
10. registrar Version ID;
11. actualizar documentación.

---

# 8. Pendientes reales

Prioridad funcional V0.6.5:

1. Cobertura: actividad vs cumplimiento.
2. Sesiones / usuarios conectados.
3. Productividad: % atención, % traslado/espera, visitas por hora.
4. Claridad UX de `Resolución`/`Cierre operativo`.

Pendientes técnicos/futuros:

- distancia vial real mediante motor de rutas;
- WhatsApp OTP;
- code splitting;
- auditoría permissions/RLS;
- CORS restrictivo;
- revisión Storage/SECURITY DEFINER;
- protección formal de `main`;
- lockfile/reproducibilidad si se adopta.
