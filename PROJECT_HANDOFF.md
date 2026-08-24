# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> Memoria permanente de continuidad. Los servicios reales prevalecen sobre este documento. No incluir secretos, tokens, contraseñas, service keys ni variables privadas.

## 1. Identidad y baseline

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`
- Rama de aplicación: `main`
- Versión: `V0.6.0`
- Commit de aplicación confirmado: `2e7638a95ee574825ffadaa8162159bc119d746a`
- Commit: `Merge PR #16: v0.6.0 Inteligencia Operativa Ejecutiva`
- Supabase: V0.6.0 confirmado, proyecto `ACTIVE_HEALTHY`
- Producción: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Version ID productiva: `e317d9c0-458e-4d96-887a-a7f6e60926b9`
- Tráfico: 100 % confirmado
- Referencia de rollback: `c68281bc-2a59-4903-89c3-c1e944a5bb1e`

El commit `2e7638a...` es el baseline del código V0.6.0. Este documento es un cambio únicamente documental posterior.

## 2. Arquitectura y stack

Frontend: React 19, TypeScript, Vite 7, React Router, Leaflet/OSM, Recharts, ExcelJS y jsPDF.

Backend: Supabase PostgreSQL 17, Auth, RLS, Edge Functions, Storage, PostGIS y Realtime disponible.

Hosting: Cloudflare Workers / Static Assets con SPA fallback. Navegación externa mediante Google Maps URLs.

La arquitectura React/TypeScript/Supabase es la base oficial. Aplicaciones monolíticas anteriores tipo `index.html`, incluyendo VisitFlow, pueden servir de referencia pero no deben reemplazarla.

## 3. Rutas y módulos

| Ruta | Módulo |
|---|---|
| `/` | Dashboard |
| `/clientes` | Clientes |
| `/mapa` | Mapa |
| `/planificacion` | Planificación |
| `/rutas` | Rutas |
| `/captacion` | Captación |
| `/cobertura` | Cobertura cartera |
| `/visitas` | Visitas |
| `/llamadas` | Llamadas |
| `/agenda` | Agenda / Showroom |
| `/recepcion` | Recepción |
| `/reportes` | Reportes |
| `/calidad-datos` | Calidad geográfica |
| `/administracion` | Administración |
| `/configuracion` | Configuración |

Archivos sensibles: `src/App.tsx`, `src/context/AuthContext.tsx`, `src/lib/access.ts`, `src/lib/supabase.ts`, `src/pages/Routes.tsx`, `Visits.tsx`, `Agenda.tsx`, `Reports.tsx`, `Admin.tsx`, `wrangler.jsonc`, `package.json`, `supabase/migrations/*`, `supabase/functions/*`.

## 4. Usuarios, perfiles y permisos

Perfiles: `Administrador`, `Supervisor`, `Gestor`, `Vendedor`, `Recepcion`, `SoloLectura`.

Permisos: `dashboard.view`, `clients.view/edit`, `map.view`, `planning.view/manage`, `routes.view/execute`, `capture.view/create`, `coverage.view`, `visits.view/execute`, `calls.view/manage`, `agenda.view/manage`, `reception.view/manage`, `reports.view`, `data_quality.view`, `admin.import`, `admin.portfolio`, `admin.users.manage`, `settings.view`.

Defaults frontend verificados:

- Administrador: todos.
- Supervisor: todos salvo `admin.users.manage` por defecto.
- Gestor: dashboard, clientes, mapa, planificación consulta, rutas consulta, captación consulta/creación, cobertura, visitas consulta/ejecución, llamadas consulta/gestión, agenda consulta/gestión, reportes, configuración.
- Vendedor: dashboard, clientes, mapa, planificación consulta, rutas consulta/ejecución, captación consulta/creación, cobertura, visitas consulta/ejecución, llamadas consulta/gestión, agenda consulta, reportes, configuración.
- Recepcion: dashboard, clientes, agenda consulta/gestión, recepción consulta/gestión, reportes, configuración.
- SoloLectura: dashboard, clientes, mapa, planificación/rutas consulta, cobertura, visitas/llamadas/agenda consulta, reportes, calidad geográfica, configuración.

## 5. access_profile, permission_overrides, app_role y RLS

`access_profile` define el perfil frontend. `permission_overrides` concede o retira permisos individuales. `app_role` es un campo estructural anterior todavía usado en la seguridad SQL. RLS es la autorización efectiva de PostgreSQL.

Mapeo aproximado: Administrador→Administrador; Supervisor→Supervisor; Gestor/Vendedor→Usuario; Recepcion→Recepcionista; SoloLectura→SoloLectura.

Funciones relevantes: `private.current_employee_id()`, `private.is_admin()`, `private.can_manage_employee()`, `private.employee_has_permission()`, `private.current_user_has_permission()`.

