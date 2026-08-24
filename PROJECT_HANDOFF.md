# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. Los servicios reales (GitHub, Supabase y Cloudflare) prevalecen si existiera una discrepancia.
>
> **Nunca incluir secretos, contraseñas, tokens, service keys, variables privadas ni credenciales sensibles.**

---

# 0. ESTADO ACTUAL — LEER PRIMERO

## Producción actual

- Aplicación: **Gestión de Ventas Diaria — Almacenes Karaka**.
- Versión productiva: **V0.6.4**.
- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Commit de **aplicación realmente desplegado**: `a8f114c24d447bbbc383fc549b837a1de42a78f8`.
- Merge: **PR #21 — V0.6.4 cierre parcial de jornada y distancia GPS estimada**.
- URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Current Version ID V0.6.4: `9ec25487-eee2-432e-8d13-1c0b09c52028`.
- Cloudflare Version ID V0.6.3 anterior: `156aae3f-0443-4995-b36e-4dfd840382fd`.
- Cloudflare Version ID V0.6.2 histórico: `84c647cc-a990-49e7-8560-efe79b75a302`.
- Cloudflare Version ID V0.6.1 histórico: `84bf2469-2d57-491c-8b24-f4becc02a36a`.
- Cloudflare Version ID V0.6.0 histórico: `e317d9c0-458e-4d96-887a-a7f6e60926b9`.
- Referencia de rollback histórica adicional: `c68281bc-2a59-4903-89c3-c1e944a5bb1e`.
- Deploy V0.6.4: **manual desde Windows con `npm run deploy` / Wrangler 4.125.0**.
- Build V0.6.4 validado localmente: `npm run build` SUCCESS.
- Build V0.6.4 validado por GitHub Actions: `Build validation` SUCCESS.
- Workflow territorial del commit final: SUCCESS.
- `package.json`: `0.6.4`.
- caché PWA productiva: `gvd-shell-v064`.

### Importante sobre `main`

Después del commit de aplicación desplegado, `main` puede avanzar por commits **solo documentales** como este `PROJECT_HANDOFF.md`. Eso no significa que Cloudflare esté ejecutando el último commit documental. La referencia de código productivo sigue siendo el commit de aplicación indicado arriba hasta el próximo deploy confirmado.

## Supabase actual

- Proyecto: `ccvzosnhxitfeochnflr`.
- PostgreSQL observado: 17.6.1.
- Región observada: `ca-central-1`.
- Backend central multiusuario: PostgreSQL + Auth + RLS + Storage + PostGIS + Edge Functions.
- No depender de `localStorage` para persistencia operacional compartida.
- Las vistas ejecutivas relevantes fueron verificadas con `security_invoker=true`; revalidar antes de cambios de seguridad.

### Migraciones V0.6.4 incorporadas y verificadas funcionalmente

- `20260824144500_v064_route_closure_and_distance_metrics.sql`
- `20260824151500_v064_operational_visit_day_alignment.sql`
- `20260824153000_v064_align_core_executive_route_day.sql`

**No asumir que el ledger `supabase_migrations.schema_migrations` y los archivos GitHub son 1:1. Nunca hacer replay ciego.**

---

# 1. V0.6.4 — QUÉ QUEDÓ PRODUCTIVO

V0.6.4 fue validada de extremo a extremo por el usuario antes del merge/deploy, incluyendo cierre real de una ruta con pendientes, recarga de página, nueva sesión, Reportes y PDF.

## 1.1 Cierre parcial / cierre de jornada

Se incorporó el flujo **Cerrar jornada** para permitir finalizar una ruta aunque no se hayan visitado todos los clientes, sin falsear la operación.

Reglas:

- Si no quedan pendientes, el cierre es normal.
- Si quedan pendientes, el motivo de cierre es obligatorio.
- Motivos incluyen fin de jornada/tiempo agotado, tráfico/retrasos, cambio de prioridad autorizado, reprogramación, eventualidad, suspensión u otro.
- `Otro` puede requerir observación según la interfaz.
- Las paradas pendientes **no se convierten en visitadas**.
- Se registra hora de cierre (`ended_at`) y GPS final cuando está disponible.
- Se guarda `closure_mode`, motivo global de cierre y cantidad de pendientes resueltos al cierre.
- El cierre se realiza transaccionalmente en backend para evitar estados parciales.
- No se permite cerrar si existe visita abierta o eventualidad activa.
- Una vez cerrada, la jornada deja de acumular tiempo.
- Una ruta `FINALIZADA` ya no debe mostrar acciones para iniciar/finalizar nuevamente.

