# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. GitHub `main`, Supabase y Cloudflare son la fuente de verdad si existiera discrepancia con conversaciones anteriores.
>
> Nunca incluir secretos, contraseñas, tokens, service keys ni credenciales sensibles.

---

# 0. ESTADO ACTUAL — LEER PRIMERO

Fecha operativa del checkpoint: **27/08/2026 (RD)**.

## GitHub / Producción

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión productiva actual: **0.6.5-beta.10**.
- PR #38 beta.9: MERGED.
- PR #39 beta.10: MERGED.
- Merge funcional beta.10: `74c214e9dd94275a052f3d1c55827753feeb4c33`.
- GitHub Actions TypeScript + Vite beta.10: SUCCESS.
- Build local previo a deploy: SUCCESS.

## Cloudflare

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID beta.10: `8d6271ac-79e1-4794-b347-7023919040be`.
- Wrangler: `4.125.0` en el deploy validado.
- Advertencia de chunks >500 KB: no bloqueante; deuda de optimización.

## Supabase

Backend V065C de beta.9 sigue aplicado y es la base de beta.10.

Migraciones remotas verificadas:

1. `v065c_journey_lifecycle_and_reporting`
2. `v065c_expired_journey_admin_resolution`
3. `v065c_route_territory_snapshot`
4. `v065c_official_territory_reporting_view`
5. `v065c_scoped_executive_views`

No hacer replay manual ciego de migraciones.

Estado real:

```text
GitHub main      = V0.6.5-beta.10
Supabase backend = V065C aplicado
Cloudflare UI    = V0.6.5-beta.10 desplegada
Siguiente bloque = V0.6.5-beta.11 Operational Intelligence & UX Polish
```

Documentos prioritarios:

1. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
2. `docs/V065_BETA10_REFINEMENT_STATUS.md`
3. `docs/V065C_IMPLEMENTATION_STATUS.md`
4. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`
5. `docs/V065C_DEPLOYMENT_BETA9.md`
6. `docs/REQUIREMENTS_STATUS.md`
7. `docs/V065_FUNCTIONAL_DESIGN.md`

---

# 1. VALIDACIÓN PRODUCTIVA ACTUAL

## Administrador `jrios`

VALIDADO visualmente en beta.10:

- versión `0.6.5-beta.10` visible;
- Inicio operativo;
- Jornadas con filtros y KPI;
- estado histórico `No ejecutada` visible;
- Reportes multiperíodo;
- tarjetas `Tiempo operativo total`, `Horas gestión calle`, `Horas gestión showroom / CRM`;
- filtros, gráficos, desempeño por colaborador y detalle diario;
- Excel/PDF disponibles.

## Vendedor Cesar Caba

VALIDADO visualmente:

- `Mis jornadas` muestra solo sus jornadas;
- no aparecen jornadas de otros Vendedores;
- Rutas muestra únicamente su planificación asignada;
- scoping visual coincide con scoping backend.

---

# 2. REGLA TEMPORAL IRREVERSIBLE

Una jornada pertenece exclusivamente a su fecha operativa.

```text
session_date == fecha operativa actual America/Santo_Domingo
```

Si una `route_session` permanece abierta con `session_date < hoy`:

```text
PENDIENTE_CIERRE
```

No puede continuar ejecución al día siguiente.

Backend y frontend protegen:

- visitas;
- eventualidades;
- paradas;
- continuidad de ruta;
- visitas adicionales asociadas.

Admin/Supervisor conserva regularización administrativa trazable sin aumentar cobertura.

---

# 3. JORNADAS / CONTROL OPERATIVO ACTUAL

Ruta: `/jornadas`.

## Vendedor

`Mis jornadas` incluye:

- jornada del día;
- programadas;
- finalizadas;
- no ejecutadas;
- pendientes de cierre;
- cobertura;
- cierre operativo;
- tiempos;
- distancia GPS;
- eventualidades;
- detalle de paradas.

Una jornada vencida nunca ofrece `Continuar`.

## Admin/Supervisor

Control actual incluye:

- Día / Semana / Mes / Rango;
- Vendedor;
- Estado;
- Tipo cliente;
- Región / Provincia / Municipio oficial;
- KPI de jornadas/cobertura/cierre/horas/distancia/eventualidades;
- tabla;
- detalle;
- Excel/PDF.

---

# 4. MÉTRICAS VIGENTES Y BUG CONOCIDO

## Cobertura

```text
visitados / planificados
```

## Cierre operativo

```text
resueltos / planificados
```

No son equivalentes.

## Fuentes correctas de Calle

`executive_route_journeys_v2` ya expone:

- `route_window_seconds` = ventana total de jornada en calle;
- `visit_seconds` = atención real a clientes;
- `incident_seconds` = eventualidades;
- `transit_wait_estimated_seconds` = traslado/espera residual;
- `estimated_distance_m` = distancia GPS estimada.

## BUG P0 detectado en beta.10

La tarjeta `Horas gestión calle` de Reportes usa actualmente `operational_seconds` de `executive_daily_employee_summary` para Vendedores.

La vista antigua puede inflar sesiones históricas abiertas mediante `COALESCE(ended_at, now())`.

Auditoría real:

- Reportes mostró aproximadamente `43 h 40 min` de gestión calle.
- Jornadas mostró aproximadamente `22 h 23 min` de ventana de ruta acumulada.
- Cesar Caba llegó a mostrar `105,408 s` (~29 h 17 min) en un solo día en la vista antigua.

**Beta.11 debe corregirlo.**

Fuente correcta:

```text
Horas en calle = SUM(executive_route_journeys_v2.route_window_seconds)
Atención clientes = SUM(executive_route_journeys_v2.visit_seconds)
Traslado/espera = SUM(executive_route_journeys_v2.transit_wait_estimated_seconds)
```

---

# 5. TERRITORIO OFICIAL HISTÓRICO

`route_stops` conserva snapshot:

- `official_region_at_plan`
- `official_province_at_plan`
- `official_municipality_at_plan`

Backfill verificado previamente:

```text
72/72 Región oficial
72/72 Provincia oficial
72/72 Municipio oficial
```

Vista operativa: `executive_route_journeys_v2`.

---

# 6. SEGURIDAD / SCOPING

`executive_route_journeys_v2` aplica alcance en Supabase:

```text
Administrador / Supervisor -> todas las jornadas
Otros perfiles              -> solo employee_id propio
```

Validado backend y visualmente con Cesar Caba.

Mantener defensa frontend + backend en beta.11, especialmente al crear vistas de Gestores y exportaciones.

---

# 7. REPORTES BETA.10 — ESTADO VISUAL

Funciona, pero la arquitectura de KPI requiere rediseño.

Problemas detectados:

1. `auto-fit/minmax(190px,1fr)` puede dejar una segunda fila con pocas tarjetas y grandes vacíos.
2. `Monto vendido` se ve mal ajustado y no posee jerarquía suficiente.
3. Los KPI se presentan como una matriz plana aunque pertenecen a dominios distintos.
4. `Horas gestión calle` tiene el bug P0 descrito arriba.

Beta.11 debe agrupar KPI por:

- Ejecución Calle.
- CRM / Showroom.
- Resultado Comercial.

---

# 8. GESTORES — PIEZA PRINCIPAL PENDIENTE

Jornadas actual está centrado en Vendedores.

Los Gestores no deben usar `route_session` ficticias.

Fuentes reales disponibles:

- `calls`;
- `appointments`;
- `showroom_sessions`;
- `follow_ups`;
- ventas/compras;
- primera/última actividad registrada.

Métricas beta.11:

### Llamadas

- realizadas;
- contactadas;
- no contesta;
- ocupado;
- teléfono incorrecto;
- contactabilidad;
- duración total;
- promedio;
- citas generadas.

### Showroom

- citas programadas;
- confirmadas;
- recibidas/atendidas;
- reprogramadas;
- tiempo real de atención;
- promedio de atención.

### Seguimientos

Tabla `follow_ups` existe con:

- `assigned_employee_id`;
- `due_at`;
- `status`;
- `source_type`;
- `source_id`;
- `completed_at`.

Actualmente debe integrarse con `next_action + follow_up_date` para construir una worklist real.

---

# 9. BETA.11 — ARQUITECTURA APROBADA

Documento rector:

`docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`

Nombre del bloque:

**V0.6.5-beta.11 — Operational Intelligence & UX Polish**

Objetivos:

1. corregir horas Calle;
2. añadir Atención clientes;
3. añadir Traslado/espera;
4. promedio de atención;
5. evolucionar Jornadas a Control Operativo;
6. tabs Calle / CRM-Showroom;
7. vista real de Gestores;
8. follow-ups / cola de trabajo;
9. rediseñar KPI por grupos semánticos;
10. corregir Monto vendido;
11. hover/focus/selected premium en tarjetas;
12. filtros en dos niveles + chips;
13. persistir filtros en URL/query params;
14. detalle en panel lateral;
15. Centro de Alertas Operativas categorizado;
16. severidad por color + icono + texto;
17. alertas con deep-link al objeto exacto;
18. marcar todas como leídas;
19. deduplicación;
20. exportaciones alineadas;
21. responsive/accessibility;
22. optimización de bundle después de estabilizar funcionalidad.

---

# 10. NOTIFICACIONES BETA.11

Campana actual mezcla notificaciones, Agenda y Jornadas en una lista plana.

Beta.11 debe agrupar:

- Jornadas;
- Rutas / Visitas;
- CRM / Seguimientos;
- Agenda / Showroom;
- Calidad de datos;
- Sistema.

Severidad:

- Crítica = rojo.
- Acción requerida = ámbar.
- Información = azul.
- Resuelto = verde cuando corresponda.

Color nunca debe ser el único indicador.

Una alerta debe abrir el objeto concreto, no solo el módulo general.

---

# 11. SISTEMA VISUAL BETA.11

Todas las tarjetas KPI deben compartir estados:

### Default

- borde neutro;
- sombra mínima.

### Hover

- elevación ~2px;
- borde brand suave;
- sombra mayor;
- icono intensificado;
- transición 160–200ms.

### Focus-visible

Equivalente accesible al hover.

### Selected

Si la tarjeta actúa como filtro/drill-down:

- borde brand persistente;
- fondo suave;
- chip/filtro activo visible.

No usar cursor pointer en tarjetas no accionables.

Respetar `prefers-reduced-motion`.

---

# 12. FILTROS BETA.11

Dividir en:

## Principales

- Período.
- Fecha/Mes/Rango.
- Tipo colaborador.
- Colaborador.

## Segmentación

- Estado.
- Tipo cliente.
- Región.
- Provincia.
- Municipio.

Mostrar chips activos.

Preferir query parameters para persistencia y navegación Back/Forward.

---

# 13. BASELINE QUE NO SE DEBE ROMPER

- Login premium.
- Clientes.
- Mapa territorial oficial.
- filtros territoriales individuales/cascada.
- análisis territorial.
- Planificación Disponibles/Seleccionados.
- radio/polígono.
- orden por cercanía.
- Rutas.
- regla temporal de jornada.
- Captación.
- Cobertura.
- Visitas.
- Llamadas.
- Agenda/Showroom.
- Recepción.
- Jornadas.
- Reportes multiperíodo.
- Calidad geográfica.
- Administración/Configuración.

---

# 14. ESTRATEGIA DE IMPLEMENTACIÓN BETA.11

No implementar directamente en `main`.

Orden:

1. checkpoint documental docs-only;
2. rama feature beta.11;
3. auditoría de vistas/RLS;
4. corregir fuentes de tiempo Calle;
5. definir capa ejecutiva CRM/Showroom;
6. integrar follow-ups;
7. sistema visual KPI;
8. Control Operativo Calle/CRM;
9. Reportes;
10. Notificaciones;
11. panel lateral;
12. filtros persistentes;
13. exportaciones;
14. responsive/accessibility;
15. build;
16. GitHub Actions;
17. validación Admin/Vendedor/Gestor;
18. merge;
19. Fetch/Pull local;
20. build local;
21. deploy manual Cloudflare;
22. validación productiva.

---

# 15. RECUPERACIÓN EN NUEVO CHAT

Leer en este orden:

1. `PROJECT_HANDOFF.md`.
2. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`.
3. `docs/V065_BETA10_REFINEMENT_STATUS.md`.
4. `docs/V065C_IMPLEMENTATION_STATUS.md`.
5. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
6. `package.json`.
7. GitHub main/PRs.
8. Supabase remoto.
9. Cloudflare productivo.

Mensaje recomendado:

> “Continúa Gestión de Ventas Diaria. Lee `PROJECT_HANDOFF.md` y `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`. La producción actual es V0.6.5-beta.10 con Cloudflare Version ID `8d6271ac-79e1-4794-b347-7023919040be`. Beta.10 fue validada con Admin y Cesar Caba. Antes de desarrollar beta.11, confirma el bug conocido de `Horas gestión calle` y la arquitectura Calle vs CRM/Showroom en Supabase/GitHub.”

---

# 16. FUENTE DE VERDAD

1. GitHub `main` = código vigente.
2. Supabase remoto = esquema/datos/políticas reales.
3. Cloudflare = UI realmente desplegada.
4. Documentación = decisiones/checkpoints.
5. Conversación = contexto, no fuente definitiva.
