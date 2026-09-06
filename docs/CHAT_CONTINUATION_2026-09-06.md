# Continuidad de chat — Gestión de Ventas Diaria

Fecha del checkpoint: **06/09/2026 (República Dominicana)**

> Este es el checkpoint operativo prioritario para continuar el proyecto. GitHub `main`, Supabase y Cloudflare son la fuente de verdad si algo aquí difiere de conversaciones anteriores. No contiene secretos, contraseñas, tokens ni claves privadas.

## 1. Estado productivo confirmado

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión productiva visible: **0.6.5-beta.12.2.8**.
- Merge funcional beta.12.2.8: `247c7a6d9c749f33f5045b2388d0947f3c8efabd`.
- PR #55: MERGED.
- GitHub Actions posterior al merge: SUCCESS.
- Cloudflare URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Current Version ID: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Producción fue validada visualmente después de la transferencia de Supabase.
- La app sigue mostrando `Versión 0.6.5-beta.12.2.8`.

## 2. Supabase — transferencia administrativa completada el 06/09/2026

El proyecto Supabase **no fue clonado ni recreado**. Se transfirió el mismo proyecto existente a una nueva organización para aislarlo del consumo excesivo de otro proyecto de la organización anterior.

Datos técnicos que permanecen iguales:

- Nombre del proyecto: `Gestion de Ventas Diaria`.
- Project Ref: `ccvzosnhxitfeochnflr`.
- API base del frontend: `https://ccvzosnhxitfeochnflr.supabase.co`.
- Región: AWS `ca-central-1`.
- Base PostgreSQL vigente.
- Auth vigente.
- RLS vigente.
- Storage vigente.
- Edge Functions vigentes.
- No se modificó código ni Cloudflare para esta transferencia.

La organización destino es independiente de la organización anterior que estaba excediendo Egress. No documentar correos, contraseñas ni secretos como requisito operativo; el dato relevante es que el proyecto quedó en una organización Supabase separada y con dos Owners temporalmente durante el Go-Live.

### Integridad validada antes y después de la transferencia

Snapshot idéntico:

| Componente | Conteo |
|---|---:|
| Clientes | 1,997 |
| Empleados | 12 |
| Usuarios Auth | 8 |
| Planificaciones | 16 |
| Paradas | 160 |
| Sesiones de ruta | 4 |
| Visitas | 11 |
| Llamadas | 28 |
| Citas | 7 |
| Seguimientos | 11 |
| Showroom sessions | 1 |
| Recepción | 1 |
| Prospectos | 1 |
| Audit log | 4,733 |
| Objetos Storage | 2 |

Tamaño de base validado: `167865491` bytes en la comprobación SQL posterior a la transferencia.

### Edge Functions comprobadas ACTIVE

1. `login-by-username` v2 — ACTIVE.
2. `master-import` v3 — ACTIVE.
3. `admin-users` v3 — ACTIVE.
4. `request-password-reset` v1 — ACTIVE.
5. `verify-password-reset` v2 — ACTIVE.

No redeployar ni recrear estas funciones solo por la transferencia.

## 3. Uso / cuotas Supabase

Antes de transferir, la organización antigua mostraba aproximadamente `10.494 GB / 5 GB` de Egress en el ciclo actual.

Desglose por proyecto confirmado:

- `Gestion de Ventas Diaria`: aproximadamente `0.166 GB` de Egress.
- Segundo proyecto de la organización anterior: aproximadamente `10.328 GB` de Egress.

Conclusión: **Gestión de Ventas Diaria no era el origen del exceso de Egress**. La transferencia a organización separada se realizó para aislar el riesgo administrativo/Fair Use.

Después de transferir, el nuevo panel de la organización mostró inicialmente:

- Egress: `0 / 5 GB` en la nueva organización al momento de la captura inicial.
- Database Size: aproximadamente `183 / 500 MB`.

Revisar Usage durante los primeros días reales de operación. No asumir que el contador inicial en cero será permanente; es normal que aumente con uso real.

## 4. Cloudflare

No se migró Cloudflare y no se requiere hacerlo por la transferencia de Supabase.