Riesgo ALTO: el frontend usa `access_profile + permission_overrides`, pero muchas RLS/RPC siguen basándose en `app_role/private.is_admin()`. No asumir equivalencia ni cambiar una sola capa de forma aislada.

Snapshot: 11 empleados activos, 4 enlazados a Auth y 0 con overrides no vacíos. Reconsultar cuando sea relevante.

## 6. Modelo de datos principal

Relación conceptual:

```text
employees
 ├─ clients.vendor_employee_id / manager_employee_id
 ├─ route_plans → route_stops → visits
 ├─ route_sessions → operational_incidents
 ├─ calls
 ├─ appointments → reception_entries → showroom_sessions
 └─ prospects
```

Tablas principales: `administrative_areas`, `app_settings`, `appointments`, `audit_log`, `bootstrap_credentials`, `calls`, `catalog_options`, `client_management_policies`, `client_visit_windows`, `clients`, `companies`, `daily_snapshots`, `employees`, `follow_ups`, `geo_verification_events`, `import_batches`, `notifications`, `operational_incidents`, `photos`, `portfolio_mappings`, `prospects`, `reception_entries`, `route_plans`, `route_sessions`, `route_stops`, `showroom_sessions`, `territories`, `visits`.

Vistas: `client_geo_assessments`, `client_management_coverage_current`, `daily_employee_summary`, `daily_global_summary`, `executive_activity_timeline`, `executive_daily_employee_summary`, `executive_daily_global_summary`, `geo_intelligence_summary`, `geo_quality_summary`. Las vistas verificadas usan `security_invoker=true`.

## 7. Supabase, Edge Functions, Storage y V6

Supabase verificado: PostgreSQL 17.6.1, región observada `ca-central-1`, estado `ACTIVE_HEALTHY`.

Edge Functions activas (snapshot): `login-by-username` v2, `master-import` v3, `admin-users` v3, `request-password-reset` v1, `verify-password-reset` v2.

Storage: bucket privado `karaka-photos`, límite 10 MB, JPEG/PNG/WebP/HEIC/HEIF. Riesgo pendiente: lectura actualmente amplia para usuarios autenticados.

Migraciones V6 confirmadas en producción:

- `20260823235002 executive_operations_and_route_incidents`
- `20260824000400 refine_executive_live_timing`

No reaplicarlas ciegamente.

## 8. Historial de migraciones GitHub ↔ Supabase

NO asumir ledger 1:1. Antes de cualquier cambio SQL consultar `supabase_migrations.schema_migrations`, objetos reales, columnas, constraints, funciones, vistas y RLS; comparar con GitHub; establecer baseline y crear solo migración incremental. No ejecutar replay masivo ni `db push` ciego.

## 9. Reglas de negocio críticas

- Supabase es la persistencia central multiusuario; no depender de `localStorage` operacional.
- Importación oficial: preservar `V-CARTERA` y `G-CARTERA` y proteger asignaciones manuales.
- Nunca autocorregir territorio maestro solo por discrepancia GPS; cualquiera de los dos lados puede estar errado. Usar observación/revisión/aprobación.
- No hay tracking GPS continuo obligatorio; registrar puntos operativos relevantes.
- Una sola visita abierta por empleado; no eliminar la protección.
- No cerrar ruta con visita abierta, eventualidad activa o paradas pendientes no justificadas.

## 10. Reporte Ejecutivo V0.6.0

Implementado en `src/pages/Reports.tsx` con `executive_daily_employee_summary`, `executive_daily_global_summary` y `executive_activity_timeline`.

Integra clientes planificados/visitados, recibidos, llamadas, contacto, showroom, compras calle/showroom, ventas, tiempos de visita, llamadas estimadas, traslado/espera estimado, eventualidades, cronología, utilización y cumplimiento.

Estimaciones de llamadas sin duración real: `NO_CONTESTA` 90 s, `OCUPADO` 45 s, `TELEFONO_INCORRECTO` 60 s, otros 300 s. Visitas/showroom/eventualidades usan marcas reales cuando existen. Las categorías pueden solaparse; no sumarlas ciegamente como horas independientes.

Producción V0.6.0 validada visualmente en `/reportes`: detalle por empleado, cronología, llamadas `EST.`, showroom, compra/venta y botones Excel/PDF visibles.

Riesgo ALTO: la UI restringe el reporte global a dirección, pero varias tablas base mantienen SELECT amplio para `authenticated`; la confidencialidad debe reforzarse posteriormente en la capa de datos.

## 11. Evelyn / Gestor / “Mis clientes en ruta”

No hard-codear Evelyn. La regla es genérica para `employee_type = Gestor` y usa `clients.manager_employee_id`.

