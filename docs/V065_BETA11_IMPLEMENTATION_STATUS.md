# V0.6.5-beta.11 — Implementation Status

Fecha de checkpoint: **28/08/2026 (RD)**.

> Estado técnico de la implementación general de beta.11. Este documento complementa `PROJECT_HANDOFF.md` y los documentos de arquitectura comercial.

---

# 1. Estado general

Rama feature:

`feature/v065-beta11-operational-intelligence`

PR:

`#42 — V0.6.5-beta.11 · Operational Intelligence & UX Polish`

Producción Cloudflare al momento de este checkpoint:

- sigue en **0.6.5-beta.10**;
- Version ID: `8d6271ac-79e1-4794-b347-7023919040be`.

No desplegar beta.11 hasta merge + build local validado.

---

# 2. Backend beta.11 aplicado

Supabase productivo ya recibió de forma exitosa:

1. `v065_beta11_operational_intelligence`
2. `v065_beta11_visit_count_metric`

La primera tentativa de la migración principal falló antes de aplicarse por un alias SQL reservado; se corrigió el archivo y la ejecución posterior fue exitosa. No hubo aplicación parcial de la tentativa fallida.

## Vistas nuevas

### `executive_crm_daily_v1`

Capa diaria scoped para Gestores:

- llamadas;
- contactadas;
- resultados de llamada;
- duración real de llamadas;
- citas;
- pendientes de validación;
- confirmadas;
- atendidas;
- no-show/reprogramadas cuando existe dato;
- sesiones showroom;
- duración showroom;
- compras showroom;
- ventas showroom;
- follow-ups;
- primera/última actividad registrada;
- ventana de actividad;
- tiempo de gestión registrado.

Scoping:

```text
Admin/Supervisor -> todos los Gestores
Gestor           -> solo employee_id propio
```

Validado simulando sesión autenticada de Evelyn Ochoa y Administrador.

### `executive_crm_followups_v1`

Worklist scoped de próximas acciones con estado derivado:

- `VENCIDO`
- `HOY`
- `PROXIMO`
- `COMPLETADO`
- `CANCELADO`

Incluye sujeto, fuente, responsable y vencimiento.

### `executive_route_journeys_v3`

Extiende la capa scoped de jornadas con:

- `completed_visit_count`;
- `visit_record_count`.

Permite promedios futuros basados en registros reales de visita.

---

# 3. Follow-ups

Se creó sincronización automática desde:

- `calls`;
- `visits`;
- `showroom_sessions`.

Condición:

```text
next_action + follow_up_date
```

crea/actualiza un `follow_up` trazable.

Backfill real inicial:

- seis próximas acciones existentes fueron convertidas en follow-ups;
- incluye llamadas CRM, una visita y una sesión showroom.

RPCs:

- `complete_follow_up(uuid)`
- `reschedule_follow_up(uuid,timestamptz)`

Permiso:

- Admin/Supervisor; o
- empleado asignado.

No se endurecieron las RLS históricas de tablas CRM existentes en beta.11 porque sería un cambio de alto impacto. Las nuevas vistas beta.11 sí aplican scoping explícito. Cualquier endurecimiento global futuro debe revisarse y aprobarse como migración de seguridad separada.

---

# 4. Corrección P0 — horas Calle

Beta.10 mostraba alrededor de `43 h 40 min` mediante una fuente diaria antigua que podía inflar sesiones históricas abiertas.

Beta.11 obtiene Calle desde:

`executive_route_journeys_v2.route_window_seconds`

Validación real del período auditado:

```text
Tiempo Calle     = 22.39 h (~22 h 23 min)
Distancia GPS    = 14.0 km
Atención visitas = 9.2 min registrados
```

La diferencia grande entre Calle y Atención no se corrige artificialmente: refleja los datos de prueba registrados. La interfaz debe mostrar la separación para permitir detectar este tipo de comportamiento operativo.

Métricas Calle beta.11:

- Tiempo en calle;
- Atención clientes;
- Traslado/espera estimado;
- Eventualidades;
- Distancia GPS;
- Cobertura;
- Cierre operativo.

---

# 5. Design system beta.11

Nuevo componente:

`src/components/MetricCard.tsx`

Estados:

- default;
- hover;
- focus-visible;
- selected;
- actionable.

CSS:

`src/styles/product-system.css`

Incluye:

- agrupación semántica KPI;
- grids controlados;
- filtros en dos niveles;
- chips;
- tabs de operación;
- drawer lateral;
- responsive;
- `prefers-reduced-motion`.

La tarjeta `Monto vendido` usa clase específica `metric-money`, cifras tabulares y comportamiento responsive para evitar el problema visual de beta.10.

---

# 6. Jornadas / Calle

`Journeys.tsx` fue refinado para mostrar:

