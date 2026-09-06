# Continuación actual — Gestión de Ventas Diaria

Fecha del checkpoint: **06/09/2026 (RD)**

> **LEER PRIMERO EN UN CHAT NUEVO.** GitHub `main`, Supabase y Cloudflare son la fuente de verdad. No asumir estado por conversaciones anteriores si contradice los servicios reales.

## Estado productivo

- Repo: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión desplegada y validada: **0.6.5-beta.12.2.8**.
- Merge funcional PR #55: `247c7a6d9c749f33f5045b2388d0947f3c8efabd`.
- Cloudflare URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Producción fue validada en incógnito después de transferir Supabase; Login e Inicio cargaron correctamente y mostraron 1,997 clientes.

## Supabase

El 06/09/2026 el **mismo proyecto** `Gestion de Ventas Diaria` fue transferido administrativamente a una organización Supabase separada para aislarlo del Egress de otro proyecto.

No fue clonado ni recreado.

Datos que permanecen iguales:

- Project Ref: `ccvzosnhxitfeochnflr`.
- API URL: `https://ccvzosnhxitfeochnflr.supabase.co`.
- Región: AWS `ca-central-1`.
- Base de datos, Auth, RLS, Storage y Edge Functions permanecen en el mismo proyecto.
- Cloudflare no fue movido ni requiere cambio por esta transferencia.

Integridad PRE/POST validada con conteos idénticos:

- clients 1,997;
- employees 12;
- auth users 8;
- route_plans 16;
- route_stops 160;
- route_sessions 4;
- visits 11;
- calls 28;
- appointments 7;
- follow_ups 11;
- showroom_sessions 1;
- reception_entries 1;
- prospects 1;
- audit_log 4,733;
- storage objects 2;
- database size `167865491` bytes.

Edge Functions confirmadas ACTIVE:

- `login-by-username` v2;
- `master-import` v3;
- `admin-users` v3;
- `request-password-reset` v1;
- `verify-password-reset` v2.

Ver detalle completo en `docs/SUPABASE_TRANSFER_2026-09-06.md`.

## Usage / Egress

Antes de la transferencia la organización antigua mostraba aproximadamente `10.494 GB / 5 GB` de Egress.

Desglose confirmado:

- Gestión de Ventas Diaria: ~`0.166 GB`.
- Otro proyecto: ~`10.328 GB`.

Por tanto Gestión de Ventas no era el origen del exceso. En la nueva organización el panel mostró inicialmente Egress `0 / 5 GB` y Database Size ~`183 / 500 MB`. Monitorear Usage durante operación real.

## Datos siguen siendo TEST

**No se ha declarado todavía Go-Live de negocio.**

Hasta declaración explícita del usuario:

- no limpiar datos operativos;
- no borrar histórico;
- no asumir que nuevos registros son reales;
- no modificar RLS/Auth por inferencia.

Último snapshot operativo conocido:

- 12 empleados activos;
- 8 con Auth;
- 4 Gestores todavía sin `auth_user_id`, con bootstrap válido no usado;
- 0 route sessions abiertas;
- 0 visitas abiertas;
- 12 planificaciones pasadas todavía `PLANIFICADA`;
- 0 planificaciones para 07/09/2026 en la última auditoría;
- 0 citas para 07/09/2026;
- 0 follow-ups para 07/09/2026.

## Cartera

- 1,997 clientes.
- 135 CADENA.
- 1,862 REGULAR.
- 929 con GPS.
- 1,068 sin GPS.
- 640 con Vendedor asignado.
- 1,357 sin Vendedor asignado.
- 956 con Gestor asignado.
- 1,041 sin Gestor asignado.
- 555 con Vendedor asignado + GPS; es la base de mayor calidad para rutas iniciales de Vendedor.

No presentar toda la cartera como completamente distribuida si las asignaciones reales no están completas.

## Seguridad / RLS

Hallazgo pendiente de decisión:

- frontend controla módulos mediante `access_profile` y permisos;
- escrituras críticas principales están protegidas en backend;
- varias tablas base permiten SELECT amplio a `authenticated` mediante `qual = true`.

