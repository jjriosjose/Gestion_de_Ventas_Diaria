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

---

# 0A. PRINCIPIO COMERCIAL / SaaS-READY — DECISIÓN ARQUITECTÓNICA OBLIGATORIA

A partir del 27/08/2026 la aplicación **no se considera exclusivamente un sistema interno de Almacenes Karaka**.

Debe desarrollarse como **producto de software empresarial comercializable y progresivamente SaaS-ready**.

Almacenes Karaka se considera la **implementación/configuración de referencia actual** del producto.

Principio principal:

> **Cada actualización debe mejorar el producto sin romper lo que ya funciona y debe aumentar su capacidad para ser comercializado, configurado y adaptado a diferentes clientes.**

Reglas obligatorias:

1. mantener comportamiento productivo vigente salvo autorización explícita;
2. no eliminar ni alterar funciones existentes sin aprobación;
3. diseñar nuevas capacidades para múltiples tipos de organizaciones;
4. evitar nuevos hardcodes específicos cuando exista una abstracción simple;
5. priorizar configurabilidad, reutilización, escalabilidad y mantenibilidad;
6. mantener branding separado de lógica de negocio;
7. separar códigos internos estables de etiquetas visibles;
8. diseñar componentes compartidos antes que duplicar patrones;
9. proteger reglas críticas en backend/RLS además del frontend;
10. si un cambio tiene impacto alto en lógica, datos, seguridad, Auth, RLS, métricas o historia: **detenerse y advertir antes de aplicar**.

Estrategia:

```text
Fase actual     = SaaS-ready progresivo
Fase futura     = organization abstraction
Fase posterior  = multi-tenant SaaS real con organization_id + RLS por tenant
```

NO introducir multi-tenancy parcial de forma improvisada dentro de beta.11.

Documentos obligatorios para esta decisión:

1. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`
2. `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`
3. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`

---

Documentos prioritarios:

1. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`
2. `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`
3. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
4. `docs/V065_BETA10_REFINEMENT_STATUS.md`
5. `docs/V065C_IMPLEMENTATION_STATUS.md`
6. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`
7. `docs/V065C_DEPLOYMENT_BETA9.md`
8. `docs/REQUIREMENTS_STATUS.md`
9. `docs/V065_FUNCTIONAL_DESIGN.md`

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

Comercialización no autoriza eliminar ni degradar la cartografía RD. La generalización territorial internacional será progresiva; los componentes nuevos deben evitar asumir que las etiquetas Región/Provincia/Municipio son universales.

---

# 6. SEGURIDAD / SCOPING

`executive_route_journeys_v2` aplica alcance en Supabase:

```text
Administrador / Supervisor -> todas las jornadas
Otros perfiles              -> solo employee_id propio
```

Validado backend y visualmente con Cesar Caba.

Mantener defensa frontend + backend en beta.11, especialmente al crear vistas de Gestores y exportaciones.

Para multi-tenant futuro será obligatorio agregar scoping por organización de forma integral; no se considera implementado todavía.

---

# 7. REPORTES BETA.10 — ESTADO VISUAL

Funciona, pero la arquitectura de KPI requiere rediseño.

Problemas detectados:

1. `auto-fit/minmax(190px,1fr)` puede dejar una segunda fila con pocas tarjetas y grandes vacíos.
2. `Monto vendido` se ve mal ajustado y no posee jerarquía suficiente.
3. Los KPI se presentan como una matriz plana aunque pertenecen a dominios distintos.
4. `Horas gestión calle` tiene el bug P0 descrito arriba.

Beta.11 debe agrupar KPI por:

- Ejecución Calle / Field Operation.
- CRM / Showroom.
- Resultado Comercial.

Los códigos internos de capacidades no deben depender de las etiquetas visibles Karaka.

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

Debe integrarse como una cola de trabajo genérica de próximas acciones, no como entidad exclusiva de Karaka ni únicamente de llamadas.

---

# 9. BETA.11 — ARQUITECTURA APROBADA

Documentos rectores:

1. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
2. `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`
3. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`

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
22. comenzar consolidación de componentes compartidos;
23. aplicar principio SaaS-ready sin migración multi-tenant destructiva;
24. optimización de bundle después de estabilizar funcionalidad.

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

El componente debe decidir comportamiento mediante categoría/severidad/entity_type, no por nombre de empresa ni texto visible.

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

Beta.11 debe preferir componentes reutilizables (`MetricCard`, `MetricGroup`, `FilterBar`, `FilterChip`, `DetailDrawer`, `NotificationItem`) y semantic design tokens.

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

Los query params deben usar IDs/códigos estables, no etiquetas visibles específicas del cliente.

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

La evolución comercial no permite romper estas capacidades ni reemplazarlas por abstracciones incompletas.

---

# 14. ESTRATEGIA DE IMPLEMENTACIÓN BETA.11

No implementar directamente en `main`.

Orden:

1. checkpoint documental docs-only;
2. rama feature beta.11;
3. auditoría de vistas/RLS/impacto comercial;
4. corregir fuentes de tiempo Calle;
5. definir capa ejecutiva CRM/Showroom genérica;
6. integrar follow-ups como work queue;
7. sistema visual KPI/componente compartido;
8. Control Operativo Calle/CRM;
9. Reportes;
10. Notificaciones;
11. panel lateral;
12. filtros persistentes;
13. exportaciones;
14. responsive/accessibility;
15. QA comercial-ready (hardcodes, labels, IDs, tokens, scoping);
16. build;
17. GitHub Actions;
18. validación Admin/Vendedor/Gestor;
19. merge;
20. Fetch/Pull local;
21. build local;
22. deploy manual Cloudflare;
23. validación productiva.

No realizar migración multi-tenant completa dentro de beta.11 solamente por la decisión de comercialización.

---

# 15. RECUPERACIÓN EN NUEVO CHAT

Leer en este orden:

1. `PROJECT_HANDOFF.md`.
2. `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`.
3. `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md`.
4. `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`.
5. `docs/V065_BETA10_REFINEMENT_STATUS.md`.
6. `docs/V065C_IMPLEMENTATION_STATUS.md`.
7. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
8. `package.json`.
9. GitHub main/PRs.
10. Supabase remoto.
11. Cloudflare productivo.

Mensaje recomendado:

> “Continúa Gestión de Ventas Diaria como producto empresarial comercializable. Lee `PROJECT_HANDOFF.md`, `docs/COMMERCIAL_PRODUCT_ARCHITECTURE.md`, `docs/V065_BETA11_COMMERCIALIZATION_ADDENDUM.md` y `docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`. Producción actual: V0.6.5-beta.10, Cloudflare Version ID `8d6271ac-79e1-4794-b347-7023919040be`. Karaka es la configuración de referencia. Beta.11 debe ser SaaS-ready progresiva sin migración multi-tenant destructiva y debe corregir primero el bug de Horas gestión calle.”

---

# 16. FUENTE DE VERDAD

1. GitHub `main` = código vigente.
2. Supabase remoto = esquema/datos/políticas reales.
3. Cloudflare = UI realmente desplegada.
4. Documentación = decisiones/checkpoints.
5. Conversación = contexto, no fuente definitiva.
