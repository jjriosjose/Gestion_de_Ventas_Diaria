# Baseline productivo protegido

Fecha de confirmación: **25/09/2026**

Este documento identifica el último estado productivo validado que no debe perderse por un merge o deploy accidental.

## Aplicación

- versión: **0.6.5-beta.16.3.14**
- commit `main` de referencia: `6f1eda95d3c903d15f805ced59916382b0ec488b`
- Cloudflare Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`

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
- migraciones críticas 16.3.14 y QA guards;
- prohibición de vistas `*_test` en código productivo.

## Regla de promoción

Cuando una versión futura quede:

1. mergeada a `main`;
2. desplegada;
3. validada en producción;

entonces y solo entonces se actualiza este baseline y `release/production-baseline.json`.

Nunca bajar el baseline para facilitar un deploy.
