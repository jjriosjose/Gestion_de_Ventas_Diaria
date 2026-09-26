# Baseline productivo protegido

Fecha de confirmación: **26/09/2026**

Este documento identifica el último estado productivo validado que no debe perderse por un merge o deploy accidental.

## Aplicación

- versión: **0.6.5-beta.16.3.19**
- versión visible: **v0.6.5 · 16.3.19**
- commit `main` de referencia: `23eac5dcd18a94523fc3699ebb9d3fd8f3058644`
- Cloudflare Version ID: `196a50d2-f1b0-455b-9f40-4c65d888b59b`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

La fuente ejecutable del baseline está en:

`release/production-baseline.json`

## Release 16.3.19 — Appearance V2

- PR #98: **MERGED**.
- Build validation `main` #1377: **SUCCESS**.
- QA previo en rama de prueba: **APROBADO por el usuario**.
- deploy productivo: **26/09/2026**.
- Cloudflare Current Version ID: `196a50d2-f1b0-455b-9f40-4c65d888b59b`.
- Supabase: sin cambios.
- Migraciones: ninguna.
- Auth/RLS: sin cambios.
- lógica comercial: sin cambios.

### Capacidades incluidas

- Configuración V2 orientada a producto SaaS comercial.
- Modos de interfaz preestablecidos:
  - Sistema;
  - Claro;
  - Oscuro;
  - Ejecutivo.
- Los usuarios no pueden modificar libremente colores corporativos, logo ni branding.
- Vista de referencia reactiva al tema seleccionado.
- Identidad de Almacenes Karaka mostrada como identidad del tenant actual.
- Separación interna entre identidad de plataforma y tenant.
- Marca futura `bitstechcloud` preparada internamente pero no visible en esta instalación.
- `publicBrandingEnabled: false` para la identidad de plataforma actual.
- Seguridad, Mi cuenta y Acerca del sistema conservados.

## Capacidades protegidas por CI

Además de las capacidades históricas ya protegidas:
- `src/pages/Settings.tsx` debe conservar la Configuración V2 controlada;
- `src/context/ThemeContext.tsx` debe conservar modos preestablecidos y soporte de modo Sistema;
- `src/config/productIdentity.ts` debe conservar separación plataforma/tenant;
- `src/styles/settings-v2.css` debe conservar preview reactivo y estilos V2;
- `bitstechcloud` no debe mostrarse públicamente mientras `publicBrandingEnabled` sea falso.

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
