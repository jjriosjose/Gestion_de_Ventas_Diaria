# Continuación actual — Gestión de Ventas Diaria

Fecha: **25/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN CUALQUIER CHAT NUEVO.**
>
> Fuente de verdad, en este orden: **GitHub `main` → Supabase vivo → Cloudflare productivo → documentación actual → historial del chat**. Antes de escribir código, ejecutar SQL, mergear o desplegar, verificar el estado vivo.

## Orden de lectura obligatorio

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CHAT_CONTINUATION_2026-09-20.md`
3. `docs/TECHNICAL_AUDIT_2026-09-20.md`
4. `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md`
5. `docs/SUPABASE_CAPACITY_2026-09-20.md`
6. Para Logística/TMS: documentos `LOGISTICS_*.md` vigentes.
7. Para reglas históricas de Rutas/Jornadas: `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md` y `docs/V065_BETA16_3_ROUTE_ADMIN_RESOLUTION.md`.

`PROJECT_HANDOFF.md` funciona como índice estable y apunta a este checkpoint. Documentos anteriores son contexto histórico y no prevalecen sobre estado vivo.

## Estado productivo actual

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

`main`:
- versión de código: **0.6.5-beta.16.3.14**
- merge funcional: `43520095e9349314e3974bd0f4dc19d0cb552824`
- PR #82: **MERGED**
- Build validation #1188: **SUCCESS**.
- QA local 16.3.14: **APROBADO por el usuario el 25/09/2026**.
- Cloudflare productivo: **0.6.5-beta.16.3.14**.
- deploy manual confirmado por el usuario el 25/09/2026.

Cloudflare:
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- versión desplegada: **0.6.5-beta.16.3.14**
- Current Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`
- deploy manual confirmado por el usuario el 25/09/2026 mediante `npm run deploy`.
- `Fetch origin` no mostró `Pull origin` porque la copia local ya estaba alineada con `origin/main`; el deploy sí tomó 16.3.14, confirmado por la funcionalidad Captación visible en producción.

Supabase:
- proyecto: `Gestion de Ventas Diaria`
- ref: `ccvzosnhxitfeochnflr`
- región: `ca-central-1`
- estado: **ACTIVE_HEALTHY**
- plan: **Free**

Todos los datos operativos actuales siguen siendo **TEST** hasta declaración explícita del usuario de Go-Live.



## Beta.16.3.14 — Captación Operativa dentro de Rutas — PRODUCTIVO / QA PRODUCTIVO EN CURSO

Objetivo: permitir captación oportunista dentro de una Ruta Planificada o Jornada Libre sin crear una jornada paralela y con seguimiento completo en Tracking/Jornadas.

Cambio:
- botón **Captar prospecto** dentro de una jornada activa;
- llegada con GPS/hora e inicio de cronómetro;
- formulario completo solo al pulsar **Finalizar captación**;
- salida con GPS/hora y duración real;
- resultado comercial independiente de creación de prospecto;
- solo `CAPTADO` crea registro en `prospects`;
- evidencia fotográfica asociada al prospecto;
- Tracking agrega `CAPTURE_START` / `CAPTURE_END`, estado **En captación**, filtros y detalle completo de la gestión;
- Jornadas separa tiempo de captación del traslado/espera residual;
- Tracking muestra formulario completo: resultado, código, contacto, teléfono, tipo, interés, observaciones, horas, duración, GPS y evidencias.

Hardening:
- nueva entidad `capture_interactions`;
- RLS: vendedor propietario o permiso Tracking;
- una captación activa bloquea nueva visita, eventualidad y cierre de jornada;
- visita/eventualidad activa bloquea iniciar captación;
- `start_open_journey` ya ignora planes `CAPTACION` al decidir si existe una ruta planificada de VISITAS;
- `link_prospect_route_session` ya no enlaza captaciones libres a sesiones de VISITAS;
- fallo de subida de fotos no invalida una captación ya finalizada;
- vistas finales `executive_tracking_events_v2` y `executive_route_journeys_v5` con `security_invoker=true`.

