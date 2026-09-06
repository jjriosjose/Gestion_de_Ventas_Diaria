# Go-Live — Checklist 07/09/2026

Fecha de preparación: **06/09/2026 (RD)**

> Este checklist controla el paso de datos TEST a operación real. No ejecutar acciones destructivas ni declarar Go-Live por inferencia. El usuario debe aprobar explícitamente la limpieza TEST y declarar cuándo comienza la operación real.

## 0. Baseline que debe permanecer intacto

- Frontend productivo: `0.6.5-beta.12.2.8`.
- GitHub funcional baseline: merge PR #55, SHA `247c7a6d9c749f33f5045b2388d0947f3c8efabd`.
- Cloudflare URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Supabase Project Ref: `ccvzosnhxitfeochnflr`.
- Supabase fue transferido administrativamente a una organización separada el 06/09/2026 sin cambiar infraestructura.
- No hay cambio de Cloudflare requerido por esa transferencia.

## 1. Feature freeze

Estado objetivo antes de continuar:

- [ ] No agregar nuevas funcionalidades antes del Go-Live salvo blocker P0.
- [ ] No cambiar Auth/RLS/CORS/Tracking a última hora sin QA dedicado.
- [ ] No actualizar Postgres por el simple hecho de que Supabase ofrezca una versión más nueva.
- [ ] No recrear Edge Functions ni cambiar API keys por la transferencia de organización.

## 2. Respaldo antes de limpiar TEST — GATE ROJO

No limpiar nada hasta completar:

- [ ] Snapshot de conteos principales.
- [ ] Exportación lógica de las tablas maestras y operativas relevantes.
- [ ] Copia/registro de objetos Storage TEST que se decida conservar o eliminar.
- [ ] Registrar fecha/hora del backup y responsable.
- [ ] Verificar que el backup pueda descargarse/abrirse.

Si no existe respaldo verificable: **NO-GO para limpieza TEST**.

## 3. Maestros a preservar

No borrar salvo decisión explícita y documentada:

- [ ] `clients` — 1,997 registros en el snapshot previo.
- [ ] `employees` — 12 activos en el snapshot previo.
- [ ] `companies`.
- [ ] geografía oficial y catálogos.
- [ ] `app_settings` y configuraciones aprobadas.
- [ ] `portfolio_mappings` aprobados.
- [ ] políticas de gestión/visita aprobadas.
- [ ] estructuras RLS, funciones, vistas y migraciones.

## 4. Datos TEST candidatos a limpiar

Solo después de backup + aprobación explícita:

- [ ] `route_plans` TEST.
- [ ] `route_stops` TEST.
- [ ] `route_sessions` TEST.
- [ ] `visits` TEST.
- [ ] `calls` TEST.
- [ ] `appointments` TEST.
- [ ] `showroom_sessions` TEST.
- [ ] `reception_entries` TEST.
- [ ] `prospects` TEST.
- [ ] `follow_ups` TEST.
- [ ] `notifications` TEST.
- [ ] `operational_incidents` TEST.
- [ ] fotos/evidencias TEST identificadas.

No purgar a ciegas:

- `audit_log`;
- `import_batches`.

Tratar auditoría/importaciones como trazabilidad separada.

## 5. Estado operativo previo conocido

Última auditoría antes de este checklist:

- 12 empleados activos.
- 8 con `auth_user_id`.
- 4 sin `auth_user_id`, todos Gestores, con bootstrap válido no usado.
- 0 route sessions abiertas.
- 0 visitas abiertas.
- 12 planificaciones pasadas aún `PLANIFICADA`.
- 0 planificaciones para 07/09/2026.
- 0 citas para 07/09/2026.
- 0 follow-ups para 07/09/2026.

Reconsultar antes de limpiar; estos valores pueden cambiar.

## 6. Usuarios y acceso — GATE

Antes del lanzamiento:

- [ ] Admin puede iniciar sesión en incógnito.
- [ ] Al menos un Vendedor real inicia sesión.
- [ ] Al menos un Gestor real inicia sesión.
- [ ] Resolver/probar los 4 Gestores pendientes de bootstrap.
- [ ] Verificar perfiles visibles y permisos esperados.
- [ ] Documentar proceso administrativo de cambio/reset de contraseña mientras recuperación automática esté deshabilitada.

No cambiar masivamente permisos el día del Go-Live sin necesidad.

## 7. Cartera para primera operación

Snapshot conocido:

- 1,997 clientes totales.
- 640 con Vendedor asignado.
- 956 con Gestor asignado.
- 929 con GPS.
- 555 con Vendedor asignado + GPS.

Regla:

> No presentar los 1,997 clientes como completamente distribuidos si la asignación real no está completa.