### Estados finales

- `VISITADO`: visita realmente completada.
- `NO_VISITADO`: parada con resultado de no realización y motivo.
- `REPROGRAMADO`: no debe guardarse como `NO_VISITADO`; conserva su semántica propia.
- `CANCELADO`: se considera resuelto operacionalmente cuando corresponde.

## 1.2 Cobertura real vs cierre operativo / resolución

Mantener estas métricas separadas:

- **Cobertura real** = `Visitados / Planificados`.
- **Resueltos** = paradas con resultado final o justificación.
- **Resolución / cierre operativo** = `Resueltos / Planificados`.

Ejemplo productivo validado con Eduar:

```text
Planificados: 22
Visitados: 4
Cobertura real: 18.2 %
No realizados: 18
Pendientes: 0
Resueltos: 22 / 22
Resolución: 100 %
```

Interpretación correcta:

> Solo se visitó 18.2 % de la ruta, pero el 100 % de las paradas quedó con un resultado final al cerrar la jornada.

**Nunca interpretar Resolución 100 % como Cumplimiento de visitas 100 %.**

Mejora UX futura opcional: renombrar visualmente `Resolución` a `Cierre operativo` o `Paradas con resultado` para reducir confusión gerencial.

## 1.3 Jornada y tiempos

Definiciones únicas:

- **Jornada de ruta** = ventana desde inicio de sesión de ruta hasta `ended_at`; si sigue activa, hasta `now()`.
- **Atención a clientes** = suma de duración de visitas.
- **Promedio / visita** = atención total / visitas registradas.
- **Eventualidades** = duración registrada de incidencias.
- **Traslado / espera estimado** = tiempo residual de la ventana de ruta no explicado por atención/eventualidades según la lógica ejecutiva.

**No llamar “tiempo conduciendo” al traslado/espera estimado.** Puede incluir tráfico, estacionamiento, espera, pausas y otros tiempos sin tracking continuo.

### Caso de regresión validado

Para la ruta cerrada de Eduar 2026-08-24:

- `route_window_seconds`: 47,402 s ≈ **13 h 10 min**.
- `visit_seconds`: 240 s ≈ **4 min**.
- `transit_wait_estimated_seconds`: 47,162 s ≈ **13 h 06 min**.
- ruta y sesión: `FINALIZADA`.
- `closure_mode`: `PARCIAL`.
- `closure_reason_code`: `FIN_JORNADA`.
- pendientes resueltos al cierre: 17.

La jornada quedó congelada después del cierre.

## 1.4 Distancia GPS estimada

Nueva fuente ejecutiva: `executive_daily_route_metrics`.

Se estima distancia geodésica entre puntos GPS operativos disponibles:

```text
Inicio ruta → primera visita
visita → visita
última visita → fin de ruta
```

Campos relevantes:

- `start_to_first_m`
- `between_visits_m`
- `last_to_end_m`
- `estimated_distance_m`
- `gps_segments`

Caso validado Eduar 2026-08-24:

- Inicio → primera visita: ~3.3 m.
- Entre visitas: ~66.6 m.
- Última visita → cierre: ~4,111.2 m.
- Distancia total estimada: ~4,181.2 m = **4.18 km**.
- Tramos GPS: **5**.

**No presentar este valor como odómetro ni recorrido vial exacto.** Es distancia geodésica entre puntos disponibles. Si se integra un motor de rutas en el futuro, distinguir `distancia GPS/geodésica estimada` de `distancia vial estimada`.

## 1.5 Día operativo de visitas vinculadas a ruta

Se corrigió una inconsistencia histórica importante.

Para una visita vinculada a una sesión/ruta, la reportería ejecutiva debe usar **`route_session.session_date` como día operativo**. Las visitas libres/no planificadas pueden seguir usando su fecha local real.

Esto evita que una ruta que cruza medianoche muestre:

- 4 visitados en Rutas;
- pero solo 1 visitado en Reportes.

