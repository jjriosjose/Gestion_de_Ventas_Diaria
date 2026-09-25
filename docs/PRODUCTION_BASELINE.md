# Baseline productivo protegido

Fecha de confirmación: **25/09/2026**

Este documento identifica el último estado productivo validado que no debe perderse por un merge o deploy accidental.

## Aplicación

- versión: **0.6.5-beta.16.3.15**
- commit `main` de referencia: `5395400e4469636b258f67c03eb2eb69416c9d5a`
- Cloudflare Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

La fuente ejecutable del baseline está en:

`release/production-baseline.json`

## Capacidades protegidas por CI

- rutas/módulos principales en `App.tsx`;
- Captación Operativa dentro de Rutas;
- estado/eventos de Captación en Tracking;
- detalle completo de Captaciones;
- métricas de Captación en Jornadas;
- Historial detallado de Llamadas 16.3.13;
- rutas de Logística;
- login con Logística / TMS y Tracking;
- versión visible separada del build técnico;
- Configuración → Acerca del sistema;
- estados vacíos compactos de Rutas en móvil;
- análisis territorial responsive del Mapa;
- migraciones críticas 16.3.14 y QA guards;
- prohibición de vistas `*_test` en código productivo.

## Release 16.3.15

- PR #89: MERGED.
- Build validation #1251: SUCCESS.
- validación visual previa: PC y teléfono aprobada.
- deploy productivo confirmado el 25/09/2026.
- Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`.
- Supabase: sin cambios.

## Production Deploy Guard

PR #90:
- detecta Git del PATH;
- en Windows detecta Git instalado o el Git incluido con GitHub Desktop;
- mantiene validación de rama `main`, working tree limpio, sincronía con `origin/main`, baseline, versión y package-lock;
- Build validation #1253: SUCCESS.

## Regla de promoción

Una versión futura solo reemplaza este baseline cuando quede:

1. mergeada a `main`;
2. desplegada;
3. validada en producción.

Nunca bajar el baseline para facilitar un deploy.
