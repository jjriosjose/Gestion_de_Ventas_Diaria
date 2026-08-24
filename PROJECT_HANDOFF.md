# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Su función es permitir retomar el desarrollo con seguridad en otro chat, otra sesión o después de una pausa larga. Los servicios reales (GitHub, Supabase y Cloudflare) prevalecen sobre este documento si existiera una discrepancia.
>
> **Nunca incluir aquí secretos, contraseñas, tokens, service keys, variables privadas ni credenciales sensibles.**

---

# 0. ESTADO ACTUAL — LEER PRIMERO

## Producción actual

- Aplicación: **Gestión de Ventas Diaria — Almacenes Karaka**
- Versión productiva: **V0.6.1**
- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`
- Rama estable: `main`
- Commit de **aplicación realmente desplegado**: `ca6a6b8fb35eda5463b17575197089e3f34eabae`
- Commit: `Merge PR #18: V0.6.1 cierre de inconsistencias operativas`
- URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID V0.6.1: `84bf2469-2d57-491c-8b24-f4becc02a36a`
- Versión productiva anterior V0.6.0: Cloudflare `e317d9c0-458e-4d96-887a-a7f6e60926b9`
- Referencia de rollback histórica adicional: `c68281bc-2a59-4903-89c3-c1e944a5bb1e`
- Deploy V0.6.1: **manual desde Windows con `npm run deploy` / Wrangler**.
- Build V0.6.1 validado localmente y por GitHub Actions.
- GitHub Actions del último commit de feature antes del merge: `Build validation` SUCCESS y `Generate territorial GeoJSON` SUCCESS.

### Importante sobre `main`

Después del commit de aplicación desplegado `ca6a6b8...`, `main` puede avanzar por commits **solo documentales** como este `PROJECT_HANDOFF.md`. Eso **no significa** que Cloudflare esté ejecutando ese último commit documental. Para producción, la referencia de código desplegado sigue siendo el commit de aplicación indicado arriba hasta el próximo deploy confirmado.

## Supabase actual

- Proyecto: `ccvzosnhxitfeochnflr`
- PostgreSQL observado: 17.6.1
- Región observada: `ca-central-1`
- Backend central multiusuario: PostgreSQL + Auth + RLS + Storage + PostGIS + Edge Functions.
- No depender de `localStorage` para persistencia operacional compartida.

## Próxima iteración propuesta

### V0.6.2 — UX/UI + inteligencia gerencial visual

Prioridad propuesta:

1. Corregir bug Leaflet/mapa que se superpone sobre modales de **Eventualidad** y **No visitado**.
2. Quitar placeholder personal `Ej. Jrios` del login; usar texto neutro/profesional o placeholder vacío.
3. Separar en **Inicio** el ranking de `Vendedores` y `Gestores`.
4. Rediseñar Inicio con bloques KPI profesionales diferenciando operación de calle y CRM/Showroom.
5. Rediseñar Reporte Ejecutivo en pantalla y PDF:
   - Vendedores separados de Gestores.
   - logo Karaka;
   - KPI cards;
   - iconografía;
   - gráficos;
   - barras/medidores de cumplimiento;
   - jerarquía empresarial.
6. Rediseñar PDF del módulo Inicio para que no sea una tabla simple y pueda incorporar gráficos/resumen ejecutivo.
7. Revisar Reportes para que los medidores/KPI tengan apariencia profesional empresarial.

### V0.6.3 — reglas operativas/analíticas + control administrativo

1. Corregir semántica de **Cobertura cartera** separando:
   - `Gestionado / Nunca gestionado`;
   - `Cumplido / Pendiente / Sin meta`.
2. Permitir **cierre parcial controlado de rutas**:
   - ejemplo 4 visitados de 8 = 50 % cobertura;
   - guardar pendientes/no realizados;
   - motivo de cierre obligatorio cuando corresponda;
   - no inventar visitas;
   - no perder pendientes.
