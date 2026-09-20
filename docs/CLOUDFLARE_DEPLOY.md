# Despliegue Cloudflare — Gestión de Ventas Diaria

Baseline productivo confirmado: **0.6.5-beta.16.3.9**

Frontend: Cloudflare Workers + Static Assets.

Backend: Supabase. Cloudflare no sustituye PostgreSQL/Auth/RLS/Storage/PostGIS.

## Producción actual

URL:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último deploy confirmado por el usuario:

- versión: **0.6.5-beta.16.3.9**
- Current Version ID: `96bfb579-8ed2-47cb-8029-15ef67fed492`
- Wrangler observado: `4.125.0`
- deploy manual mediante `npm run deploy`

Código reconciliado posteriormente en `main`:

- merge PR #67: `9d5497a59d8a91a3c8bb956b5285a79a57bcd715`
- `package.json`: 0.6.5-beta.16.3.9

**No desplegar nuevamente solo para “igualar” el merge**, porque la versión funcional 16.3.9 ya está productiva y validada. Un futuro deploy debe corresponder a un cambio nuevo autorizado.

## Flujo obligatorio

1. crear rama feature;
2. implementar alcance mínimo;
3. build/CI;
4. QA local obligatorio;
5. abrir PR;
6. aprobación;
7. merge a `main`;
8. sincronizar GitHub Desktop `main`;
9. confirmar working tree limpio;
10. ejecutar:

```bash
npm run build
npm run deploy
```

11. registrar Current Version ID;
12. smoke test productivo;
13. actualizar checkpoint de continuidad.

La excepción 16.3.9 donde el usuario autorizó saltar QA local fue puntual.

## No asumir autodeploy

El flujo productivo confirmado es manual con Wrangler.

- merge ≠ deploy;
- commit documental ≠ artefacto productivo;
- una rama feature nunca debe ser el origen normal de producción;
- confirmar versión mediante salida real de deploy y QA.

## Mensaje Wrangler esperado

Puede aparecer:

```text
Using redirected Wrangler configuration.
Configuration being used: dist\wrangler.json
Original user's configuration: wrangler.jsonc
Deploy configuration file: .wrangler\deploy\config.json
```

Es comportamiento observado del stack actual.

## Rollback

Antes de un release de riesgo registrar:

- versión actual;
- Current Version ID actual;
- Git SHA de `main`;
- versión/Version ID anterior;
- migraciones asociadas.

No hacer rollback improvisado de frontend si el backend ya cambió de forma incompatible.

## Seguridad

Nunca versionar:
- tokens Cloudflare;
- secrets Supabase;
- service role keys;
- archivos `.env` privados.

