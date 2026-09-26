# Baseline productivo protegido

Fecha de confirmación: **26/09/2026**

Este documento identifica el último estado productivo validado que no debe perderse por un merge o deploy accidental.

## Aplicación

- versión: **0.6.5-beta.16.3.17**
- versión visible: **v0.6.5 · 16.3.17**
- commit `main` de referencia: `082cc66c104375d4367b1a7335f6d33b3519e231`
- Cloudflare Version ID: `e8789ba6-3d3a-4c33-9d43-0206b56339a2`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

La fuente ejecutable del baseline está en:

`release/production-baseline.json`

## Capacidades protegidas por CI

- rutas/módulos principales en `App.tsx`;
- Captación Operativa dentro de Rutas;
- estado/eventos de Captación en Tracking;
- detalle completo de Captaciones;
- métricas de Captación en Jornadas;
- Historial detallado de Llamadas;
- rutas de Logística;
- Login con Logística / TMS y Tracking;
- Reportes V2 con resumen general correcto, atribución Showroom, pendientes y detalle temporal adaptativo;
- Excel analítico multihoja;
- versión visible con build de release;
- Configuración → Acerca del sistema;
- estados vacíos compactos de Rutas en móvil;
- análisis territorial responsive del Mapa;
- migraciones críticas y QA guards;
- prohibición de vistas `*_test` en código productivo.

## Release 16.3.16 — Reportes

- PR #94: **MERGED**.
- Build validation de `main` #1307: **SUCCESS**.
- QA productivo: **APROBADO por el usuario**.
- Reportes: resumen general, atribución Showroom, pendientes Calle/Showroom, resumen mensual >45 días y detalle diario <=45 días.
- Excel analítico multihoja validado.
- Supabase: sin cambios.
- Migraciones: ninguna.

## Release 16.3.17 — trazabilidad visual de versión

- PR #96: **MERGED**.
- Build validation de `main` #1313: **SUCCESS**.
- versión técnica: **0.6.5-beta.16.3.17**.
- versión visible confirmada en producción: **v0.6.5 · 16.3.17**.
- Cloudflare Current Version ID: `e8789ba6-3d3a-4c33-9d43-0206b56339a2`.
- cambio limitado a trazabilidad/versionado visible.
- Supabase: sin cambios.
- Migraciones: ninguna.
- lógica comercial: sin cambios.

## Production Deploy Guard

El deploy productivo normal se ejecuta con:

`npm run deploy`

El guard valida:
- rama `main`;
- working tree limpio;
- sincronía con `origin/main`;
- integridad del baseline;
- versión no TEST;
- sincronía `package.json` / `package-lock.json`;
- continuidad del baseline protegido en el historial.

No usar `wrangler deploy` directamente para saltar el guard.

## Regla de promoción

Una versión futura solo reemplaza este baseline cuando quede:

1. mergeada a `main`;
2. desplegada;
3. validada en producción.

Nunca bajar el baseline para facilitar un deploy.