- La cuenta/Worker actual continúa sirviendo el frontend.
- La URL sigue siendo `gestion-de-ventas-diaria.jjriosjose.workers.dev` porque el subdominio depende de la cuenta Cloudflare, no de Supabase.
- El `wrangler.jsonc` vigente usa Static Assets con `not_found_handling: single-page-application`.
- El frontend consulta Supabase directamente mediante el Project Ref vigente.

No crear otra cuenta Cloudflare ni otro Worker antes del Go-Live salvo una decisión arquitectónica futura independiente.

## 5. Estado de datos: TODAVÍA TEST

Regla crítica:

> Todos los datos operativos actuales siguen considerándose **TEST** hasta que el usuario declare explícitamente el Go-Live.

No limpiar datos, borrar historial ni transformar el ambiente a operación real sin autorización explícita.

Último snapshot operativo previo al Go-Live:

- 12 empleados activos.
- 8 empleados ya vinculados a Auth.
- 4 empleados activos todavía sin `auth_user_id`; todos son Gestores y poseen bootstrap válido no usado.
- 0 route sessions abiertas.
- 0 visitas abiertas.
- 12 planificaciones pasadas todavía en estado `PLANIFICADA`.
- 0 planificaciones para lunes 07/09/2026 en la última auditoría.
- 0 citas para lunes 07/09/2026 en la última auditoría.
- 0 follow-ups para lunes 07/09/2026 en la última auditoría.

## 6. Cartera actual

- Clientes: 1,997.
- CADENA: 135.
- REGULAR: 1,862.
- Con GPS: 929.
- Sin GPS: 1,068.
- Con vendedor asignado: 640.
- Sin vendedor asignado: 1,357.
- Con gestor asignado: 956.
- Sin gestor asignado: 1,041.
- Base de mayor calidad para rutas de Vendedor: 555 clientes con vendedor asignado + GPS.

Para el primer Go-Live no representar los 1,997 clientes como totalmente distribuidos si no lo están. Preferir operación inicial con cartera realmente asignada.

## 7. Seguridad y RLS — decisión pendiente

Hallazgo principal de auditoría:

- El frontend sí controla módulos por `access_profile` y permisos.
- Las escrituras críticas principales están protegidas por RLS/funciones backend.
- Varias tablas base tienen políticas SELECT amplias para cualquier usuario `authenticated` (`qual = true`).

Esto significa que la visibilidad del frontend puede ser más restrictiva que la lectura disponible directamente vía Supabase API para un usuario autenticado.

No ejecutar un refactor masivo de RLS a última hora sin QA completo. Antes o inmediatamente después del Go-Live debe definirse explícitamente una de estas políticas:

A. todo empleado autenticado puede leer datos operativos globales y el frontend solo organiza la UX; o
B. Vendedor/Gestor deben quedar aislados por cartera/actividad también en backend, en cuyo caso se requiere migración incremental + QA completo.

Tracking tiene controles backend adicionales mediante `private.current_user_can_view_tracking()` y vistas dedicadas. Los Advisor warnings de SECURITY DEFINER siguen siendo deuda de hardening, no evidencia de exposición indiscriminada.

Otros pendientes de seguridad:

- protección formal de `main`;
- CORS restrictivo de Edge Functions cuando sea seguro;
- revisión de grants SECURITY DEFINER;
- Leaked Password Protection de Auth;
- proceso administrativo de reset de contraseña mientras `auth.recovery_enabled=false`.

## 8. Estado de `main`

Baseline funcional estable de producto antes del bloque documental:

`247c7a6d9c749f33f5045b2388d0947f3c8efabd`

Corresponde al merge de PR #55 beta.12.2.8.

La rama `main` no tenía protección formal en la última comprobación.

Workflow obligatorio para cambios futuros:

1. verificar `main` real;
2. crear feature/docs branch;
3. no modificar directamente `main`;
4. PR;
5. revisar diff;
6. CI verde;
7. merge aprobado;
8. GitHub Desktop -> `main` -> Fetch/Pull;
9. confirmar `0 changed files`;
10. build/deploy solo si el cambio afecta producción ejecutable.