3. Crear trazabilidad administrativa de **sesiones de usuarios**:
   - conectado / inactivo / desconectado;
   - login;
   - última actividad;
   - duración;
   - logout/timeout;
   - historial administrativo.

> La numeración V0.6.2/V0.6.3 es roadmap recomendado, no código ya implementado.

---

# 1. PROTOCOLO DE CONTINUIDAD PARA UN NUEVO CHAT

Si este chat termina o se debe continuar en otro, iniciar el nuevo chat con una instrucción similar a:

> **“Continúa el proyecto Gestión de Ventas Diaria. Revisa primero `PROJECT_HANDOFF.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`, valida el estado actual de `main`, Supabase y producción, y explícame el estado antes de realizar cambios. No ejecutes modificaciones hasta confirmar que entendiste el punto de continuidad.”**

El nuevo chat debe seguir este orden:

1. Leer `PROJECT_HANDOFF.md` completo.
2. Verificar GitHub `main` y distinguir:
   - último commit de documentación;
   - último commit de aplicación desplegado.
3. Consultar Supabase antes de asumir estructura, datos, migraciones, RLS o estado operacional.
4. Verificar producción/Cloudflare cuando sea relevante.
5. Confirmar qué fase está activa y qué tareas están pendientes.
6. Trabajar en rama feature; no modificar `main` productivo directamente para código de app.
7. Build + prueba local + PR + validación del usuario antes de merge/deploy.

## Política de mantenimiento de este handoff

Actualizar este documento:

- al cerrar cada release productivo;
- cuando cambie una regla crítica de negocio;
- después de cambios importantes de arquitectura/base de datos/autenticación;
- cuando se cree un nuevo rol/flujo que cambie la operación;
- cuando aparezca un bug relevante que deba sobrevivir a otro chat;
- antes de abandonar una conversación larga.

**No actualizarlo después de cada clic o microcambio.** Debe ser una memoria técnica útil, no un log ruidoso.

---

# 2. ARQUITECTURA OFICIAL

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
- navegación externa mediante Google Maps URLs cuando corresponde

La arquitectura React/TypeScript/Supabase es la base oficial. Prototipos monolíticos anteriores tipo `index.html`/VisitFlow son solo referencia histórica y no deben reemplazar esta arquitectura.

---

# 3. MÓDULOS Y RUTAS

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
- `src/pages/Dashboard.tsx`
- `src/pages/Routes.tsx`
- `src/pages/Visits.tsx`
- `src/pages/Calls.tsx`
- `src/pages/Agenda.tsx`
- `src/pages/Reception.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Admin.tsx`
- `wrangler.jsonc`
- `package.json`
- `supabase/migrations/*`
- `supabase/functions/*`

---

# 4. PERFILES, ACCESO Y RLS

Perfiles frontend:

- Administrador
- Supervisor
- Gestor
- Vendedor
- Recepcion
- SoloLectura

Permisos relevantes incluyen:

`dashboard.view`, `clients.view/edit`, `map.view`, `planning.view/manage`, `routes.view/execute`, `capture.view/create`, `coverage.view`, `visits.view/execute`, `calls.view/manage`, `agenda.view/manage`, `reception.view/manage`, `reports.view`, `data_quality.view`, `admin.import`, `admin.portfolio`, `admin.users.manage`, `settings.view`.

Regla crítica:

- `access_profile` + `permission_overrides` gobiernan frontend.
- `app_role` y funciones privadas siguen participando en RLS/seguridad SQL.
- RLS es la autorización efectiva del backend.
- **No “arreglar” una capa aislada** sin revisar las demás.

Funciones históricamente relevantes:

- `private.current_employee_id()`
- `private.is_admin()`
- `private.can_manage_employee()`
- `private.employee_has_permission()`
- `private.current_user_has_permission()`

Riesgo permanente: frontend y RLS no deben asumirse equivalentes sin auditoría.

---

# 5. MODELO DE DATOS OPERACIONAL

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

