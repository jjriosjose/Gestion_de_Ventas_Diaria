# Continuación actual — Gestión de Ventas Diaria

Fecha: **21/09/2026 (RD)**

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
- versión de código: **0.6.5-beta.16.3.10**
- merge funcional: `9b43fd08ec180b12e877d64c8ac073d7c2ba6c33`
- PR #71: **MERGED**
- Build validation #1091: **SUCCESS**.

Cloudflare:
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- versión desplegada: **0.6.5-beta.16.3.10**
- Current Version ID: `7afaf094-a837-4771-b5fe-b86c77974d85`
- deploy manual confirmado por el usuario el 21/09/2026 con Wrangler 4.125.0.

Supabase:
- proyecto: `Gestion de Ventas Diaria`
- ref: `ccvzosnhxitfeochnflr`
- región: `ca-central-1`
- estado: **ACTIVE_HEALTHY**
- plan: **Free**

Todos los datos operativos actuales siguen siendo **TEST** hasta declaración explícita del usuario de Go-Live.

## Beta.16.3.10 — Admin elimina tareas de Captación — PRODUCTIVO / QA PENDIENTE

Motivo inmediato: `Eceballos` tenía una tarea `CAPTACION` para el 21/09 que el RPC de Jornada Libre interpreta incorrectamente como una ruta planificada y bloquea `start_open_journey`. La corrección lógica del RPC queda pendiente para una entrega separada.

Cambio 16.3.10:
- Administrador/Supervisor puede eliminar desde Captación una tarea no iniciada.
- reutiliza `delete_unstarted_route_plan`; no agrega DDL.
- solo permite estados `BORRADOR` / `PLANIFICADA`.
- UI bloquea eliminar si la tarea ya tiene prospectos captados, preservando trazabilidad.
- el backend sigue bloqueando planes con sesiones o actividad de paradas.
- no se eliminó automáticamente la tarea actual de Eduar.

Producción ya está en 16.3.10. Falta QA productivo: eliminar una tarea de Captación no iniciada desde Admin y luego validar Jornada Libre con `Eceballos`.

## Validaciones productivas recientes

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
2. **Staging**: no existe Supabase branch/staging separado. Local puede consumir producción.
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

- No limpiar datos TEST sin plan + backup + aprobación.
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

1. Ejecutar la fase de reconciliación de migraciones descrita en `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md` **sin modificar producción**.
2. Diseñar staging/rebuild test.
3. Iniciar hardening de seguridad por módulos y con pruebas por rol.
4. Proteger `main` cuando el flujo de CI requerido esté definido.