La ruta histórica de Eduar, iniciada con lógica antigua antes de medianoche local, se mantiene como dato de regresión y ahora aparece coherentemente como 4 visitas en el día operativo 2026-08-24.

## 1.6 Inicio / Dashboard

V0.6.4 mantiene separación por función y agrega/alinea:

- Planificados.
- Visitados.
- Cobertura real.
- Distancia GPS estimada.
- Compras/ventas.
- Llamadas/citas.
- Rutas cerradas.
- Ranking Vendedores separado de Gestores.
- Vendedores muestran visitas, resueltos, GPS, compras, ventas y cierre de rutas.

Inicio, Reportes y PDF deben leer las mismas fuentes ejecutivas para evitar cifras divergentes.

## 1.7 Reportes y PDF

El PDF personal de Vendedor `Mi resumen diario` quedó alineado con V0.6.4 y muestra:

- Cobertura real.
- Resueltos.
- Resolución.
- Jornada.
- Horario.
- Atención.
- Promedio/visita.
- Traslado/espera estimado.
- Distancia GPS estimada.
- Tramos GPS.
- Compras.
- Ventas.
- versión `0.6.4`.

El PDF ejecutivo/Dirección mantiene Vendedores y Gestores separados por naturaleza del trabajo.

## 1.8 Service Worker / pruebas locales

Se detectó durante la validación que `src/main.tsx` registraba `/sw.js` incluso en localhost, permitiendo que una caché PWA vieja interceptara Vite y mostrara UI/lógica anterior después de refrescar.

V0.6.4 corrige esto:

- en producción se mantiene Service Worker/PWA;
- en `localhost` / `127.0.0.1` no debe registrarse el Service Worker productivo;
- se desregistran Service Workers de desarrollo antiguos y se limpian cachés `gvd-shell-*` cuando corresponda;
- las pruebas con Vite deben mostrar el código real de la rama activa.

Para pruebas aisladas puede ejecutarse:

```bat
npm run dev -- --host 127.0.0.1
```

y abrir `http://127.0.0.1:5173/`.

---

# 2. PRÓXIMA ITERACIÓN PROPUESTA — V0.6.5

No modificar producción directamente. Crear una rama feature nueva desde `main` estable V0.6.4.

## Bloque A — Cobertura cartera: actividad vs cumplimiento

Separar explícitamente dos dimensiones.

### Actividad

- `GESTIONADO`
- `NUNCA GESTIONADO`

### Cumplimiento de frecuencia/meta

- `CUMPLIDO`
- `PENDIENTE`
- `SIN_META`

No redefinir `CUMPLIDO` como “tuvo una gestión”. Debe seguir representando cumplimiento de meta cuando exista una meta.

Hallazgo confirmado: existen visitas/llamadas reales, pero clientes con frecuencia/meta 0 permanecen `SIN_META`; por eso filtrar `CUMPLIDO` puede devolver 0 aunque sí haya actividad.

Diseño sugerido en pantalla:

- Clientes visibles.
- Gestionados este mes/período.
- Nunca gestionados.
- Con meta.
- Sin meta.
- Pendientes de meta.
- Cumplieron meta.

Aplicar la semántica de forma separada para modo Visitas y modo Llamadas.

## Bloque B — Sesiones administrativas / usuarios conectados

Crear trazabilidad para Administrador:

- conectado / inactivo / desconectado;
- usuario;
- rol/perfil;
- hora login;
- última actividad;
- duración actual;
- logout;
- timeout;
- historial de sesiones;
- opcional: último módulo funcional visitado si existe necesidad clara.

Backend recomendado:

- tabla de sesiones operativas;
- evento de login;
- heartbeat controlado;
- actualización de última actividad;
- logout explícito;
- expiración por inactividad.

No inferir “en línea” solamente porque exista un token Auth vigente.

## Bloque C — Refinamiento de productividad

Mantener definiciones únicas en Inicio, Rutas, Reportes y PDF:

- % de jornada en atención.
- % de jornada en traslado/espera.
- visitas por hora de jornada.
- promedio atención por visita.
- rutas finalizadas vs activas.
- jornada acumulada vs jornada finalizada.

Evitar métricas que premien “más visitas en menos tiempo” sin contexto de calidad de atención.

## Bloque D — Claridad de cierre operativo

Evaluar renombrar visualmente:

- `Resolución` → `Cierre operativo` o `Paradas con resultado`.