- KPIs agrupados;
- Tiempo en calle;
- Atención clientes;
- Promedio descriptivo;
- Traslado/espera;
- Distancia;
- eventualidades;
- tabla con columna `Atención`;
- drawer lateral en lugar del modal grande;
- deep-link por `journey=<route_plan_id>`;
- filtros `employee` y `status` persistidos en query params.

La protección temporal de jornadas permanece intacta.

---

# 7. Control Operativo role-aware

`JourneysWorkspace.tsx` ahora diferencia:

## Admin/Supervisor

Tabs:

```text
Calle | CRM / Showroom
```

## Vendedor

Entra directamente a Calle / Mis jornadas.

## Gestor

Entra directamente a CRM / Mi gestión.

Gestor recibió `journeys.view`, pero no `journeys.manage`.

La regularización administrativa de jornadas vencidas permanece exclusiva de perfiles autorizados.

---

# 8. CRM / Showroom

Nueva pantalla:

`src/pages/CrmOperations.tsx`

Muestra:

## Llamadas

- cantidad;
- contactabilidad;
- duración real;
- promedio;
- citas.

## Showroom

- atendidos;
- tiempo real;
- promedio;
- clientes con compra;
- monto vendido.

## Seguimientos

- pendientes;
- vencidos;
- completados;
- citas pendientes de validar;
- worklist;
- completar;
- reprogramar.

El worklist administrativo filtra asignaciones a `employee_type = Gestor`. Follow-ups de Vendedores pueden existir y alertar al Vendedor, pero no se mezclan en el panel operativo de Gestores.

Deep-link CRM:

`/jornadas?tab=crm&followup=<id>`

resalta el follow-up objetivo.

---

# 9. Reportes beta.11

`ReportsV2.tsx` fue reconstruido para separar dominios:

## Ejecución Calle

Fuente: `executive_route_journeys_v2`.

- Jornadas;
- Cobertura;
- Cierre;
- GPS;
- Tiempo en calle;
- Atención;
- promedio descriptivo;
- traslado/espera.

## CRM / Showroom

Fuente: `executive_crm_daily_v1`.

- llamadas;
- contactabilidad;
- tiempo llamadas;
- citas;
- showroom;
- tiempo showroom;
- follow-ups;
- citas por validar.

## Resultado Comercial

Fuente comercial ejecutiva existente, sin reutilizar su tiempo operacional inflado para Calle.

- clientes con compra;
- monto vendido;
- venta showroom.

Los filtros territoriales oficiales se aplican a Calle. CRM/Showroom se mantiene por período/colaborador porque aún no existe una atribución territorial oficial equivalente suficientemente confiable.

---

# 10. Centro de Alertas Operativas

Nuevo componente:

`src/components/NotificationCenterBell.tsx`

Reemplaza la lista plana anterior.

Categorías:

- Jornadas;
- Rutas / Visitas;
- CRM / Seguimientos;
- Agenda / Showroom;
- Calidad de datos;
- Sistema.

Severidad:

- Crítica;
- Acción requerida;
- Información;
- Completado.

Cada item usa color + icono + texto.

Fuentes actuales:

- notificaciones persistidas;
- jornadas pendientes de cierre;
- follow-ups;
- citas/showroom próximas o por validar.

Regla corregida:

- `PENDIENTE_VALIDACION` permanece visible aunque sea antiguo;
- una cita `CONFIRMADA/REPROGRAMADA` solo se muestra como próxima si todavía es futura y está dentro del horizonte configurado.

Acciones:

- Todas / Acción;
- marcar notificaciones persistidas como leídas;
- navegación contextual.

---

# 11. SaaS-ready

Beta.11 respeta los documentos:

- `COMMERCIAL_PRODUCT_ARCHITECTURE.md`
- `V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`

No se introdujo:

- `organization_id` parcial;
- multi-tenancy falso;
- forks por cliente;
- reglas `if empresa == Karaka`.

Los nuevos elementos (`MetricCard`, Control Calle/CRM, categorías de alertas, follow-ups) usan conceptos funcionales reutilizables.

Branding, DOP y timezone RD permanecen como comportamiento productivo actual y serán desacoplados de forma progresiva, no dentro de una migración riesgosa de beta.11.

---

# 12. Pendiente antes de merge/deploy

- [ ] GitHub Actions final SUCCESS sobre el último commit.
- [ ] revisar PR #42 completo.
- [ ] merge a `main` solo si CI es limpio.
- [ ] usuario Fetch/Pull.
- [ ] `npm run build` local.
- [ ] `npm run deploy` manual.
- [ ] validar visualmente Admin.
- [ ] validar Vendedor Cesar Caba.
- [ ] validar Gestor Evelyn Ochoa.
- [ ] validar Centro de Alertas.
- [ ] registrar Cloudflare Version ID.

Producción debe permanecer beta.10 hasta completar esos pasos.
