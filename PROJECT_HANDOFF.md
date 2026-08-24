# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. Los servicios reales (GitHub, Supabase y Cloudflare) prevalecen si existiera una discrepancia.
>
> **Nunca incluir secretos, contraseñas, tokens, service keys, variables privadas ni credenciales sensibles.**

---

# 0. ESTADO ACTUAL — LEER PRIMERO

## Producción actual

- Aplicación: **Gestión de Ventas Diaria — Almacenes Karaka**
- Versión productiva: **V0.6.2**
- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`
- Rama estable: `main`
- Commit de **aplicación realmente desplegado**: `d0ada8a136fd031be203b8302dda43d5507adcf2`
- Commit: `Merge PR #19: V0.6.2 rediseño ejecutivo y correcciones UX`
- URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID V0.6.2: `84c647cc-a990-49e7-8560-efe79b75a302`
- Cloudflare Version ID V0.6.1 anterior: `84bf2469-2d57-491c-8b24-f4becc02a36a`
- Cloudflare Version ID V0.6.0 histórico: `e317d9c0-458e-4d96-887a-a7f6e60926b9`
- Referencia de rollback histórica adicional: `c68281bc-2a59-4903-89c3-c1e944a5bb1e`
- Deploy V0.6.2: **manual desde Windows con `npm run deploy` / Wrangler 4.125.0**.
- Build V0.6.2 validado localmente: `npm run build` SUCCESS.
- Build V0.6.2 validado por GitHub Actions: `Build validation` SUCCESS.
- PR V0.6.2: `#19`.
- `package.json`: `0.6.2`.
- caché PWA: `gvd-shell-v062`.

### Importante sobre `main`

Después del commit de aplicación desplegado, `main` puede avanzar por commits **solo documentales** como este `PROJECT_HANDOFF.md`. Eso no significa que Cloudflare esté ejecutando el último commit documental. La referencia de código productivo sigue siendo el commit de aplicación indicado arriba hasta el próximo deploy confirmado.

## Supabase actual

- Proyecto: `ccvzosnhxitfeochnflr`
- PostgreSQL observado: 17.6.1
- Región observada: `ca-central-1`
- Backend central multiusuario: PostgreSQL + Auth + RLS + Storage + PostGIS + Edge Functions.
- No depender de `localStorage` para persistencia operacional compartida.
- V0.6.2 fue principalmente frontend/reportería; **no introdujo DDL nuevo**.

---

# 1. PRÓXIMA ITERACIÓN PROPUESTA

## V0.6.3 — métricas operativas reales + reglas pendientes + control administrativo

### Bloque A — Métricas de jornada/ruta de Vendedores

Construir la jornada mediante los eventos reales que ya existen:

```text
Inicio de ruta
→ llegada/inicio visita 1
→ salida/fin visita 1
→ llegada/inicio visita 2
→ salida/fin visita 2
→ ...
→ fin de ruta
```

Fuentes existentes verificadas:

- `route_sessions.started_at`
- `route_sessions.start_latitude / start_longitude`
- `route_sessions.ended_at`
- `route_sessions.end_latitude / end_longitude`
- `visits.started_at`
- `visits.start_latitude / start_longitude`
- `visits.ended_at`
- `visits.end_latitude / end_longitude`
- precisión GPS de inicio/fin de ruta y visitas.

KPIs recomendados:

- Jornada de ruta = fin ruta - inicio ruta.
- Tiempo de atención = suma de duración de visitas.
- Primer desplazamiento = inicio primera visita - inicio ruta.
- Tiempo entre clientes = inicio visita N+1 - fin visita N.
- Último tramo = fin ruta - fin última visita.
- Eventualidades = tiempo separado.
- Traslado/espera estimado = ventana de ruta - atención - eventualidades, mientras no exista tracking continuo.
- Promedio de atención por visita.
- Visitas por hora de jornada.
- % de jornada en atención.
- % de jornada en traslado/espera.
- % de jornada en eventualidades.

**No llamar “tiempo conduciendo” al intervalo entre visitas sin tracking continuo.** Puede incluir tráfico, estacionamiento, espera, pausa u otros tiempos.

### Bloque B — Distancia estimada por puntos GPS

Calcular una distancia estimada usando puntos capturados:

```text
Inicio ruta → visita 1
visita 1 → visita 2
...
última visita → fin ruta
```

Mostrar como:

- `Distancia estimada por puntos GPS`;
- Inicio → primer cliente;
- Entre clientes;
- Último cliente → fin;
- promedio km por visita.

**No llamarlo kilometraje exacto del vehículo.** La distancia directa entre puntos no necesariamente coincide con el recorrido por calles. Si más adelante se integra un motor de rutas, distinguir `distancia geodésica estimada` de `distancia vial estimada`.

### Bloque C — Cobertura real vs resolución de ruta

Hallazgo confirmado V0.6.2:

- el campo actual `route_compliance_pct` de `executive_daily_employee_summary` se calcula como `resolved_clients / planned_clients`;
- `resolved_clients` incluye estados resueltos, no solo visitas;
- por eso no debe rotularse como `Cobertura` cuando se quiere expresar `visitados / planificados`.