Un Gestor ve solo rutas que contienen clientes de su gestión y dentro de ellas solo esos clientes, además del Vendedor responsable. El Vendedor puede ver el Gestor del cliente. Mantener la visibilidad Gestor ↔ Vendedor.

Snapshot de validación anterior: una ruta de Cesar Caba tenía 10 paradas, 2 correspondientes a la gestión de Evelyn Ochoa. Es solo evidencia de prueba, nunca configuración fija.

## 12. Agenda, Recepción y Showroom

Flujo: intención/solicitud → pendiente de validación → contacto → confirmación/reprogramación → llegada → atención → resultado → fin atención → salida.

Estados incluyen `PENDIENTE_VALIDACION`, `CONTACTANDO`, `PROGRAMADA`, `CONFIRMADA`, `REPROGRAMADA`, `NO_CONFIRMADA`, `CANCELADA`, `ASISTIO`, `NO_ASISTIO`, `FINALIZADA`.

Una intención no debe convertirse automáticamente en cita confirmada.

Recepción distingue check-in, inicio de atención, fin de atención y check-out.

`manager_employee_id` es responsable asignado y `attended_by_employee_id` quien realmente atendió. Mantener esta diferencia para atribución de tiempo y ventas.

## 13. Resultado comercial

Visitas requieren selección explícita: `COMPRO`, `NO_COMPRO`, `PENDIENTE`. No iniciar por defecto en “No compró”.

`purchase_amount` es opcional: permitir compra sin monto cuando no se conoce. No convertir null en RD$0 como si fuese un monto confirmado.

Showroom conserva resultado, `purchased`, `purchase_amount`, responsable real, próxima acción y seguimiento.

## 14. Eventualidades de ruta

Tabla `operational_incidents`. Impactos: `SIN_IMPACTO`, `RETRASO`, `SUSPENDE_RUTA`, `FINALIZA_JORNADA`.

Registra empleado, sesión, tipo, inicio/fin, descripción, GPS/precisión, impacto, estado y evidencia opcional. Una eventualidad activa bloquea cierre normal. Eventos graves pueden justificar paradas restantes como `NO_VISITADO` por `EVENTUALIDAD`, nunca como visitadas.

El Reporte Ejecutivo separa tiempo de eventualidad de visita, showroom, llamadas y traslado.

Estado de prueba actual: `operational_incidents` sigue con 0 registros. Código/base/reporte implementados; E2E real pendiente.

## 15. Deployment y Cloudflare

`wrangler.jsonc` actual: worker `gestion-de-ventas-diaria`, `compatibility_date = 2026-08-18`, SPA fallback. Wrangler usa configuración redirigida generada bajo `dist/wrangler.json` durante deploy.

Deployment V0.6.0 ejecutado manualmente desde copia local cuyo Git HEAD era `2e7638a95ee574825ffadaa8162159bc119d746a` mediante `npm run deploy`.

Producción confirmada:

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Version ID: `e317d9c0-458e-4d96-887a-a7f6e60926b9`
- tráfico: 100 %
- rollback de referencia: `c68281bc-2a59-4903-89c3-c1e944a5bb1e`

Cloudflare Version ID no es Git SHA; la relación con `2e7638a...` se conoce porque el deploy manual se hizo desde ese HEAD verificado.

## 16. Discrepancias pendientes

1. **`package-lock.json` local no versionado.** GitHub Desktop mostró ese archivo como único cambio local y `main` no lo contiene. El build productivo se realizó después de operaciones npm y Vite local reportó 7.3.6. La reproducción exacta del grafo de dependencias no está garantizada hasta decidir estrategia de lockfile. No hacer commit ni descartarlo automáticamente.
2. **Cloudflare Git integration/autodeploy no verificado.** El deploy V0.6.0 fue manual. Antes de fusionar cambios documentales a `main`, confirmar si un commit en `main` puede provocar otro deploy automático.
3. **Permisos híbridos:** frontend vs RLS/app_role.
4. **Reporte Ejecutivo:** aislamiento global todavía principalmente frontend.
5. **Migraciones:** GitHub y Supabase no son necesariamente ledger idéntico.
6. **Documentación histórica:** README/CHANGELOG/checklist pueden estar parcialmente desactualizados.

## 17. Riesgos conocidos

### Alta
- alineación `access_profile + permission_overrides` ↔ `app_role/RLS`;
- aislamiento del Reporte Ejecutivo;
- baseline de migraciones;
- autodeploy Cloudflare desde `main` no verificado.

### Media
- lockfile/reproducibilidad;
- eventualidades sin E2E;
- Storage legible ampliamente por autenticados;
- leaked-password protection desactivada;
- grants de funciones SECURITY DEFINER;
- usuarios aún no enlazados a Auth según snapshot;
- `main` sin protección durante auditoría;
- CORS efectivo no certificado.

