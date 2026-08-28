# V0.6.5-beta.10 — Refinamientos de Jornadas y Reportes

Fecha: 27/08/2026 (RD).

## Base

- Construida sobre V0.6.5-beta.9 ya desplegada y validada en producción.
- PR #39: `V0.6.5-beta.10 · Horas por gestión y refinamientos de Jornadas`.
- Merge commit: `74c214e9dd94275a052f3d1c55827753feeb4c33`.
- GitHub Actions TypeScript + Vite: SUCCESS antes del merge.
- No contiene migraciones ni cambios de Supabase.

## Deploy productivo

V0.6.5-beta.10 fue desplegada correctamente en Cloudflare Workers.

- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID: `8d6271ac-79e1-4794-b347-7023919040be`
- Wrangler confirmó 7 assets nuevos/modificados subidos correctamente.
- No se ejecutó SQL ni migración para este despliegue.

## Validación productiva

### Administrador `jrios`

VALIDADO visualmente en producción:

- versión `0.6.5-beta.10` visible;
- Inicio operativo carga;
- Jornadas carga con filtros y KPI;
- una planificación pasada nunca iniciada se presenta como `No ejecutada`;
- Reportes muestra `Tiempo operativo total`, `Horas gestión calle` y `Horas gestión showroom / CRM`;
- tabla por colaborador y detalle diario cargan;
- filtros multidimensionales continúan visibles;
- Excel/PDF continúan disponibles.

### Vendedor Cesar Caba

VALIDADO visualmente en producción:

- `Mis jornadas` muestra únicamente sus jornadas;
- no ve jornadas de otros Vendedores;
- Rutas muestra su planificación asignada;
- scoping visual coincide con scoping backend.

## Cambios beta.10

### Inicio

La franja superior de Jornadas muestra explícitamente:

- Planificadas.
- Activas.
- Finalizadas.
- Pendientes de cierre.
- Cobertura de hoy.

### Jornadas

El estado derivado técnico `NO_INICIADA` se presenta al usuario como:

```text
No ejecutada
```

cuando corresponde a una planificación cuya fecha ya pasó y nunca inició.

### Reportes

Beta.10 agregó dos indicadores de canal:

- `Horas gestión calle`.
- `Horas gestión showroom / CRM`.

También conserva `Tiempo operativo total`.

### Exportaciones

Excel/PDF incorporan:

- Canal de gestión (`Calle` / `CRM / Showroom`).
- Horas de gestión.

### Responsive

El grid de KPI usa `auto-fit` con ancho mínimo para acomodar las nuevas tarjetas.

---

# Hallazgos posteriores a la validación — base de beta.11

## 1. Bug lógico: `Horas gestión calle` inflada

La auditoría de Supabase comprobó que `Horas gestión calle` en beta.10 está tomando `operational_seconds` de `executive_daily_employee_summary` para Vendedores.

La vista histórica antigua calcula ventanas de sesiones con `COALESCE(ended_at, now())` en algunos bloques. Esto puede inflar una jornada abierta más allá de su fecha operativa.

Ejemplo auditado:

- Reportes beta.10 mostró `43 h 40 min` de gestión calle.
- Jornadas mostró `22 h 23 min` de ventana operativa acumulada.
- Para Cesar Caba el resumen antiguo llegó a registrar `105,408 s` (~29 h 17 min) en un solo día.

Conclusión:

> `Horas gestión calle` NO debe seguir tomando `operational_seconds` del resumen diario antiguo.

Fuente correcta para beta.11:

```text
SUM(executive_route_journeys_v2.route_window_seconds)
```

para tiempo total de calle/ruta.

## 2. Métrica de atención ya disponible

`executive_route_journeys_v2` ya expone:

- `route_window_seconds` = ventana de jornada en calle.
- `visit_seconds` = suma real de duración de visitas.
- `incident_seconds` = tiempo de eventualidades.
- `transit_wait_estimated_seconds` = residual de traslado/espera.

Beta.11 debe mostrar estas métricas explícitamente.

## 3. Gestores ausentes del Centro de Jornadas

El módulo Jornadas actual está orientado a Vendedores y filtra empleados tipo `Vendedor` para el control ejecutivo.

Los Gestores necesitan una experiencia distinta, basada en:

- llamadas;
- duración de llamadas;
- contactabilidad;
- seguimientos;
- citas;
- showroom;
- tiempo de showroom;
- compras/ventas;
- primera/última actividad.

No se deben modelar como rutas ficticias.

## 4. Follow-ups disponibles pero no explotados

Existe tabla `follow_ups` con:

- `assigned_employee_id`;
- `due_at`;
- `status`;
- `source_type`;
- `source_id`;
- `completed_at`.

Actualmente está vacía. Beta.11 debe integrar las próximas acciones CRM con esta cola de trabajo.

## 5. Notificaciones funcionales pero poco jerarquizadas

La campana actual mezcla en una sola lista:

- notificaciones persistidas;
- agenda/showroom;
- jornadas vencidas.

Beta.11 debe convertirla en Centro de Alertas Operativas con categorías, severidad, navegación al objeto exacto y lectura más profesional.

## 6. Problema visual del grid de KPI

El `auto-fit` actual puede colocar muchas tarjetas en la primera fila y solo dos en la segunda, dejando grandes espacios vacíos. La tarjeta `Monto vendido` es el caso visual más evidente.

Beta.11 debe reemplazar este comportamiento por grupos semánticos y grids deliberados.

---

# Estado final de beta.10

```text
GitHub main      = V0.6.5-beta.10
Supabase backend = V065C de beta.9
Cloudflare UI    = V0.6.5-beta.10
Admin visual     = VALIDADO
Vendedor visual  = VALIDADO
```

Beta.10 se considera funcionalmente validada, pero **Reportes conserva un bug conocido en la fuente de `Horas gestión calle`**, que queda como prioridad P0 para beta.11.

Documento de siguiente bloque:

`docs/V065_BETA11_OPERATIONAL_INTELLIGENCE_DESIGN.md`