En el equipo Windows del usuario, `git` CLI no está en PATH. Usar GitHub Desktop para ramas, fetch, pull y merges cuando el usuario lo opere localmente.

## 9. Orden exacto recomendado para continuar el 06-07/09/2026

1. **Freeze funcional**: no agregar nuevas capacidades antes del Go-Live salvo blocker P0.
2. Terminar documentación/checkpoint de continuidad.
3. Crear respaldo lógico/exportación de seguridad antes de limpiar TEST.
4. Definir exactamente qué tablas/objetos operativos TEST se limpiarán y cuáles se preservarán.
5. Resolver las 12 planificaciones pasadas `PLANIFICADA` mediante limpieza/regularización aprobada.
6. Activar/probar los 4 Gestores todavía sin Auth mediante su primer acceso/bootstrap.
7. Crear las rutas reales del lunes 07/09/2026.
8. E2E con al menos Administrador + Vendedor + Gestor, idealmente móvil/datos celulares.
9. Validar login, Inicio, Clientes, Planificación, Rutas, inicio/fin, visita GPS, llamada, showroom, Tracking y Reportes.
10. Revisar Supabase Usage en la nueva organización.
11. Tomar decisión formal GO/NO-GO.
12. Solo después declarar explícitamente que los nuevos registros son PRODUCTIVOS/REALES.

## 10. Limpieza TEST — principio de seguridad

Preservar, salvo decisión específica:

- `clients`;
- `employees`;
- `companies`;
- geografía/catálogos/configuración;
- `portfolio_mappings` aprobados;
- políticas de gestión aprobadas.

Candidatos a limpiar solo con backup + aprobación explícita:

- `route_plans`;
- `route_stops`;
- `route_sessions`;
- `visits`;
- `calls`;
- `appointments`;
- `showroom_sessions`;
- `reception_entries`;
- prospectos TEST;
- `follow_ups` TEST;
- `notifications`;
- incidencias operativas TEST;
- evidencias/fotos TEST.

No purgar a ciegas `audit_log` ni `import_batches`; tratarlos como trazabilidad/archivo por separado.

## 11. Release beta.12.2.8 — comportamiento a preservar

### Route Ordering UX

- `Cercanos primero` / `Lejanos primero`.
- Origen reproducible.
- `route_stops.stop_order` conserva secuencia.

### Interactive Tour beta.12.2.7

- 16 pasos totales contando bienvenida/finalización.
- recorrido funcional no destructivo.
- máscara visual consistente.

### Resiliencia/Tracking beta.12.2.8

- Tracking Auto 30s **OFF por defecto**.
- refresh manual disponible.
- auto opcional solo para hoy/visible.
- race-safe sequencing.
- conserva datos previos ante error de refresh.
- Auth/profile query reintenta ciertos errores transitorios.

No describir Tracking como GPS continuo de fondo. Es seguimiento basado en eventos GPS registrados.

## 12. Qué debe leer un nuevo chat

Orden recomendado:

1. `docs/CHAT_CONTINUATION_2026-09-06.md` — este archivo.
2. GitHub `main` real.
3. `docs/GO_LIVE_2026-09-07_CHECKLIST.md`.
4. `docs/SUPABASE_TRANSFER_2026-09-06.md`.
5. `PROJECT_HANDOFF.md` como contexto histórico.
6. `docs/REQUIREMENTS_STATUS.md` y `docs/IMPLEMENTATION_STATUS.md`, sabiendo que partes antiguas pueden estar desactualizadas si aún no fueron consolidadas.
7. Supabase real antes de asumir esquema/RLS/datos.
8. Producción Cloudflare antes de afirmar una versión desplegada.

## 13. Regla de continuidad

Si el chat nuevo encuentra contradicciones entre documentación y servicios:

> **GitHub main + Supabase real + Cloudflare real prevalecen.**

No repetir migraciones, no limpiar TEST y no modificar RLS/Auth por inferencia del historial. Verificar primero y explicar el cambio antes de ejecutarlo.