## 18. Funcionalidades terminadas / confirmadas

Arquitectura modular; login por nick/Auth; usuarios/perfiles; clientes; mapa; planificación; rutas; GPS puntual; visitas; resultado comercial; compra/no compra/pendiente; monto opcional; evidencias; captación; llamadas; cobertura; agenda; recepción; showroom; gestor real de atención; calidad geográfica; importación/homologación; Reporte Ejecutivo V0.6.0; resumen por empleado/global; cronología; “Mis clientes en ruta”; Gestor↔Vendedor; Excel/PDF; código/base de eventualidades; deployment V0.6.0 productivo validado.

## 19. Implementado pero pendiente de prueba completa

- eventualidad E2E persistida;
- login real como Gestor/Evelyn y validación completa de “Mis clientes en ruta”;
- jornada integral ruta + visitas + llamadas + showroom + compra + eventualidad + reporte;
- exportaciones con jornada real completa;
- overrides sensibles después de alinear RLS;
- piloto multidispositivo completo.

## 20. Pendientes actuales

1. Confirmar autodeploy Cloudflare desde `main`.
2. Decidir estrategia `package-lock.json`.
3. E2E de eventualidades.
4. E2E Gestor/Evelyn.
5. Validación PC/móvil.
6. Diseñar unificación de permisos frontend/RLS.
7. Endurecer Reporte Ejecutivo en DB.
8. Baseline formal de migraciones.
9. Revisar privacidad Storage, SECURITY DEFINER, leaked passwords y CORS.
10. Actualizar documentación histórica separadamente.

## 21. Decisiones que NO deben revertirse

- no volver a arquitectura monolítica;
- Supabase como backend central;
- no usar localStorage como persistencia compartida;
- no autocorregir geografía por GPS;
- preservar `V-CARTERA`/`G-CARTERA`;
- proteger asignaciones manuales;
- una sola visita abierta;
- llegada/salida separadas;
- resultado comercial explícito;
- mantener Compró/No compró/Pendiente;
- monto opcional;
- gestor asignado ≠ gestor real;
- no hard-codear Evelyn;
- mantener Gestor↔Vendedor;
- eventualidades separadas de atención/traslado;
- identificar tiempos estimados;
- no sumar tiempos superpuestos ciegamente;
- no reaplicar migraciones antiguas;
- no exponer service keys;
- no desplegar sin versión objetivo y rollback;
- no cambiar permisos/RLS de forma aislada;
- conservar auditoría.

## 22. Protocolo obligatorio para futuros chats

1. Leer este archivo completo.
2. Verificar repo, `main`, HEAD, commits recientes, PRs y `package.json`.
3. Verificar Supabase real: proyecto, tablas, columnas, constraints, RLS, funciones, vistas, Edge Functions, migraciones y Storage cuando aplique.
4. Verificar Cloudflare: `wrangler whoami`, deployments/versions, Version ID con tráfico, URL y rollback.
5. Si hay discrepancia, los servicios reales prevalecen; documentarla, no inventar solución.
6. Antes de modificar, identificar reglas, tablas, permisos, usuarios y riesgos afectados.
7. Trabajar incrementalmente desde `main` real; preferir rama/PR.
8. No ejecutar DDL/migraciones sin baseline remoto.
9. Tratar cambios de permisos como cambios de seguridad.
10. Validar TypeScript y `npm run build`.
11. No ejecutar `npm run deploy`/`wrangler deploy` sin intención explícita y rollback identificado.
12. Actualizar este handoff después de merges, migraciones, cambios de seguridad, Edge Functions o deployments importantes.

## 23. Ante pérdida del contexto del chat

Abrir nuevo chat, indicar continuación de `Gestion_de_Ventas_Diaria`, leer este handoff, verificar GitHub/Supabase/Cloudflare, resolver discrepancias y solo entonces programar.

## 24. Último trabajo confirmado y siguiente paso

Último bloque: **V0.6.0 — Inteligencia Operativa Ejecutiva**. Código baseline `2e7638a95ee574825ffadaa8162159bc119d746a`. Producción Cloudflare `e317d9c0-458e-4d96-887a-a7f6e60926b9`, 100 % tráfico, `/reportes` validado.

Siguiente orden recomendado: confirmar autodeploy de `main`, resolver estrategia de lockfile, completar E2E V0.6.0 y luego diseñar alineación de permisos/RLS y endurecimiento del Reporte Ejecutivo.

## 25. Regla final

La pregunta correcta al retomar el proyecto es: **“¿Cuál es el estado real actual de GitHub, Supabase y Cloudflare, y cómo se compara con `PROJECT_HANDOFF.md`?”** Solo después debe continuar el desarrollo.