La fórmula no cambia; solo se mejora interpretación.

## Bloque E — Distancia vial futura (opcional)

La V0.6.4 usa distancia geodésica puntual. En una fase posterior se puede evaluar:

- motor de rutas;
- distancia vial estimada;
- duración vial estimada;
- comparación plan vs ejecución.

No confundir con GPS continuo, que no forma parte del diseño actual.

---

# 3. PROTOCOLO DE CONTINUIDAD PARA UN NUEVO CHAT

Si este chat termina o se debe continuar en otro, iniciar con una instrucción similar a:

> **“Continúa el proyecto Gestión de Ventas Diaria. Revisa primero `PROJECT_HANDOFF.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`, valida el estado actual de `main`, Supabase y producción, y explícame el estado antes de realizar cambios. No ejecutes modificaciones hasta confirmar que entendiste el punto de continuidad.”**

Orden obligatorio:

1. Leer `PROJECT_HANDOFF.md` completo.
2. Verificar GitHub `main` y distinguir último commit documental de último commit de aplicación desplegado.
3. Consultar Supabase antes de asumir estructura, datos, migraciones, RLS o estado operacional.
4. Verificar producción/Cloudflare cuando sea relevante.
5. Confirmar qué fase está activa y qué tareas están pendientes.
6. Trabajar en rama feature; no modificar código de aplicación directamente en `main`.
7. Build + CI + prueba local + validación usuario + PR + merge + deploy.

## Política de mantenimiento del handoff

Actualizar:

- al cerrar cada release productivo;
- cuando cambie una regla crítica de negocio;
- después de cambios importantes de arquitectura/base de datos/autenticación;
- cuando se cree un nuevo rol/flujo relevante;
- cuando aparezca un bug importante que deba sobrevivir a otro chat;
- antes de abandonar una conversación larga.

No actualizar después de cada clic o microcambio.

---

# 4. ARQUITECTURA OFICIAL

Frontend:

- React 19
- TypeScript
- Vite 7
- React Router
- Leaflet / OpenStreetMap
- Recharts
- ExcelJS
- jsPDF / jspdf-autotable

Backend:

- Supabase PostgreSQL
- Auth
- RLS
- Edge Functions
- Storage
- PostGIS
- Realtime disponible

Hosting:

- Cloudflare Workers / Static Assets
- SPA fallback
- Google Maps externo cuando corresponde para navegación.

La arquitectura React/TypeScript/Supabase es la base oficial. Prototipos monolíticos anteriores tipo `index.html`/VisitFlow son solo referencia histórica.

---

# 5. MÓDULOS Y RUTAS

| Ruta | Módulo |
|---|---|
| `/` | Inicio / Dashboard |
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

Archivos especialmente sensibles:

- `src/App.tsx`
- `src/main.tsx`
- `src/context/AuthContext.tsx`
- `src/lib/access.ts`
- `src/lib/supabase.ts`
- `src/lib/export.ts`
- `src/lib/version.ts`
- `src/components/AppShell.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Routes.tsx`
- `src/pages/Visits.tsx`
- `src/pages/Calls.tsx`
- `src/pages/Agenda.tsx`
- `src/pages/Reception.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Admin.tsx`
- `src/styles/v062.css`
- `src/styles/v063.css`
- `src/styles/v064.css`
- `public/sw.js`
- `wrangler.jsonc`
- `package.json`
- `supabase/migrations/*`
- `supabase/functions/*`

---

# 6. PERFILES, ACCESO Y RLS

Perfiles frontend:

- Administrador
- Supervisor
- Gestor
- Vendedor
- Recepcion
- SoloLectura

Permisos relevantes:

`dashboard.view`, `clients.view/edit`, `map.view`, `planning.view/manage`, `routes.view/execute`, `capture.view/create`, `coverage.view`, `visits.view/execute`, `calls.view/manage`, `agenda.view/manage`, `reception.view/manage`, `reports.view`, `data_quality.view`, `admin.import`, `admin.portfolio`, `admin.users.manage`, `settings.view`.

Regla crítica:

- `access_profile` + `permission_overrides` gobiernan frontend.
- `app_role` y funciones privadas siguen participando en RLS/seguridad SQL.
- RLS es la autorización efectiva del backend.
- No “arreglar” una capa aislada sin revisar las demás.