---

# 6. REGLAS DE NEGOCIO QUE NO DEBEN PERDERSE

1. Supabase es persistencia central multiusuario.
2. Preservar literalmente `V-CARTERA` y `G-CARTERA` de importaciones maestras.
3. Asignaciones manuales deben protegerse de reimportaciones automáticas.
4. No autocorregir provincia/municipio/región solo porque GPS discrepe del maestro.
5. GPS es puntual en eventos; no hay obligación de tracking continuo.
6. Solo una visita abierta por empleado.
7. Resultado comercial de visita requiere elección explícita:
   - `COMPRO`
   - `NO_COMPRO`
   - `PENDIENTE`
8. `purchase_amount` es opcional; `null` no equivale a RD$0 confirmado.
9. `manager_employee_id` de showroom = responsable asignado; `attended_by_employee_id` = quien realmente atendió.
10. Un Gestor debe ver sus clientes dentro de rutas de Vendedores de manera genérica; no hard-codear personas.
11. Una intención de showroom no puede perderse porque el cliente no tenga Gestor asignado.
12. Una ruta planificada para fecha futura/pasada **no puede iniciarse fuera de su fecha programada**.
13. Una cita futura no debe poder registrarse como llegada física antes de su fecha mediante el flujo normal.
14. No cerrar una ruta con visita abierta o eventualidad activa.
15. Estado actual V0.6.1: pendientes de ruta todavía deben justificarse antes del cierre; el roadmap propone cierre parcial controlado.

---

# 7. HISTORIAL DE FASES DEL PROYECTO

## Fase A — Arquitectura/base multiusuario

Completado/consolidado:

- migración desde prototipos monolíticos hacia React/TypeScript;
- Supabase como backend central;
- Cloudflare como hosting;
- navegación modular;
- roles/perfiles;
- login por usuario/nick;
- persistencia multiusuario.

## Fase B — Maestro de clientes, mapa y territorio

Completado/consolidado:

- cartera central de clientes;
- vendedor/gestor asignados;
- mapa;
- coordenadas;
- regiones/provincias/municipios;
- calidad geográfica;
- regla de no autocorregir maestro solo por GPS;
- filtros territoriales.

Pendiente permanente:

- seguir fortaleciendo calidad/cartografía sin correcciones automáticas inseguras.

## Fase C — Planificación y rutas

Completado:

- planificación por fecha;
- rutas por Vendedor;
- secuencia/paradas;
- mapa de ruta;
- navegación externa;
- ejecución con GPS;
- una ruta activa por contexto permitido;
- excepciones de parada;
- eventualidades;
- visualización Gestor ↔ Vendedor;
- V0.6.1 añadió rendimiento de ruta.

V0.6.1 validado:

- Admin ve cobertura total de ruta.
- Gestor ve cobertura calculada solo sobre sus clientes dentro de la ruta.
- estados visibles: Visitado / En visita / Pendiente / No visitado.
- filtro `CADENA / REGULAR` funciona en Rutas.
- filtro visual no altera la lógica real de cierre de la ruta.
- bloqueo de inicio fuera de fecha.

Pendiente futuro:

- cierre parcial controlado de ruta.

## Fase D — Visitas, llamadas y cobertura

Completado:

- visitas con llegada/salida y GPS;
- llamada de Gestores;
- resultado comercial;
- fotos/evidencia;
- frecuencia de gestión;
- cobertura de cartera;
- jornada libre.

Hallazgo vigente:

`Cobertura cartera` confunde dos conceptos:

- **actividad realizada**;
- **cumplimiento de una meta/frecuencia**.

Ejemplo confirmado: existen visitas y una llamada real de prueba, pero como la frecuencia mensual está en 0 los clientes permanecen `SIN_META` y filtrar `CUMPLIDO` devuelve 0.

Solución futura:

- Actividad: `GESTIONADO / NUNCA GESTIONADO`.
- Cumplimiento: `CUMPLIDO / PENDIENTE / SIN META`.

