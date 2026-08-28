# V0.6.5-beta.10 — Refinamientos de Jornadas y Reportes

Fecha: 27/08/2026 (RD).

## Base

- Construida sobre V0.6.5-beta.9 ya desplegada y validada en producción.
- PR #39: `V0.6.5-beta.10 · Horas por gestión y refinamientos de Jornadas`.
- Merge commit: `74c214e9dd94275a052f3d1c55827753feeb4c33`.
- GitHub Actions TypeScript + Vite: SUCCESS antes del merge.
- No contiene migraciones ni cambios de Supabase.
- Cloudflare continúa en beta.9 hasta que el usuario realice el deploy controlado de beta.10.

## Validación que motivó este refinamiento

Producción beta.9 fue validada visualmente con:

- Administrador `jrios`: Inicio, Jornadas y Reportes V2 cargan correctamente.
- Vendedor Cesar Caba: `Mis jornadas` muestra únicamente sus propias jornadas y Rutas muestra su planificación asignada.
- Scoping visual del Vendedor confirmado además del scoping backend previamente probado.

## Cambios beta.10

### Inicio

La franja superior de Jornadas ahora muestra explícitamente:

- Planificadas.
- Activas.
- Finalizadas.
- Pendientes de cierre.
- Cobertura de hoy.

Ejemplo esperado:

```text
1 planificada · 0 activas · 0 finalizadas · 0 pendientes cierre · 0% cobertura hoy
```

### Jornadas

El estado derivado `NO_INICIADA` conserva su código técnico, pero la interfaz y exportaciones lo presentan como:

```text
No ejecutada
```

Objetivo: dejar claro que una planificación cuya fecha ya pasó y nunca inició no es una jornada que todavía pueda arrancarse.

### Reportes

Se mantiene `Tiempo operativo total` y se agregan dos indicadores separados:

- `Horas gestión calle`: suma de `operational_seconds` de colaboradores tipo Vendedor. Representa la operación de calle/ruta según la definición ejecutiva vigente.
- `Horas gestión showroom / CRM`: suma de `operational_seconds` de colaboradores tipo Gestor. Incluye la gestión operativa registrada para Gestores (llamadas + showroom según las vistas ejecutivas vigentes).

Esto evita interpretar el tiempo operativo total como si fuera exclusivamente tiempo de ruta.

Los filtros de colaborador continúan afectando las tarjetas:

- al filtrar Vendedores, Showroom/CRM puede quedar en 0;
- al filtrar Gestores, Calle puede quedar en 0;
- sin filtro, ambas tarjetas permiten comparar los dos canales de gestión.

### Exportaciones

Excel/PDF de Reportes incorporan:

- Canal de gestión (`Calle` / `CRM / Showroom`).
- Horas de gestión.

El detalle diario también identifica el canal correspondiente.

### Responsive

El grid de KPI de Reportes pasó a distribución `auto-fit` con ancho mínimo, permitiendo acomodar las nuevas tarjetas sin forzar una plantilla rígida de cuatro columnas.

## Próximo paso

En el equipo local:

1. GitHub Desktop: Fetch origin / Pull origin.
2. Verificar `main` y `No local changes`.
3. Ejecutar `npm run build`.
4. Si termina SUCCESS, ejecutar `npm run deploy`.
5. Registrar Cloudflare Version ID.
6. Validar Inicio y Reportes en producción.

No ejecutar SQL ni migraciones para beta.10.
