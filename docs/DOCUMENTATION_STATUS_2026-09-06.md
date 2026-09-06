# Documentation Status — 06/09/2026

## Objetivo

Evitar que un chat nuevo o una persona que retome el proyecto use como baseline documentos históricos que ya no reflejan el estado real.

## Fuente prioritaria actual

Leer primero:

1. `docs/CHAT_CONTINUATION_CURRENT.md`.
2. GitHub `main` real.
3. Supabase real.
4. Cloudflare real.
5. `docs/GO_LIVE_2026-09-07_CHECKLIST.md`.
6. `docs/SUPABASE_TRANSFER_2026-09-06.md`.

## Documentos históricos importantes pero desactualizados en cabecera/baseline

### `PROJECT_HANDOFF.md`

Contiene decisiones arquitectónicas y reglas de negocio valiosas, pero su cabecera todavía refleja un checkpoint antiguo de beta.10. Usarlo como contexto histórico, no como estado productivo actual.

### `docs/CHAT_CONTINUATION_2026-08-30.md`

Fue el checkpoint prioritario anterior y refleja beta.12.2.6. Queda supersedido para continuidad por `docs/CHAT_CONTINUATION_CURRENT.md`.

### `docs/REQUIREMENTS_STATUS.md`

La cabecera todavía refleja baseline V0.6.4 y afirma que V0.6.5 no estaba implementada. Ese encabezado ya no representa el estado real de producto. Conservar el documento por su valor histórico y funcional, pero verificar cada requisito contra `main` y servicios antes de asumir estado.

### `docs/DEPLOYMENT_CHECKLIST.md`

El procedimiento de PR/build/deploy sigue siendo útil, pero la cabecera/versiones de ejemplo están desactualizadas. El flujo real sigue requiriendo PR, CI, GitHub Desktop para sincronizar, build local y deploy Wrangler/Cloudflare cuando hay cambios ejecutables.

### `docs/IMPLEMENTATION_STATUS.md`

Puede contener estado de versiones anteriores. Usarlo como registro histórico hasta una consolidación posterior al Go-Live.

## Baseline real al 06/09/2026

- Producción: `0.6.5-beta.12.2.8`.
- Merge funcional: PR #55, SHA `247c7a6d9c749f33f5045b2388d0947f3c8efabd`.
- Cloudflare Version ID: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Supabase Project Ref: `ccvzosnhxitfeochnflr`.
- Supabase fue transferido a una organización separada el 06/09/2026 y validado sin pérdida en los objetos auditados.
- Datos operativos todavía TEST hasta declaración explícita de Go-Live.

## Política documental temporal

Para reducir riesgo justo antes del Go-Live, este bloque documental **no reescribe masivamente documentos históricos**. En vez de ello crea un checkpoint canónico nuevo y documentos de corte específicos.

Después del Go-Live, cuando el estado real esté estabilizado, se recomienda una tarea separada de consolidación documental para:

- actualizar `PROJECT_HANDOFF.md`;
- actualizar `REQUIREMENTS_STATUS.md`;
- actualizar `IMPLEMENTATION_STATUS.md`;
- actualizar `DEPLOYMENT_CHECKLIST.md`;
- consolidar `CHANGELOG.md`;
- archivar/superseder checkpoints anteriores sin perder historia.

## Regla final

Si hay contradicción:

> GitHub `main` + Supabase + Cloudflare prevalecen sobre documentación antigua y conversaciones previas.