Definiciones recomendadas:

- **Cobertura real** = Visitados / Planificados.
- **Resolución de ruta** = paradas resueltas / Planificados.
- mantener ambas métricas visibles y claramente etiquetadas.

### Bloque D — Cobertura cartera

Separar dos dimensiones que hoy están mezcladas:

**Actividad**
- `GESTIONADO`
- `NUNCA GESTIONADO`

**Cumplimiento de frecuencia/meta**
- `CUMPLIDO`
- `PENDIENTE`
- `SIN META`

No redefinir `CUMPLIDO` como “tuvo una gestión”; debe seguir representando cumplimiento de meta cuando exista una meta.

### Bloque E — Cierre parcial controlado de rutas

Requisito:

Si un Vendedor gestionó 4 de 8 clientes, debe poder cerrar la jornada conservando la verdad operacional:

```text
Planificados: 8
Visitados: 4
Cobertura real: 50 %
Pendientes/no realizados: 4
Estado ruta: FINALIZADA
Motivo de cierre: registrado
```

Motivos sugeridos:

- fin de jornada / tiempo agotado;
- tráfico/retrasos;
- cambio de prioridad autorizado;
- clientes reprogramados;
- eventualidad;
- suspensión por supervisor;
- otro + observación obligatoria.

Nunca transformar pendientes en visitados para permitir cierre.

### Bloque F — Sesiones administrativas

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
- opcional: módulo funcional actual/último, si se diseña con necesidad operativa clara.

Diseño backend recomendado:

- tabla de sesiones operativas;
- evento de login;
- heartbeat controlado;
- actualización de última actividad;
- logout explícito;
- expiración por inactividad.

No inferir “en línea” solamente porque exista un token Auth vigente.

---

# 2. PROTOCOLO DE CONTINUIDAD PARA UN NUEVO CHAT

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

# 3. ARQUITECTURA OFICIAL

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

# 4. MÓDULOS Y RUTAS

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
- `src/context/AuthContext.tsx`
- `src/lib/access.ts`
- `src/lib/supabase.ts`
- `src/lib/export.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Routes.tsx`
- `src/pages/Visits.tsx`
- `src/pages/Calls.tsx`
- `src/pages/Agenda.tsx`
- `src/pages/Reception.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Admin.tsx`
- `src/styles/v062.css`
- `wrangler.jsonc`
- `package.json`
- `supabase/migrations/*`
- `supabase/functions/*`

---

# 5. PERFILES, ACCESO Y RLS

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

# 6. MODELO DE DATOS OPERACIONAL

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

Las vistas ejecutivas verificadas usan `security_invoker=true`; revalidar antes de cambios de seguridad.

## Lógica ejecutiva actual relevante

`executive_daily_employee_summary` calcula actualmente:

- `route_window_seconds`: duración de sesiones de ruta;
- `visit_seconds`: suma de atención en visitas;
- `incident_seconds`: eventualidades;
- `transit_wait_estimated_seconds = route_window_seconds - visit_seconds - incident_seconds`, con mínimo 0;
- `operational_seconds`: limitado a la ventana identificada de actividad;
- `route_compliance_pct = resolved_clients / planned_clients`.

Por esto `transit_wait_estimated_seconds` es **traslado/espera estimado**, no conducción pura, y `route_compliance_pct` es **resolución**, no cobertura estricta de visitas.

---

# 7. REGLAS DE NEGOCIO QUE NO DEBEN PERDERSE

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
15. V0.6.2 mantiene la regla actual: pendientes deben justificarse antes del cierre normal; cierre parcial controlado sigue pendiente.
16. Filtro `CADENA / REGULAR` en Rutas es visual y no debe falsear el cierre operacional.
17. No llamar “kilómetros recorridos exactos” a una suma de distancias entre puntos GPS.

---

# 8. HISTORIAL DE FASES / RELEASES

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
- bloqueo de inicio fuera de fecha.

## Fase D — Visitas, llamadas y cobertura

Consolidado:

- llegada/salida y GPS;
- llamadas;
- resultado comercial;
- fotos/evidencia;
- frecuencia;
- cobertura base;
- jornada libre.

Pendiente: separar actividad de cumplimiento de meta.

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

Migraciones GitHub V0.6.1 aplicadas funcionalmente:

- `20260824030500_v061_operational_date_and_showroom_routing.sql`
- `20260824033500_v061_client_type_filters.sql`

Advertencia: GitHub ↔ ledger `supabase_migrations.schema_migrations` no es necesariamente 1:1. Nunca hacer replay ciego.

## Fase H — V0.6.2 Rediseño ejecutivo y UX

Commit productivo: `d0ada8a136fd031be203b8302dda43d5507adcf2`.

Cloudflare Version ID: `84c647cc-a990-49e7-8560-efe79b75a302`.

Validado por usuario y build/CI.

Incluye:

- fix Leaflet/modales mediante jerarquía de capas;
- `No visitado` ya no queda cubierto por el mapa;
- `Registrar eventualidad` ya no queda cubierto por el mapa;
- login neutro: `Ingrese su usuario`;
- Inicio separado por Vendedores y Gestores;
- gráficos distintos para operación de calle y CRM/Showroom;
- rankings separados por función;
- bloque corporativo con logo Karaka;
- Reporte Ejecutivo separado por Vendedores/Gestores;
- KPI/medidores profesionales;
- PDF Inicio corporativo con logo, KPI, gráficos y ranking por función;
- PDF Reporte Ejecutivo corporativo con páginas separadas para Vendedores y Gestores;
- caché PWA V062.

Hallazgo post-validación:

- algunos lugares rotulan `route_compliance_pct` como `Cobertura`;
- ejemplo: 1 visitado de 22 puede no coincidir con el porcentaje mostrado porque la métrica usa paradas resueltas;
- corregir semántica en V0.6.3 separando Cobertura real y Resolución.

---

# 9. TIPO DE CLIENTE — CADENA / REGULAR

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

Asignación confirmada:

- 135 clientes `CADENA`.
- 135/135 asignados a **ROSMERY RIVAS** como cartera de gestión.
- Rosmery existe como empleado activo con perfil `Gestor`.
- `auth_user_id` seguía sin enlazar en la última verificación previa; primer acceso se encarga de activar/enlazar Auth.
- No guardar contraseñas aquí.

---

# 10. PRUEBA E2E / DESFASE DE FECHA HISTÓRICO

Escenario de regresión:

- ruta con fecha 2026-08-24 iniciada físicamente la noche local del 2026-08-23 en versión anterior;
- `route_date/session_date` quedaron en 24;
- visitas/showroom por timestamp local quedaron en 23.

V0.6.1+ bloquea que vuelva a ocurrir.

No reinterpretar ese dato histórico como actividad perdida; sirve como regresión.

---

# 11. DEPLOYMENT / WINDOWS / GITHUB DESKTOP

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

# 12. CUÁNDO LOS USUARIOS DEBEN CERRAR/ACTUALIZAR LA APP

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

# 13. SUPABASE / MIGRACIONES — REGLA DE SEGURIDAD

Nunca asumir que archivos `supabase/migrations` y `supabase_migrations.schema_migrations` tienen ledger idéntico.

Antes de cualquier DDL:

1. inspeccionar objetos reales;
2. revisar columnas/constraints/triggers/functions/views;
3. consultar ledger;
4. comparar con GitHub;
5. crear solo migración incremental necesaria.

No ejecutar replay masivo, `db push` ciego ni recreación destructiva de vistas/RLS.

---

# 14. EDGE FUNCTIONS / STORAGE

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

# 15. DATOS DE PRUEBA / REGRESIÓN

Se conservaron datos operacionales útiles:

- rutas Eduar Ceballos y Rendy Mejias para 2026-08-24;
- visitas realizadas por Eduar;
- cita/showroom gestionada por Evelyn;
- compra showroom histórica de prueba RD$355,500;
- solicitud La Sirena recuperada tras corrección de showroom sin Gestor.

No borrar únicamente para “limpiar” sin decidir si siguen siendo necesarios para regresión.

---

# 16. RIESGOS CONOCIDOS

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

- Cobertura real vs Resolución;
- Cobertura cartera: actividad vs cumplimiento;
- cierre parcial de rutas;
- jornada/atención/traslado por tramos;
- distancia estimada GPS;
- sesiones administrativas.

---

# 17. FUNCIONALIDADES TERMINADAS / CONFIRMADAS

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
- **V0.6.2 productiva**.

---

# 18. CHECKLIST ANTES DE CUALQUIER ITERACIÓN

Antes de modificar:

- [ ] Leer este handoff.
- [ ] Verificar `main` y commit de aplicación desplegado.
- [ ] Crear/usar rama feature nueva.
- [ ] Confirmar producción actual.
- [ ] Consultar Supabase si toca datos/SQL/Auth.
- [ ] No borrar regresión sin autorización.
- [ ] No tocar RLS/migraciones por intuición.
- [ ] Definir si usuarios pueden seguir trabajando.

Antes de merge/deploy:

- [ ] `npm run build` exitoso.
- [ ] CI verde.
- [ ] prueba local por rol afectado.
- [ ] usuario valida.
- [ ] PR describe cambios y pendientes.
- [ ] merge `main`.
- [ ] Fetch/Pull local.
- [ ] `npm run build`.
- [ ] `npm run deploy`.
- [ ] registrar Cloudflare Version ID.
- [ ] actualizar este handoff.

---

# 19. SIGUIENTE PASO RECOMENDADO

No modificar producción directamente.

Crear una rama nueva desde `main` estable V0.6.2 para V0.6.3 y abordar por bloques controlados:

1. Cobertura real vs Resolución de ruta.
2. Jornada de ruta / atención / traslado-espera por tramos.
3. Distancia estimada por puntos GPS.
4. Cobertura cartera: Gestionado vs Cumplimiento.
5. Cierre parcial controlado de rutas.
6. Sesiones administrativas.

Los bloques 1–3 están relacionados y conviene diseñarlos juntos para que Inicio, Rutas, Reportes y PDF compartan la misma definición de métricas.

---

**Último estado documentado:** V0.6.2 productiva, 24/08/2026.