Funciones históricamente relevantes:

- `private.current_employee_id()`
- `private.is_admin()`
- `private.can_manage_employee()`
- `private.employee_has_permission()`
- `private.current_user_has_permission()`

Riesgo permanente: frontend y RLS no deben asumirse equivalentes sin auditoría.

---

# 7. MODELO DE DATOS OPERACIONAL

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

Tablas principales:

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
- `audit_log`
- `app_settings`
- `catalog_options`
- `portfolio_mappings`
- `companies`
- `import_batches`
- `bootstrap_credentials`

Vistas relevantes:

- `client_management_coverage_current`
- `client_geo_assessments`
- `geo_intelligence_summary`
- `daily_employee_summary`
- `daily_global_summary`
- `executive_daily_employee_summary`
- `executive_daily_global_summary`
- `executive_activity_timeline`
- `executive_daily_route_metrics`

## Lógica ejecutiva relevante

`executive_daily_employee_summary` calcula/expone, entre otros:

- `planned_clients`
- `visited_clients`
- `resolved_clients`
- `route_window_seconds`
- `visit_seconds`
- `incident_seconds`
- `transit_wait_estimated_seconds`
- `operational_seconds`
- `route_compliance_pct`

Semántica:

- `transit_wait_estimated_seconds` = traslado/espera estimado, no conducción pura.
- `route_compliance_pct` = resolución/cierre operativo, no cobertura estricta de visitas.
- cobertura estricta = `visited_clients / planned_clients`.

---

# 8. REGLAS DE NEGOCIO QUE NO DEBEN PERDERSE

1. Supabase es persistencia central multiusuario.
2. Preservar literalmente `V-CARTERA` y `G-CARTERA` de importaciones maestras.
3. Asignaciones manuales deben protegerse de reimportaciones automáticas.
4. No autocorregir provincia/municipio/región solo porque GPS discrepe del maestro.
5. GPS es puntual en eventos; no hay tracking continuo obligatorio.
6. Solo una visita abierta por empleado.
7. Resultado comercial de visita requiere elección explícita: `COMPRO`, `NO_COMPRO`, `PENDIENTE`.
8. `purchase_amount` es opcional; `null` no equivale a RD$0 confirmado.
9. `manager_employee_id` de showroom = responsable asignado; `attended_by_employee_id` = quien realmente atendió.
10. Un Gestor debe ver sus clientes dentro de rutas de Vendedores de manera genérica; no hard-codear personas.
11. Una intención de showroom no puede perderse porque el cliente no tenga Gestor asignado.
12. Una ruta planificada para fecha futura/pasada no puede iniciarse fuera de su fecha programada.
13. Una cita futura no debe poder registrarse como llegada física antes de su fecha mediante el flujo normal.
14. No cerrar una ruta con visita abierta o eventualidad activa.
15. V0.6.4 permite cierre parcial controlado con motivo obligatorio cuando quedan pendientes.
16. Cerrar jornada nunca convierte pendientes en visitados.
17. `REPROGRAMADO` debe conservar estado propio y no almacenarse como `NO_VISITADO`.
18. Filtro `CADENA / REGULAR` en Rutas es visual y no debe falsear el cierre operacional.
19. No llamar “kilómetros recorridos exactos” a distancia entre puntos GPS.
20. Cobertura real y Resolución/Cierre operativo son métricas diferentes.
21. Una ruta activa muestra jornada acumulada hasta `now()`; una ruta finalizada usa `ended_at` y queda congelada.
22. Visitas vinculadas a ruta deben reportarse por `session_date` del día operativo cuando corresponda.
23. En desarrollo local no debe permitirse que el Service Worker productivo controle Vite.

---

# 9. HISTORIAL DE FASES / RELEASES

## Fase A — Arquitectura/base multiusuario

Consolidado:

- React/TypeScript;
- Supabase central;
- Cloudflare;
- navegación modular;
- roles/perfiles;
- login por username/nick;
- persistencia multiusuario.

## Fase B — Maestro de clientes, mapa y territorio

Consolidado:

- cartera central;
- Vendedor/Gestor;
- mapa y coordenadas;
- región/provincia/municipio;
- calidad geográfica;
- regla de no autocorregir maestro solo por GPS;
- filtros territoriales.

