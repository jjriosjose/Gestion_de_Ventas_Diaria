# Despliegue Cloudflare — Gestión de Ventas Diaria

Baseline productivo protegido al 25/09/2026: **0.6.5-beta.16.3.14**

> Este número sirve como baseline mínimo conocido. Antes de cada deploy verificar siempre `package.json`, `package-lock.json`, `release/production-baseline.json`, GitHub `main` y el estado real de producción. Nunca desplegar basándose solo en un número escrito en documentación.

Frontend: Cloudflare Workers + Static Assets.

Backend: Supabase. Cloudflare no sustituye PostgreSQL/Auth/RLS/Storage/PostGIS.

## Producción confirmada

URL:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último deploy confirmado:

- versión: **0.6.5-beta.16.3.14**
- Current Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`
- `main` protegido de referencia: `6f1eda95d3c903d15f805ced59916382b0ec488b`
- deploy manual mediante `npm run deploy`

No desplegar nuevamente 16.3.14 solo para “igualar” documentación. Un deploy debe corresponder a un cambio nuevo aprobado o a una recuperación explícita.

## Guard de producción

`npm run deploy` ejecuta automáticamente `predeploy` → `npm run release:guard`.

El deploy se bloquea si:

- la rama actual no es `main`;
- existen cambios locales sin commit;
- `main` local no coincide con `origin/main`;
- la historia actual no contiene el baseline protegido;
- `package.json` y `package-lock.json` no tienen la misma versión;
- la versión contiene `test`;
- falla el control de integridad anti-regresión.

No saltar este guard ejecutando `wrangler deploy` directamente como procedimiento normal.

## Control anti-regresión

`npm run release:integrity` valida:

- versión actual no menor que el baseline productivo;
- versión idéntica en `package.json` y `package-lock.json`;
- módulos/rutas críticas todavía presentes;
- Captación Operativa 16.3.14 todavía presente;
- Historial detallado de Llamadas 16.3.13 todavía presente;
- Logística y rutas principales todavía en `App.tsx`;
- migraciones críticas todavía versionadas;
- ausencia de referencias productivas a vistas `*_test`.

El mismo control se ejecuta en CI antes del build.

## Flujo obligatorio

1. crear rama desde `main` actualizado;
2. implementar alcance mínimo;
3. ejecutar build/CI;
4. QA en entorno permitido;
5. abrir PR;
6. aprobación;
7. merge a `main`;
8. GitHub Desktop → `main` → Fetch/Pull;
9. confirmar working tree limpio;
10. ejecutar:

```bash
npm run deploy
```

No es necesario ejecutar `npm run build` por separado: `npm run deploy` ejecuta el guard y luego el build.

11. registrar Current Version ID;
12. smoke test productivo;
13. actualizar checkpoint de continuidad.

## No asumir autodeploy

El flujo productivo confirmado es manual con Wrangler.

- merge ≠ deploy;
- commit documental ≠ artefacto productivo;
- una rama feature nunca debe ser origen normal de producción;
- confirmar versión mediante salida real de deploy y QA.

## Rollback

Antes de un release de riesgo registrar:

- versión productiva;
- Current Version ID;
- Git SHA de `main`;
- versión/Version ID anterior;
- migraciones asociadas.

No hacer rollback improvisado de frontend si el backend cambió de forma incompatible.

Un rollback de código tampoco debe borrar migraciones ni datos por memoria.

## Seguridad

Nunca versionar:

- tokens Cloudflare;
- secretos Supabase;
- service role keys;
- archivos `.env` privados.
