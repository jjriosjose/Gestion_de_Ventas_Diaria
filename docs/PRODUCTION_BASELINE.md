# Baseline productivo protegido

Fecha de confirmación: **26/09/2026**

Este documento identifica el último estado productivo validado que no debe perderse por un merge o deploy accidental.

## Aplicación

- versión: **0.6.5-beta.16.3.18**
- versión visible: **v0.6.5 · 16.3.18**
- commit `main` de referencia: `ca5a459a517266636d2e128e3aa0d8313c954728`
- Cloudflare Version ID: `5c63eaec-d61d-41d0-a903-be90b0501cd0`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

La fuente ejecutable del baseline está en:

`release/production-baseline.json`

## Release 16.3.18 — Navigation System V2

- PR #97: **MERGED**.
- Build validation `main` #1344: **SUCCESS**.
- QA previo en rama de prueba: **APROBADO por el usuario**.
- deploy productivo: **26/09/2026**.
- Cloudflare Current Version ID: `5c63eaec-d61d-41d0-a903-be90b0501cd0`.
- Supabase: sin cambios.
- Migraciones: ninguna.
- Auth/RLS: sin cambios.
- lógica comercial: sin cambios.

### Capacidades incluidas

- sidebar con grupos colapsables:
  - Operación;
  - Gestión comercial;
  - Logística;
  - Inteligencia;
  - Administración;
- Inicio siempre visible;
- iconografía Lucide con tiles y mayor contraste;
- grupo activo visible y navegación preservada por permisos;
- grupos activos también pueden cerrarse manualmente;
- modo colapsado convertido en **icon rail real**;
- tooltips en icon rail;
- drawer móvil compatible con la misma estructura;
- versión visible con build para trazabilidad.

## Capacidades protegidas por CI

Además de las capacidades históricas ya protegidas:
- `src/components/AppShell.tsx` debe conservar Navigation System V2;
- `src/styles/navigation-v2.css` debe conservar el icon rail y grupos colapsables;
- rutas y permisos existentes no deben perderse;
- referencias productivas a vistas `*_test` continúan prohibidas.

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