## Fase E — Agenda, recepción y showroom

Flujo consolidado:

```text
intención → pendiente validación → contacto → confirmación/reprogramación
→ llegada → atención → resultado → fin atención → salida
```

Completado:

- citas;
- validación por Gestor;
- recepción/check-in;
- showroom;
- compra/no compra;
- monto;
- seguimiento;
- gestor asignado vs gestor que atendió.

V0.6.1 corrigió:

- solicitud de showroom no se pierde si falta Gestor;
- escalamiento/cola pendiente;
- reasignación al Gestor oficial;
- alerta correspondiente;
- misma protección en Visitas y Llamadas.

## Fase F — Inteligencia ejecutiva V0.6.0

V0.6.0 introdujo:

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

Estimaciones de llamadas sin duración real:

- `NO_CONTESTA`: 90 s
- `OCUPADO`: 45 s
- `TELEFONO_INCORRECTO`: 60 s
- otros: 300 s

## Fase G — Estabilización V0.6.1

Commit desplegado: `ca6a6b8fb35eda5463b17575197089e3f34eabae`.

Incluye:

- versión `package.json` = `0.6.1`;
- caché PWA renovada `gvd-shell-v061`;
- PDF ejecutivo legible;
- Dashboard migrado a lógica ejecutiva;
- ventas/showroom/compras integradas;
- actividad de Gestores visible en inteligencia;
- realtime/actualización ampliada;
- bloqueo de rutas fuera de fecha;
- control de citas futuras;
- preservación de intención showroom sin Gestor;
- filtro de tipo de cliente `Todos / CADENA / REGULAR` en módulos operativos principales;
- rendimiento de rutas para Admin y Gestor;
- corrección de fecha local RD para jornada libre;
- filtro `client_type` añadido a cobertura mediante vista actualizada.

Archivos de migración V0.6.1 en GitHub:

- `20260824030500_v061_operational_date_and_showroom_routing.sql`
- `20260824033500_v061_client_type_filters.sql`

**Advertencia:** una verificación posterior del ledger `supabase_migrations.schema_migrations` no devolvió esos números de versión, aunque las operaciones/migraciones fueron aplicadas y sus efectos vivos fueron verificados. Mantener la regla: **GitHub ↔ ledger Supabase no es necesariamente 1:1**. Nunca hacer replay ciego.

---

# 8. TIPO DE CLIENTE — CADENA / REGULAR

Campo oficial de Supabase:

- `clients.client_type`

Valores normalizados observados:

- `CADENA`
- `REGULAR`

No leer `source_data.Tipo` como fuente operativa cuando `client_type` ya está normalizado.

V0.6.1 incorporó selector común:

```text
Todos los tipos
CADENA
REGULAR
```

Uso previsto:

- Clientes: filtro real.
- Mapa: filtro real.
- Planificación: afecta selección de clientes.
- Rutas: filtro visual; no altera cierre real.
- Cobertura: filtro real.
- Visitas/Llamadas/Agenda/Recepción: filtro/identificación según contexto.

Asignación vigente confirmada:

- 135 clientes `CADENA` en el maestro.
- 135/135 asignados como cartera de gestión a **ROSMERY RIVAS**.
- Rosmery existe como empleado activo con perfil `Gestor`.
- Su `auth_user_id` seguía sin enlazar en la última verificación; el flujo de primer acceso es el encargado de activar/enlazar Auth.
- **No guardar contraseñas ni credenciales de acceso en este documento.**

---

# 9. PRUEBA E2E QUE DETECTÓ EL DESFASE DE FECHA

Durante pruebas previas se creó una ruta con fecha `2026-08-24` y se inició físicamente durante la noche local del `2026-08-23`. La versión anterior lo permitía.

Consecuencia:

- `route_date/session_date` quedaron en 24;
- visitas/showroom reales por timestamp local quedaron en 23;
- Inicio/Reporte podían mostrar partes del mismo flujo en días diferentes.

