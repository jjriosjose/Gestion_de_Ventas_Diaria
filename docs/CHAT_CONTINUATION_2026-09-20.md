# Continuación 2026-09-20 — Gestión de Ventas Diaria

Fecha: **20/09/2026 (RD)**

> **Checkpoint maestro de continuidad.** En cualquier chat nuevo leer primero `docs/CHAT_CONTINUATION_CURRENT.md` y luego este archivo. GitHub `main`, Supabase vivo y Cloudflare productivo prevalecen sobre cualquier conversación o documento anterior.

## 1. Estado vivo confirmado

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Después de reconciliar el PR #67 el 20/09/2026:

- baseline de código/runtime 16.3.9: `df3c6836c5113896ecebfb228101af48b323a80b` (HEAD puede avanzar por commits documentales)
- `package.json`: **0.6.5-beta.16.3.9**
- PR #67: **MERGED**
- título: `beta16.3.9 report sales charts`
- commit feature validado en producción antes del merge: `54c1faeac772e3e816554ba175f17227733a8363`

Cloudflare productivo:

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- versión visible/validada: **0.6.5-beta.16.3.9**
- Current Version ID: `96bfb579-8ed2-47cb-8029-15ef67fed492`

**No desplegar nuevamente solo por el merge del PR #67.** El frontend 16.3.9 ya fue desplegado y validado por el usuario antes de reconciliar `main`.

### Lockfile

`package-lock.json` fue sincronizado a **0.6.5-beta.16.3.9** mediante PR #69. Solo cambiaron 2 líneas de metadata; no cambiaron dependencias. Build validation #1083: **SUCCESS**.

## 2. Validación productiva 16.3.8 / 16.3.9

### 16.3.8 — validado por usuario en producción

1. Gestor pudo cerrar atención de Showroom registrando monto.
2. Recepción → Gestor mostró alerta en tiempo real.
3. Gestor pudo visualizar el Reporte Ejecutivo completo sin recibir privilegios de Administrador.

Cambios de backend ya aplicados en Supabase:

- `20260917162843_showroom_manager_close_amount_and_realtime_notifications`
- `20260917163206_gestor_full_executive_reports`

Regla Showroom vigente:

- Gestor asignado puede registrar `purchase_amount` **solo durante el cierre original de su sesión abierta**.
- después del cierre, modificar el monto sigue siendo operación administrativa.
- Recepción controla llegada/espera/salida física; Gestor controla resultado comercial.

### 16.3.9 — validado por usuario en producción

Reportes muestra correctamente:

- Ventas por día por Calle / Llamadas / Showroom.
- Compras por día por canal.
- Actividad de calle usando visitas reales.
- Actividad CRM por día corregida.
- Cobertura y Contactabilidad.
- tablas de Vendedores y Gestores.
- detalle diario.
- exportaciones Excel/PDF.

## 3. Supabase productivo

Proyecto:

- nombre: `Gestion de Ventas Diaria`
- ref: `ccvzosnhxitfeochnflr`
- región: `ca-central-1`
- estado: **ACTIVE_HEALTHY**
- PostgreSQL: 17
- organización: plan **Free**

Uso medido 20/09/2026:

- base de datos: **164 MB**
- Storage: **14 MB / 18 objetos**
- usuarios Auth: **13**
- 13 usuarios con login dentro de 30 días.
- ramas de desarrollo Supabase: **0**
- Edge Functions activas: **6**

Tablas operativas principales incluyen Clientes, Rutas, Jornadas, Visitas, Llamadas, Agenda/Showroom, Recepción, Notificaciones y TMS/Logística.

### Storage

- `karaka-photos`: ~14 MB / 8 objetos.
- `delivery-evidence`: ~160 kB / 10 objetos.

### Tablas de mayor tamaño

- `audit_log`: ~101 MB.
- `administrative_areas`: ~32 MB.
- `clients`: ~5.2 MB.

El gran crecimiento de auditoría ocurrió principalmente el 23/08 por snapshots geográficos voluminosos. En los 14 días recientes medidos, el payload nuevo de auditoría fue ~846 kB.

## 4. Decisión actual Free vs Pro

**No es urgente pagar Supabase Pro por capacidad durante desarrollo/QA.**

Motivos:

- DB ~33% del límite Free de 500 MB.
- Storage ~1.4% del límite Free de 1 GB.
- 13 usuarios están muy por debajo del límite Auth.
- uso actual de Edge Functions y Realtime no muestra presión.

Regla operativa acordada:

- continuar Free durante desarrollo/hardening;
- revisar semanalmente DB, Storage y Egress;
- considerar upgrade antes de aproximarse a ~350–400 MB DB o ~600–700 MB Storage;
- **antes de Go-Live real pasar a Pro** por backups diarios, continuidad y mayor margen operativo.

El indicador de Egress mensual exacto debe revisarse desde el panel de Usage de Supabase porque no está expuesto por las herramientas actuales.

## 5. Hallazgos P0/P1 de auditoría técnica

### P0/P1 — continuidad / DevOps

- Producción 16.3.9 estaba adelantada respecto a `main`; **corregido el 20/09 al mergear PR #67**.
- `main` continúa sin branch protection.
- deploy Cloudflare confirmado es manual mediante Wrangler.
- no existe staging de Supabase; localhost consume backend productivo si usa las variables actuales.
- no existen pruebas automatizadas suficientes; CI histórico valida principalmente build.

### P0/P1 — reproducibilidad de base

Auditoría detectó diferencia entre migraciones registradas en Supabase y archivos SQL versionados en GitHub.

Dato confirmado anteriormente:

- Supabase registraba 70 migraciones.
- repositorio contenía 64 archivos SQL de migración.
- al menos `20260916234943_protect_showroom_purchase_amount_admin_only` estaba en historial remoto y no como archivo equivalente en GitHub.

La migración posterior 20260917162843 reemplaza la función, pero depende de la existencia del trigger creado previamente. **Antes de considerar disaster recovery válido se debe reconstruir una base vacía desde GitHub y comparar esquema.**

No hacer replay manual ciego sobre producción.

### P1 — seguridad

Supabase Advisors vigentes 20/09/2026:

- 4 vistas `SECURITY DEFINER` de Tracking reportadas como ERROR.
- 5 funciones `SECURITY DEFINER` ejecutables por `anon` reportadas como WARN.
- 7 funciones `SECURITY DEFINER` ejecutables por authenticated reportadas como WARN.
- 2 funciones privadas con `search_path` mutable.
- leaked password protection deshabilitado.
- RLS de lectura de varias tablas es demasiado amplio para un producto enterprise.
- Storage de fotos requiere endurecimiento por propietario/rol.

No hacer un refactor masivo sin pruebas por rol.

### P1 — integridad funcional

- Showroom simultáneo puede sobrecontar horas del Gestor. Ejemplo auditado 16/09: ~917 min sumados vs ~328 min reales por superposición; ~589 min de sobreconteo.
- no existe todavía una entidad canónica única de Venta; llamadas/visitas/showroom pueden representar touchpoints de una misma operación.
- cierre Showroom hoy usa múltiples escrituras y debe migrar a RPC transaccional.
- cierre Visita + fotos + cita también requiere diseño transaccional/reintentos.
- importación maestra procesa lotes y puede quedar parcialmente aplicada si falla a mitad.

### P1/P2 — rendimiento

- `audit_log` ~101 MB para ~5.3k filas por snapshots grandes.
- inteligencia geográfica fue el hotspot de consulta observado (~1.3–1.5 s promedio en queries relevantes).
- Performance Advisor reporta 44 foreign keys sin índice y 47 índices no usados; **no crear/eliminar índices en masa sin EXPLAIN/estadísticas**.
- bundle frontend necesita code splitting a futuro.
- source maps de producción deben revisarse antes de Go-Live.

## 6. TMS / Logística — estado real

Módulo productivo existente:

- Despacho y entregas.
- importación Excel / captura manual.
- agrupación Documento → Parada → Viaje.
- viajes y detalle de paradas.
- Torre de Control con mapa.
- corrección/gobierno de GPS.
- Historial / POD.
- incidencias.
- acceso seguro de chofer.
- proveedores, choferes y vehículos.
- evidencia de entrega.

Datos actuales continúan siendo de prueba.

## 7. Reglas críticas que NO se deben romper

1. Todos los datos actuales siguen siendo **TEST** hasta que el usuario declare explícitamente Go-Live.
2. No limpiar data de pruebas sin backup, plan y autorización específica.
3. No modificar/recrear la Jornada Libre histórica de Rendy Mejias reparada el 16/09.
4. No otorgar Admin a Gestores para habilitar Reportes.
5. No inferir venta monetaria solo por intención `Realizar compra`.
6. No introducir GPS continuo/polling masivo sin decisión explícita.
7. GitHub `main`, Supabase vivo y Cloudflare real son fuente de verdad.
8. Cambios normales: rama feature → CI/build → **QA local obligatorio** → PR → aprobación → merge → deploy → QA productivo.
9. La excepción de 16.3.9, donde el usuario autorizó saltar QA local, no cambia la regla general.
10. No hacer cambios de seguridad/RLS en producción sin pruebas por rol.

## 8. Orden recomendado de ejecución desde este checkpoint

### Fase 0 — continuidad y fuente de verdad

- [x] Reconciliar PR #67 con `main`.
- [x] Crear checkpoint documental 20/09.
- [x] Sincronizar `package-lock.json` con 16.3.9.
- [x] Build validation #1083 SUCCESS para la sincronización del lockfile.
- [x] Mergear checkpoint documental inicial (#68).
- [x] Inventario read-only de migraciones GitHub ↔ Supabase; ver `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md`.

### Fase 1 — reproducibilidad / staging

- auditar migraciones GitHub vs Supabase.
- generar matriz de diferencias.
- diseñar prueba de reconstrucción en entorno no productivo.
- definir staging separado antes de pruebas destructivas.

### Fase 2 — security hardening

- RLS de lectura por rol.
- Storage fotos/evidencias.
- revisar SECURITY DEFINER.
- permissions backend alineados con `hasPermission`.
- leaked-password protection / política de contraseñas.
- branch protection GitHub.

### Fase 3 — integridad transaccional

- RPC de cierre Showroom.
- RPC de cierre Visita.
- staging/atomicidad de importación.
- state machine logística idempotente.

### Fase 4 — modelo comercial y Showroom

- venta canónica + touchpoints.
- modelo de atención grupal Showroom.
- tiempo de Gestor sin doble conteo.

### Fase 5 — performance

- audit_log geometry strategy / retención.
- optimización materializada de inteligencia geográfica.
- índices basados en evidencia.
- code splitting / lazy routes.

## 9. Inicio de cualquier nuevo chat

Pegar:

> Continúa el proyecto Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee COMPLETO primero `docs/CHAT_CONTINUATION_CURRENT.md` y luego `docs/CHAT_CONTINUATION_2026-09-20.md`. GitHub main, Supabase vivo y Cloudflare son la fuente de verdad. Antes de cambiar código, verifica versión, SHA de main, CI, migraciones y producción. No modifiques ni limpies datos reales/pruebas sin autorización. Resume primero el estado P0/P1 y el siguiente paso exacto.