Decidir después de la salida inicial o antes si el negocio lo exige:

A. lectura global autenticada es aceptable y frontend organiza UX; o
B. aislamiento backend por cartera/actividad es obligatorio, requiriendo migración incremental y QA completo.

No hacer refactor masivo de RLS a última hora sin ventana y pruebas.

Otros pendientes:

- protección formal de `main`;
- CORS Edge Functions;
- hardening SECURITY DEFINER/grants;
- Leaked Password Protection;
- proceso administrativo de reset mientras recuperación automática esté deshabilitada.

## Comportamiento de producto a preservar

### Route ordering

- `Cercanos primero` / `Lejanos primero`;
- origen reproducible;
- `route_stops.stop_order` conserva secuencia.

### Tour interactivo

- recorrido funcional no destructivo;
- versión beta.12.2.7 quedó integrada antes de beta.12.2.8.

### Tracking beta.12.2.8

- Auto 30s OFF por defecto;
- refresh manual;
- auto opcional y controlado;
- conserva datos ante error de refresh;
- no describir como GPS continuo de fondo;
- trayectoria = estimación entre eventos GPS registrados.

## Orden de ejecución desde este checkpoint

1. Mantener feature freeze salvo P0.
2. Cerrar/mergear este bloque documental.
3. Generar backup/exportación antes de cualquier limpieza TEST.
4. Definir limpieza exacta y dependency-safe.
5. Obtener aprobación explícita del usuario antes de borrar TEST.
6. Resolver planificaciones TEST antiguas.
7. Probar/activar 4 Gestores pendientes de Auth.
8. Crear rutas reales del lunes 07/09/2026.
9. E2E Admin + Vendedor + Gestor.
10. Revisar Supabase Usage nueva organización y Cloudflare.
11. Decisión formal GO/NO-GO.
12. Registrar hora de declaración de Go-Live; solo desde ese momento tratar nuevos registros como REALES.

Ver checklist detallado en `docs/GO_LIVE_2026-09-07_CHECKLIST.md`.

## Limpieza TEST — preservar vs candidatos

Preservar por defecto:

- clients;
- employees;
- companies;
- geografía/catálogos;
- settings;
- portfolio mappings aprobados;
- políticas de gestión aprobadas.

Candidatos operativos a limpiar solo con backup + aprobación:

- route_plans/stops/sessions;
- visits;
- calls;
- appointments;
- showroom/reception;
- prospects TEST;
- follow_ups TEST;
- notifications;
- operational_incidents TEST;
- fotos/evidencias TEST.

No purgar a ciegas `audit_log` ni `import_batches`.

## Workflow obligatorio

- verificar `main` antes de cualquier escritura;
- feature/docs branch;
- PR;
- revisar diff;
- CI verde;
- merge aprobado;
- usuario usa GitHub Desktop para Fetch/Pull;
- confirmar `main` y `0 changed files` antes de build/deploy.

En Windows del usuario `git` CLI no está en PATH; no dar instrucciones basadas en `git` CLI.

## Documentos que debe leer un chat nuevo

1. **`docs/CHAT_CONTINUATION_CURRENT.md`** — este documento.
2. `docs/GO_LIVE_2026-09-07_CHECKLIST.md`.
3. `docs/SUPABASE_TRANSFER_2026-09-06.md`.
4. `docs/DOCUMENTATION_STATUS_2026-09-06.md`.
5. GitHub `main` real.
6. Supabase real.
7. Cloudflare real.
8. `PROJECT_HANDOFF.md` solo como contexto histórico.

Los documentos antiguos `CHAT_CONTINUATION_2026-08-30.md`, `REQUIREMENTS_STATUS.md`, `IMPLEMENTATION_STATUS.md` y parte de `DEPLOYMENT_CHECKLIST.md` contienen información útil, pero sus cabeceras/baselines están desactualizados. No deben prevalecer sobre este checkpoint y los servicios reales.

## Regla final

> Si existe discrepancia, verificar primero. GitHub `main` + Supabase + Cloudflare prevalecen. No repetir migraciones, no limpiar datos y no modificar seguridad solo por memoria del chat.