V0.6.1 evita que se repita mediante bloqueo en frontend y backend.

Este escenario histórico puede seguir existiendo en datos de prueba y es útil como regresión; no reinterpretarlo como actividad perdida.

---

# 10. DASHBOARD / INICIO — ESTADO V0.6.1 Y MEJORA PENDIENTE

V0.6.1:

- usa inteligencia ejecutiva en lugar de las vistas diarias antiguas como fuente principal;
- muestra Planificados, Visitados, Compras, Ventas, Llamadas, Citas/Showroom, Captaciones y Rutas;
- incorpora actividad de Gestores.

Pendiente V0.6.2:

- separar visualmente ranking de `Vendedores` y `Gestores`;
- Vendedores: visitas, cobertura, compras, ventas, rutas.
- Gestores: llamadas, contactos, citas, showroom, compras showroom, ventas showroom, conversión.
- mejorar gráficos y medidores empresariales.

---

# 11. REPORTES Y PDF — ESTADO Y ROADMAP

## V0.6.1

El PDF Ejecutivo fue corregido para evitar columnas comprimidas/verticales.

Incluye dos bloques/páginas principales:

- resumen por colaborador;
- tiempos/productividad.

La exportación genérica sigue disponible para otros reportes.

## Mejora V0.6.2

El usuario pidió un rediseño más corporativo:

- logo Karaka;
- separación Vendedores / Gestores;
- KPI cards;
- iconos;
- gráficos;
- medidores;
- colores y jerarquía empresarial;
- pie y paginación profesionales;
- PDF de Inicio con gráficos, no una tabla simple.

No mezclar métricas incompatibles de Vendedores y Gestores en un mismo ranking competitivo.

---

# 12. EVENTUALIDADES / MODALES — BUG VISUAL PENDIENTE

Bug reproducido visualmente:

- al abrir `Registrar incidencia`;
- o `Excepción de parada / No visitado`;

Leaflet aparece por encima del formulario/modal y puede mostrar un mapa mundial superpuesto.

Solución recomendada V0.6.2:

- corregir stacking context / `z-index`;
- contener mapa con `overflow:hidden`;
- asegurar capas Leaflet debajo del contenido modal;
- ejecutar `invalidateSize()` después de montar/abrir;
- centrar mapa en cliente/ruta/GPS, no mapa mundial por defecto.

---

# 13. LOGIN — MEJORA PENDIENTE

El formulario actualmente usa un ejemplo personal `Ej. Jrios`.

Cambiar en V0.6.2 por una opción neutra/profesional, preferentemente:

- label `Usuario`;
- placeholder `Ingrese su usuario` o vacío.

No usar nombres personales como ejemplo fijo.

---

# 14. CIERRE PARCIAL DE RUTAS — DISEÑO FUTURO

Situación actual V0.6.1:

- una ruta con pendientes no se cierra normalmente hasta que las paradas queden justificadas;
- eventualidad grave puede justificar pendientes masivamente.

Requisito futuro:

Si el Vendedor gestionó 4 de 8, debe poder cerrar jornada conservando la verdad operacional:

```text
Planificados: 8
Visitados: 4
No realizados / pendientes justificados: 4
Cobertura final: 50 %
Estado: FINALIZADA
Motivo de cierre: registrado
```

Motivos sugeridos:

- fin de jornada / tiempo agotado;
- tráfico/retrasos;
- cambio de prioridad autorizado;
- clientes reprogramados;
- eventualidad;
- suspensión por supervisor;
- otro + observación.

Nunca transformar pendientes en visitados para permitir cierre.

---

# 15. ADMINISTRACIÓN — SESIONES DE USUARIOS (PENDIENTE)

Requisito futuro del Administrador:

- quién está conectado;
- rol/perfil;
- hora de login;
- última actividad;
- duración actual;
- estado conectado/inactivo/desconectado;
- historial de sesiones;
- logout / timeout;
- opcionalmente módulo/última ruta funcional visitada si se diseña respetando privacidad y necesidad operativa.

Diseño backend recomendado:

- tabla de sesiones operativas;
- evento de login;
- heartbeat controlado;
- actualización de última actividad;
- logout explícito;
- expiración por inactividad.

No inferir “en línea” únicamente por tener un token Auth vigente.

---

# 16. DEPLOYMENT / WINDOWS / GITHUB DESKTOP

Flujo productivo confirmado:

1. desarrollar en rama feature;
2. build/CI;
3. prueba local;
4. PR;
5. validación del usuario;
6. merge a `main`;
7. GitHub Desktop → `main` → Fetch/Pull;
8. `npm run build`;
9. `npm run deploy`;
10. validar Cloudflare Version ID;
11. `Ctrl + F5` en producción si cambia frontend/PWA.

## Entorno local conocido

Ruta local observada:

`C:\Users\KARAKA-PC\Documents\GitHub\Gestion_de_Ventas_Diaria`

GitHub Desktop funciona correctamente.

En CMD normal, `git` **no está en PATH** y devuelve “git no se reconoce...”. No depender de comandos Git CLI salvo que se configure expresamente; usar GitHub Desktop para ramas/fetch/pull.

`npm` sí funciona.

## Stash local

GitHub Desktop muestra `Stashed Changes` de una modificación local previa (relacionada con `package-lock.json`).

- `main` quedó con 0 cambios locales al deploy V0.6.1.
- No restaurar, eliminar, commitear ni descartar ese stash accidentalmente.
- `package-lock.json` no forma parte del repo actualmente.

## Advertencia de Vite

El build emite warning por chunk principal >500 kB. No bloquea build/deploy. Optimización por code splitting queda pendiente técnica, no crítica.

---

# 17. CUÁNDO LOS USUARIOS DEBEN CERRAR/ACTUALIZAR LA APP

Regla operativa:

### Frontend/visual solamente

Ejemplos: estilos, rankings, reportes, PDF, iconos, placeholder, gráficos.

- usuarios pueden seguir trabajando;
- después del deploy usar `Ctrl + F5` o reabrir app;
- normalmente no requiere logout.

### Cambios Auth/RLS/base de datos/reglas críticas

- coordinar una ventana breve;
- evitar operaciones críticas durante el cambio;
- puede requerir logout/login.

### Rutas/visitas activas

Evitar deploy de cambios operativos profundos mientras haya visitas abiertas o rutas activas, salvo que el cambio sea estrictamente visual y esté confirmado como seguro.

Antes de cada release se debe indicar explícitamente una de estas instrucciones:

- `Pueden seguir trabajando`;
- `Actualizar página después del deploy`;
- `Cerrar app temporalmente`.

---

# 18. SUPABASE / MIGRACIONES — REGLA DE SEGURIDAD

Nunca asumir que los archivos de `supabase/migrations` y `supabase_migrations.schema_migrations` tienen ledger idéntico.

Antes de cualquier DDL:

1. inspeccionar objetos reales;
2. revisar columnas/constraints/triggers/functions/views;
3. consultar ledger;
4. comparar con GitHub;
5. crear únicamente migración incremental necesaria.

No ejecutar:

- replay masivo;
- `db push` ciego;
- recreación destructiva de vistas/RLS sin auditoría.

---

# 19. EDGE FUNCTIONS / STORAGE

Edge Functions históricamente activas:

- `login-by-username`
- `master-import`
- `admin-users`
- `request-password-reset`
- `verify-password-reset`

El login por username usa activación inicial y posteriormente Supabase Auth.

Storage principal:

- bucket privado `karaka-photos`.

Riesgos de seguridad pendientes de auditoría:

- lectura de Storage para autenticados;
- grants de funciones SECURITY DEFINER;
- alineación real RLS/perfiles;
- aislamiento del Reporte Ejecutivo.