## Fase C — Planificación y rutas

Consolidado:

- planificación por fecha;
- rutas por Vendedor;
- secuencia/paradas;
- mapa;
- navegación;
- ejecución con GPS;
- excepciones;
- eventualidades;
- visualización Gestor ↔ Vendedor;
- rendimiento Admin/Gestor;
- filtro CADENA/REGULAR;
- bloqueo de inicio fuera de fecha;
- cierre parcial controlado desde V0.6.4.

## Fase D — Visitas, llamadas y cobertura

Consolidado:

- llegada/salida y GPS;
- llamadas;
- resultado comercial;
- fotos/evidencia;
- frecuencia;
- cobertura base;
- jornada libre.

Pendiente V0.6.5: separar actividad de cumplimiento de meta en Cobertura cartera.

## Fase E — Agenda, recepción y showroom

Flujo:

```text
intención → pendiente validación → contacto → confirmación/reprogramación
→ llegada → atención → resultado → fin atención → salida
```

Consolidado:

- citas;
- validación Gestor;
- recepción/check-in;
- showroom;
- compra/no compra;
- monto;
- seguimiento;
- responsable asignado vs atendido por;
- preservación de solicitud aunque falte Gestor.

## Fase F — V0.6.0 Inteligencia ejecutiva

Introdujo:

- `executive_daily_employee_summary`;
- `executive_daily_global_summary`;
- `executive_activity_timeline`;
- tiempos de visitas;
- llamadas estimadas;
- showroom;
- compras;
- ventas;
- eventualidades;
- utilización;
- cumplimiento.

Estimaciones de llamada cuando no existe duración real:

- `NO_CONTESTA`: 90 s
- `OCUPADO`: 45 s
- `TELEFONO_INCORRECTO`: 60 s
- otros: 300 s

## Fase G — V0.6.1 Estabilización operacional

Commit desplegado: `ca6a6b8fb35eda5463b17575197089e3f34eabae`.

Incluyó:

- PDF ejecutivo legible;
- Dashboard sobre vistas ejecutivas;
- ventas/showroom/compras integradas;
- actividad Gestores visible;
- bloqueo rutas fuera de fecha;
- control citas futuras;
- intención showroom sin Gestor;
- filtros CADENA/REGULAR en módulos principales;
- rendimiento rutas Admin/Gestor;
- fecha local RD para jornada libre.

Migraciones V0.6.1 aplicadas funcionalmente:

- `20260824030500_v061_operational_date_and_showroom_routing.sql`
- `20260824033500_v061_client_type_filters.sql`

## Fase H — V0.6.2 Rediseño ejecutivo y UX

Commit productivo: `d0ada8a136fd031be203b8302dda43d5507adcf2`.

Cloudflare Version ID: `84c647cc-a990-49e7-8560-efe79b75a302`.

Incluyó:

- fix Leaflet/modales;
- login neutro;
- Inicio separado por Vendedores/Gestores;
- rankings por función;
- gráficos operación de calle vs CRM/Showroom;
- logo Karaka;
- Reporte Ejecutivo separado por funciones;
- PDF Inicio/Reporte corporativos;
- KPI/medidores profesionales.

## Fase I — V0.6.3 Precisión de métricas y PDF

Commit productivo: `d6a6441313b7ba9389b40383ff6d6717f4646c71`.

Cloudflare Version ID: `156aae3f-0443-4995-b36e-4dfd840382fd`.

Incluyó:

- versión visible en login/sidebar/PDF;
- cobertura real separada de resolución;
- paradas resueltas visibles;
- jornada de ruta;
- atención clientes;
- promedio por visita;
- traslado/espera estimado claramente rotulado;
- Dashboard/ranking con semántica correcta;
- Reportes en pantalla con métricas explícitas;
- PDF Ejecutivo con fichas interpretables por vendedor;
- PDF con gestores separados;
- versión en pie de PDF;
- caché PWA V063.

## Fase J — V0.6.4 Cierre de jornada + distancia GPS

Commit productivo: `a8f114c24d447bbbc383fc549b837a1de42a78f8`.

Cloudflare Version ID: `9ec25487-eee2-432e-8d13-1c0b09c52028`.

Incluye:

- cierre parcial transaccional de jornada;
- motivo obligatorio para pendientes;
- `ended_at` y GPS final;
- congelación real de jornada;
- `closure_mode` y motivo global auditable;
- reprogramación con estado propio;
- KPI de resueltos coherente;
- banner de jornada cerrada;
- eliminación de acciones de inicio en ruta finalizada;
- distancia GPS estimada por tramos;
- `executive_daily_route_metrics`;
- alineación del día operativo de visitas de ruta;
- Inicio/Reportes/Excel/PDF alineados;
- PDF personal completo de Vendedor;
- corrección de Service Worker en desarrollo local;
- versión 0.6.4 / caché V064.

---

# 10. TIPO DE CLIENTE — CADENA / REGULAR

Campo oficial: `clients.client_type`.

Valores normalizados:

- `CADENA`
- `REGULAR`

No leer `source_data.Tipo` como fuente operativa cuando `client_type` ya está normalizado.

Selector común:

```text
Todos los tipos
CADENA
REGULAR
```

Asignación confirmada históricamente:

- 135 clientes `CADENA`.
- 135/135 asignados a **ROSMERY RIVAS** como cartera de gestión.
- Rosmery existe como empleado activo con perfil `Gestor`.
- No guardar contraseñas aquí.

---

# 11. PRUEBA E2E / DESFASE DE FECHA HISTÓRICO

Escenario de regresión:

- ruta con fecha 2026-08-24 iniciada físicamente la noche local del 2026-08-23 en versión anterior;
- `route_date/session_date` quedaron en 24;
- algunas visitas por timestamp local habían caído en 23.

V0.6.1+ impide iniciar rutas fuera de su fecha.

V0.6.4 además alinea reportería de visitas vinculadas a ruta con `session_date`, evitando divergencias entre Rutas y Reportes.

No borrar este escenario sin decidir si todavía se necesita como regresión.

---

# 12. DEPLOYMENT / WINDOWS / GITHUB DESKTOP

Flujo productivo confirmado:

1. desarrollar en rama feature;
2. build/CI;
3. prueba local;
4. PR;
5. validación usuario;
6. merge `main`;
7. GitHub Desktop → `main` → Fetch/Pull si corresponde;
8. `npm run build`;
9. `npm run deploy`;
10. registrar Cloudflare Version ID;
11. actualizar este handoff;
12. `Ctrl + F5` en producción si cambia frontend/PWA.

Entorno local observado:

`C:\Users\KARAKA-PC\Documents\GitHub\Gestion_de_Ventas_Diaria`

- GitHub Desktop funciona.
- CMD normal: `git` no está en PATH.
- `npm` funciona.
- usar GitHub Desktop para ramas/fetch/pull.

## Pruebas locales

Comando normal:

```bat
npm run dev
```

Para aislamiento adicional:

```bat
npm run dev -- --host 127.0.0.1
```

V0.6.4 evita que el SW productivo controle localhost/127.0.0.1.

## Stash local

GitHub Desktop mantiene `Stashed Changes` de una modificación previa relacionada con `package-lock.json`.

- no restaurar;
- no eliminar;
- no commitear;
- no descartar accidentalmente;
- `package-lock.json` no forma parte del repo actualmente.

## Warning Vite

El build avisa que el chunk principal supera 500 kB. No bloquea build/deploy. Code splitting queda pendiente técnico no crítico.

---

# 13. CUÁNDO LOS USUARIOS DEBEN CERRAR/ACTUALIZAR LA APP

### Frontend/visual

- pueden seguir trabajando;
- después de deploy usar `Ctrl + F5` o reabrir;
- normalmente no requiere logout.

### Auth/RLS/base/reglas críticas

- coordinar ventana breve;
- evitar operaciones críticas durante el cambio;
- puede requerir logout/login.

### Rutas/visitas activas

Evitar deploy de cambios operativos profundos mientras haya visitas abiertas o rutas activas, salvo cambio estrictamente visual confirmado como seguro.

Antes de cada release indicar explícitamente:

- `Pueden seguir trabajando`;
- `Actualizar página después del deploy`;
- `Cerrar app temporalmente`.

---

# 14. SUPABASE / MIGRACIONES — REGLA DE SEGURIDAD

Nunca asumir que archivos `supabase/migrations` y `supabase_migrations.schema_migrations` tienen ledger idéntico.

Antes de cualquier DDL:

1. inspeccionar objetos reales;
2. revisar columnas/constraints/triggers/functions/views;
3. consultar ledger;
4. comparar con GitHub;
5. crear solo migración incremental necesaria.

No ejecutar replay masivo, `db push` ciego ni recreación destructiva de vistas/RLS.

---

# 15. EDGE FUNCTIONS / STORAGE

Edge Functions históricamente activas:

- `login-by-username`
- `master-import`
- `admin-users`
- `request-password-reset`
- `verify-password-reset`

Storage principal: bucket privado `karaka-photos`.

Riesgos a auditar cuando corresponda:

- lectura Storage para autenticados;
- grants SECURITY DEFINER;
- alineación RLS/perfiles;
- aislamiento backend del Reporte Ejecutivo.

No modificar estas áreas como limpieza incidental.

---

# 16. DATOS DE PRUEBA / REGRESIÓN

Se conservaron datos operacionales útiles.

## Ruta Eduar 2026-08-24

- plan ID: `cb62f285-baeb-4180-9101-ff4f09dd1d2a`.
- sesión ID: `e894b7d9-1ee8-4b2b-95d3-e0871e0b2b3f`.
- plan: `FINALIZADA`.
- sesión: `FINALIZADA`.
- `closure_mode`: `PARCIAL`.
- motivo: `FIN_JORNADA`.
- pendientes resueltos al cierre: 17.
- planificados: 22.
- visitados: 4.
- no visitados: 18.
- pendientes: 0.
- resueltos: 22.
- jornada: ~13 h 10 min.
- atención: ~4 min.
- distancia estimada: 4.18 km.
- tramos GPS: 5.

## Otros datos de regresión

- ruta Rendy Mejias 2026-08-24, 19 planificados, sin ejecución en la última validación.
- cita/showroom gestionada por Evelyn.
- compra showroom histórica de prueba RD$355,500.
- solicitud La Sirena recuperada tras corrección de showroom sin Gestor.

No borrar únicamente para “limpiar” sin decidir si siguen siendo necesarios para regresión.

---

# 17. RIESGOS CONOCIDOS

## Alta prioridad técnica

- alineación `access_profile/permission_overrides` ↔ `app_role/RLS`;
- aislamiento backend del Reporte Ejecutivo;
- ledger de migraciones;
- cambios de seguridad no auditados.

## Media

- lockfile/reproducibilidad;
- code splitting;
- Storage;
- leaked-password protection/Auth;
- `main` sin protección formal;
- CORS Edge Functions cuando corresponda.

## Funcional pendiente

- Cobertura cartera: actividad vs cumplimiento;
- sesiones administrativas / usuarios conectados;
- porcentajes de atención/traslado;
- visitas por hora de jornada;
- claridad UX `Resolución` vs `Cierre operativo`;
- distancia vial estimada futura si se decide integrar motor de rutas.

---

# 18. FUNCIONALIDADES TERMINADAS / CONFIRMADAS

- arquitectura React/TypeScript/Supabase;
- login por nick/Auth;
- usuarios/perfiles;
- clientes;
- mapa;
- planificación;
- rutas;
- GPS puntual;
- visitas;
- compra/no compra/pendiente;
- monto opcional;
- evidencias;
- captación;
- llamadas;
- cobertura base;
- agenda;
- recepción;
- showroom;
- responsable vs atendido por;
- calidad geográfica;
- importación/homologación;
- inteligencia ejecutiva;
- cronología;
- Excel/PDF;
- eventualidades;
- Gestor ↔ Vendedor en rutas;
- rendimiento Admin/Gestor;
- filtro CADENA/REGULAR;
- preservación showroom sin Gestor;
- bloqueo ejecución fuera de fecha;
- fix Leaflet/modales;
- Inicio y Reportes separados por Vendedores/Gestores;
- PDF ejecutivo corporativo;
- versión visible;
- Cobertura real vs Resolución;
- Jornada/Atención/Promedio/Traslado explícitos;
- cierre parcial controlado de jornada;
- congelación de tiempo por `ended_at`;
- motivo global auditable de cierre;
- distancia GPS geodésica estimada;
- alineación de día operativo de visitas de ruta;
- PDF personal completo de Vendedor;
- protección contra Service Worker viejo en desarrollo local;
- **V0.6.4 productiva**.