Backend:
- migración `20260925024317_capture_operational_v2_test_foundation`: aplicada;
- migración `20260925145033_capture_operational_v2_production_hardening`: aplicada;
- migración `20260925152837_cleanup_capture_operational_v2_qa_data_20260925`: aplicada para retirar exclusivamente la jornada QA de Virmania del 25/09 y sus dependencias TEST.
- verificación posterior: 0 jornada QA, 0 captaciones QA, 0 prospectos QA y 0 visita QA; el cliente real `TIENDA AMARILLA, SRL` no fue eliminado.

Estado:
- versión **0.6.5-beta.16.3.14**;
- PR #82: **MERGED**;
- merge: `43520095e9349314e3974bd0f4dc19d0cb552824`;
- Build validation #1188: **SUCCESS**;
- QA local: **APROBADO**;
- captaciones abiertas al cierre del QA: **0**;
- Cloudflare productivo: **0.6.5-beta.16.3.14**;
- Current Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`;
- deploy 16.3.14: **OK**;
- QA productivo 16.3.14: **EN CURSO**;
- datos generados durante QA local: **LIMPIADOS DE PRODUCCIÓN**.

Fuera de alcance actual:
- ejecución completa de **Captación Programada** como jornada `CAPTACION`; será la siguiente fase.

## Beta.16.3.13 — Historial detallado de llamadas — PRODUCTIVO / QA PRODUCTIVO PENDIENTE

Objetivo: permitir revisar en detalle las gestiones telefónicas por cliente y por Gestor, manteniendo contexto acumulado dentro del período filtrado.

Cambio:
- la ruta real `/llamadas` usa `CallsV2`; la implementación experimental inicial en `Calls.tsx` no se mostraba y fue retirada antes del merge;
- historial desplegable por llamada con ejecutor, fecha/hora, Entrante/Saliente, contacto, teléfono, duración, resultado, compra/monto, próxima acción, seguimiento, Showroom, código de cliente y observaciones;
- filtro de dirección de llamada y período Desde/Hasta;
- resumen general del período: llamadas, compras registradas, monto de compras y visitas reales al Showroom;
- resumen por cliente dentro de cada tarjeta para el mismo período: cantidad de llamadas, compras/monto y visitas reales al Showroom;
- las visitas Showroom se cuentan desde `showroom_sessions.started_at`, no desde interés o solicitud de cita;
- sin migraciones, RLS ni cambios Edge Functions.

Estado:
- versión **0.6.5-beta.16.3.13**;
- PR #79: **MERGED**;
- merge: `c5c6f64ac51cc9bac571af258a83d936cd0ab81d`;
- Build validation #1132: **SUCCESS**;
- QA local: **APROBADO**;
- Cloudflare productivo: **0.6.5-beta.16.3.13**;
- Current Version ID: `c44788d9-b66b-49b2-984b-219f7bee9e83`;
- deploy: **OK** el 24/09/2026;
- QA productivo 16.3.13: pendiente.

## Beta.16.3.10 — Admin elimina tareas de Captación — PRODUCTIVO / QA PENDIENTE

Motivo histórico: `Eceballos` tenía una tarea `CAPTACION` para el 21/09 que el RPC de Jornada Libre interpretaba incorrectamente como una ruta planificada. **Este defecto quedó corregido en 16.3.14**: `start_open_journey` ahora solo considera planes `VISITAS` / `MIXTA` para bloquear Jornada Libre.

Cambio 16.3.10:
- Administrador/Supervisor puede eliminar desde Captación una tarea no iniciada.
- reutiliza `delete_unstarted_route_plan`; no agrega DDL.
- solo permite estados `BORRADOR` / `PLANIFICADA`.
- UI bloquea eliminar si la tarea ya tiene prospectos captados, preservando trazabilidad.
- el backend sigue bloqueando planes con sesiones o actividad de paradas.
- no se eliminó automáticamente la tarea actual de Eduar.

Producción ya está en 16.3.10. Falta QA productivo: eliminar una tarea de Captación no iniciada desde Admin y luego validar Jornada Libre con `Eceballos`.

## Beta.16.3.11 — Selección manual continua en Planificación — PRODUCTIVO / QA PENDIENTE

Objetivo: permitir planificar clientes manualmente uno por uno sin que la aplicación cambie automáticamente a la pestaña "Seleccionados" después de cada selección.

Cambio:
- al seleccionar manualmente un cliente, la vista actual permanece abierta;
- buscador y filtros permanecen activos;
- el cliente seleccionado queda acumulado en la ruta;
- el usuario puede buscar y seleccionar inmediatamente otro cliente;
- la pestaña "Seleccionados" sigue disponible para revisión manual;
- no cambia selección por mapa/radio/polígono, ordenamiento ni creación de la planificación;
- sin cambios Supabase.

Estado:
- PR #74: MERGED;
- Build validation #1097: SUCCESS;
- merge funcional: `fd7fbff5fb956d621a458a30fba4202a406c44df`;
- Cloudflare Version ID: `8fb51bc4-73c2-42bb-822b-e21a6041942d`;
- QA funcional productivo: pendiente.

## Beta.16.3.12 — Edición administrativa de planificaciones — PRODUCTIVO / QA PENDIENTE

Objetivo: permitir exclusivamente a usuarios con `app_role='Administrador'` editar planificaciones de visitas que todavía no han iniciado.

Capacidades:
- cargar una planificación existente;
- cambiar fecha de ejecución;
- agregar clientes;
- quitar clientes;
- reordenar clientes;
- eliminar la planificación completa.

Protecciones:
- solo `VISITAS` + `route_mode='PLANIFICADA'`;
- solo estados `BORRADOR` / `PLANIFICADA`;
- bloquea si existe `route_session`;
- bloquea si una parada tiene visita o estado distinto de `PENDIENTE`;
- nueva fecha debe ser hoy o futura;
- evita clientes duplicados;
- rechaza clientes ya planificados en otra ruta para la fecha destino;
- vendedor queda bloqueado durante edición;
- actualización de fecha + paradas es transaccional en RPC.

Backend:
- migración Supabase `20260921193736_admin_edit_unstarted_visit_plans`: APLICADA;
- RPC `admin_update_unstarted_visit_plan`;
- RPC `admin_delete_unstarted_visit_plan`.

Frontend:
- versión **0.6.5-beta.16.3.12**;
- PR #76 MERGED;
- Build validation #1107 SUCCESS;
- merge funcional `6e38e351392cdfa073df4d06c01885ce67041b2d`;
- Cloudflare 16.3.12 desplegado el 21/09/2026.
- Current Version ID: `7f68230c-8e26-444d-acb5-b9cdd5aaccc6`.
- QA funcional productivo: pendiente.

## Validaciones productivas recientes

### 16.3.13
- deploy Cloudflare: **OK**.
- Current Version ID: `c44788d9-b66b-49b2-984b-219f7bee9e83`.
- Historial detallado de llamadas: **QA productivo pendiente**.
- Resumen general de período: **QA productivo pendiente**.
- Resumen acumulado por cliente: **QA productivo pendiente**.
- Visitas reales Showroom desde `showroom_sessions.started_at`: **QA productivo pendiente**.

### 16.3.12
- deploy Cloudflare: **OK**.
- edición administrativa de planificaciones: **QA pendiente**.
- cambio de fecha de ejecución: **QA pendiente**.
- agregar/quitar/reordenar clientes: **QA pendiente**.
- eliminación de planificación no iniciada: **QA pendiente**.


### 16.3.10
- deploy Cloudflare: **OK**.
- eliminación administrativa de tarea Captación: **QA pendiente**.
- validación posterior de Jornada Libre de `Eceballos`: **QA pendiente**.


### 16.3.8
- Gestor registra monto al cerrar Showroom: **OK**.
- alerta Recepción → Gestor en tiempo real: **OK**.
- Gestor visualiza Reporte Ejecutivo completo sin Admin: **OK**.

### 16.3.9
- Ventas monetarias por día y canal: **OK**.
- Compras por día: **OK**.
- Actividad de calle con visitas reales: **OK**.
- Actividad CRM: **OK**.
- Cobertura / Contactabilidad / tablas / detalle diario / exportación: **OK**.

## Regla de workflow

Flujo normal obligatorio:

`feature branch → build/CI → QA local → PR → aprobación → merge → deploy → QA producción`

El usuario autorizó explícitamente saltar QA local solo para 16.3.9. **No convertir esa excepción en regla.**

Deploy Cloudflare confirmado actualmente es manual con `npm run deploy`; merge a main no implica autodeploy.

## P0/P1 abiertos

1. **Reproducibilidad Supabase**: migraciones remotas vs archivos GitHub no están reconciliadas uno-a-uno. Antes de disaster recovery/Go-Live se requiere schema diff y rebuild test.
2. **Staging P0**: no existe Supabase branch/staging separado. El QA local de 16.3.14 escribió datos TEST en producción y fue necesario limpiarlos con la migración `20260925152837`. **No realizar nuevas pruebas funcionales con escritura desde localhost contra Supabase productivo.** Crear Supabase Development Branch antes de la próxima fase de Captación Programada.
3. **Security/RLS**: SELECT demasiado amplio en varias tablas; Storage de fotos/evidencias necesita scoping por rol/propiedad.
4. **SECURITY DEFINER**: Supabase Advisor mantiene hallazgos en vistas/RPC.
5. **QA automatizado**: insuficiente.
6. **Branch protection**: `main` no está protegido.
7. **Showroom concurrente**: duración se sobrecuenta cuando un Gestor atiende clientes simultáneos.
8. **Venta canónica**: no existe todavía entidad única de venta/touchpoints.
9. **Atomicidad**: cierre Showroom, cierre Visita e importación maestra necesitan endurecimiento transaccional.
10. **audit_log**: ~101 MB; evitar snapshots geográficos grandes.
11. **Geo performance**: principal hotspot observado.
12. `package-lock.json` ya fue sincronizado a 16.3.9 mediante PR #69; Build validation #1083: SUCCESS.

## Supabase Free vs Pro

Uso 20/09:
- DB: **164 MB**.
- Storage: **14 MB**.
- Auth: **13 usuarios**.
- Development branches: **0**.

Decisión actual:
- continuar **Free** durante desarrollo/hardening;
- revisar DB/Storage/Egress periódicamente;
- pasar a **Pro antes de Go-Live real**, principalmente por backups, continuidad y margen operativo.

## Reglas críticas permanentes

- No limpiar datos TEST sin plan + validación de dependencias + aprobación.
- **No ejecutar QA local con escritura contra Supabase productivo.** Para nuevas pruebas usar Supabase Development Branch/staging; hasta crearlo, limitar localhost a validaciones sin escritura.
- No repetir migraciones por memoria.
- No modificar/recrear la Jornada Libre histórica de Rendy reparada el 16/09.
- No otorgar Admin a Gestores para resolver acceso de Reportes.
- Recepción controla presencia física; Gestor controla resultado comercial.
- No inferir venta por intención `Realizar compra`.
- No introducir GPS continuo/polling masivo por defecto.
- No hacer cambios RLS/security amplios sin pruebas por rol.
- No desplegar una feature branch como procedimiento normal.
- Si un chat nuevo contradice esta documentación, volver a consultar GitHub/Supabase/Cloudflare.

## Próximo paso exacto

1. Confirmar visualmente que la jornada/captaciones/prospectos QA del 25/09 ya no aparecen tras refrescar producción.
2. Crear **Supabase Development Branch / staging** antes de continuar con pruebas funcionales de Captación Programada.
3. Completar QA productivo de Captación Operativa usando únicamente datos válidos o una prueba controlada explícitamente autorizada.
4. Ejecutar QA productivo pendiente de **0.6.5-beta.16.3.13** en Historial de Llamadas.
5. Ejecutar la fase de reconciliación de migraciones descrita en `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md` **sin modificar producción**.
6. Diseñar rebuild test.
7. Iniciar hardening de seguridad por módulos y con pruebas por rol.
8. Proteger `main` cuando el flujo de CI requerido esté definido.