No modificar estas áreas como “limpieza” incidental.

---

# 20. ESTADO DE DATOS DE PRUEBA / REGRESIÓN

Durante las pruebas V0.6.1 se conservaron datos operacionales útiles como escenario de regresión.

Ejemplos históricos relevantes:

- rutas de Eduar Ceballos y Rendy Mejias para 2026-08-24;
- visitas realizadas por Eduar;
- cita/showroom gestionada por Evelyn;
- compra showroom confirmada por RD$355,500 en el escenario de prueba;
- solicitud de showroom de La Sirena que originalmente se perdió por no tener Gestor y fue recuperada como pendiente durante la corrección.

No borrar estos datos únicamente para “limpiar” sin decidir primero si siguen siendo necesarios para regresión.

---

# 21. RIESGOS CONOCIDOS

## Alta prioridad técnica

- alineación frontend `access_profile/permission_overrides` ↔ `app_role/RLS`;
- aislamiento real del Reporte Ejecutivo en backend;
- ledger de migraciones;
- cambios de seguridad no auditados.

## Media

- lockfile/reproducibilidad;
- code splitting por bundle grande;
- eventualidades E2E completas;
- Storage;
- leaked-password protection / configuración Auth a revisar;
- `main` sin estrategia formal de protección si sigue así;
- CORS efectivo de Edge Functions a auditar cuando corresponda.

## UX/funcional actual

- mapa Leaflet sobre modales;
- Cobertura no separa actividad de cumplimiento;
- reportes/rankings mezclan Vendedores y Gestores;
- PDF Inicio simple;
- falta cierre parcial de rutas;
- falta registro administrativo de sesiones.

---

# 22. FUNCIONALIDADES TERMINADAS / CONFIRMADAS

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
- inteligencia ejecutiva V0.6;
- cronología;
- Excel/PDF;
- eventualidades base;
- Gestor ↔ Vendedor en rutas;
- rendimiento de rutas Admin/Gestor;
- filtro CADENA/REGULAR;
- preservación de showroom sin Gestor;
- bloqueo de ejecución fuera de fecha;
- V0.6.1 productiva.

---

# 23. CHECKLIST ANTES DE CUALQUIER NUEVA ITERACIÓN

Antes de modificar:

- [ ] Leer este handoff.
- [ ] Verificar `main` y último commit de aplicación desplegado.
- [ ] Crear/usar rama feature nueva.
- [ ] Confirmar producción actual.
- [ ] Consultar Supabase si el cambio toca datos/SQL/Auth.
- [ ] No borrar datos de regresión sin autorización.
- [ ] No tocar RLS/migraciones por intuición.
- [ ] Definir si usuarios pueden seguir trabajando durante el cambio.

Antes de merge/deploy:

- [ ] `npm run build` exitoso.
- [ ] CI verde.
- [ ] prueba local por rol afectado.
- [ ] usuario valida visual/funcionalmente.
- [ ] PR describe cambios y pendientes conocidos.
- [ ] merge a `main`.
- [ ] Pull en copia local productiva.
- [ ] `npm run build`.
- [ ] `npm run deploy`.
- [ ] registrar Cloudflare Version ID.
- [ ] actualizar este handoff.

---

# 24. SIGUIENTE PASO RECOMENDADO DESDE ESTE DOCUMENTO

No empezar modificando producción ni `main`.

Crear una rama nueva desde el estado estable V0.6.1 para V0.6.2 y abordar primero:

1. bug Leaflet/modales;
2. login neutro;
3. separación Vendedores/Gestores en Inicio;
4. rediseño KPI Inicio;
5. rediseño Reporte Ejecutivo/PDF empresarial;
6. PDF Inicio con gráficos.

Después continuar con V0.6.3:

1. Cobertura cartera;
2. cierre parcial de rutas;
3. sesiones administrativas.

---

**Último estado documentado:** V0.6.1 productiva, 24/08/2026.