Para rutas iniciales priorizar cartera efectivamente asignada y, cuando aplique, georreferenciada.

## 8. Rutas reales del lunes — GATE

Después de limpiar TEST y antes de declarar Go-Live:

- [ ] Crear planificaciones reales del 07/09/2026.
- [ ] Confirmar Vendedor correcto.
- [ ] Confirmar clientes correctos.
- [ ] Confirmar fecha correcta.
- [ ] Confirmar secuencia/`stop_order`.
- [ ] Confirmar GPS disponible cuando se requiera navegación.
- [ ] Revisar que no existan duplicados accidentales.
- [ ] Verificar visualmente Rutas desde perfil Vendedor.

## 9. Smoke/E2E mínimo

### Administrador

- [ ] Login.
- [ ] Inicio.
- [ ] Clientes — conteo esperado.
- [ ] Planificación.
- [ ] Jornadas/Control Operativo.
- [ ] Tracking.
- [ ] Reportes.
- [ ] Administración.

### Vendedor

- [ ] Login.
- [ ] Ve su ruta real.
- [ ] No puede ejecutar rutas ajenas mediante UX.
- [ ] Inicio de jornada/ruta con fecha válida.
- [ ] Llegada/inicio de visita.
- [ ] Cierre de visita.
- [ ] GPS puntual registrado cuando el dispositivo lo permite.
- [ ] Cierre de ruta/jornada.

### Gestor

- [ ] Login.
- [ ] Llamadas/CRM.
- [ ] Agenda/Showroom.
- [ ] Seguimientos.
- [ ] Reportes permitidos.

## 10. Tracking — reglas que no deben cambiar

- [ ] Tracking Auto 30s permanece OFF por defecto.
- [ ] Actualizar manual funciona.
- [ ] Auto opcional solo cuando corresponde.
- [ ] No describirlo como GPS continuo/background tracking.
- [ ] Los recorridos son reconstrucción estimada entre eventos GPS registrados.

## 11. Supabase nueva organización

Después de la transferencia:

- [ ] Proyecto visible en la nueva organización.
- [ ] Project Ref sigue `ccvzosnhxitfeochnflr`.
- [ ] Base accesible.
- [ ] Auth accesible.
- [ ] 5 Edge Functions ACTIVE.
- [ ] Storage accesible.
- [ ] Aplicación productiva sigue conectando sin cambio de URL/API.
- [ ] Revisar Usage/Egress el día de Go-Live.
- [ ] Revisar Usage/Egress al final del primer día.

## 12. Cloudflare

- [ ] URL productiva responde.
- [ ] Versión visible `0.6.5-beta.12.2.8` mientras no exista promoción estable posterior.
- [ ] No crear nuevo Worker por la transferencia de Supabase.
- [ ] Revisar Metrics/errores después del lanzamiento.

## 13. Seguridad — aceptación necesaria

Hallazgo pendiente:

Varias tablas base permiten SELECT a cualquier usuario `authenticated`, aunque el frontend aplica permisos por perfil.

Antes de cerrar la fase inicial debe registrarse una decisión:

- [ ] **Aceptado temporalmente**: todo empleado autenticado puede leer datos operativos globales; UX restringe módulos/acciones.

O bien:

- [ ] **Aislamiento backend requerido**: diseñar y aplicar RLS por alcance en rama separada, con migración incremental y QA completo.

No improvisar este cambio durante una operación activa.

## 14. Protección de GitHub

- [ ] Activar protección/ruleset de `main` cuando sea posible sin romper el workflow actual.
- [ ] Requerir PR para cambios funcionales.
- [ ] Mantener CI/build como validación.
- [ ] No trabajar directamente sobre `main`.

## 15. Decisión final GO/NO-GO

### GO solo si

- backup verificado;
- limpieza TEST aprobada/completada;
- usuarios esenciales acceden;
- rutas reales listas;
- producción responde;
- no hay sesiones/visitas TEST abiertas;
- smoke test Admin + Vendedor + Gestor aprobado;
- Supabase y Cloudflare sin incidente bloqueante;
- el usuario declara explícitamente el inicio de operación real.

### NO-GO si

- no existe backup;
- falla Auth de perfiles esenciales;
- rutas reales no están listas;
- hay corrupción/inconsistencia tras limpieza;
- Supabase/Cloudflare presentan incidente que impide operar;
- aparece un blocker P0 en ruta/visita/cierre.

## 16. Momento de corte TEST -> REAL

Registrar explícitamente:

```text
GO-LIVE DECLARADO: [fecha/hora RD]
A partir de este momento, los nuevos registros operativos son REALES.
```

Hasta que exista esa declaración, los datos siguen tratados como TEST.
