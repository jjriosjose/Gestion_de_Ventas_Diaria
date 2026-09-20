# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria

> **Índice estable de continuidad.**
>
> Este archivo ya no debe duplicar cientos de líneas de estado que quedan obsoletas. El checkpoint actual se mantiene en documentos fechados y en `CHAT_CONTINUATION_CURRENT.md`.
>
> Nunca guardar secretos, contraseñas, tokens, service keys ni credenciales sensibles.

## LEER PRIMERO

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CHAT_CONTINUATION_2026-09-20.md`
3. `docs/TECHNICAL_AUDIT_2026-09-20.md`
4. `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md`
5. `docs/SUPABASE_CAPACITY_2026-09-20.md`

Luego consultar documentos específicos del módulo a modificar.

## Fuente de verdad

Si existe discrepancia:

1. GitHub `main`.
2. Supabase vivo.
3. Cloudflare productivo.
4. documentación actual.
5. historial de conversación/documentos antiguos.

Nunca asumir que una funcionalidad o migración existe solo porque fue mencionada anteriormente.

## Snapshot al 20/09/2026

- Repo: `jjriosjose/Gestion_de_Ventas_Diaria`
- main: `df3c6836c5113896ecebfb228101af48b323a80b`
- app: **0.6.5-beta.16.3.9**
- producción Cloudflare: **0.6.5-beta.16.3.9**
- Cloudflare Version ID: `96bfb579-8ed2-47cb-8029-15ef67fed492`
- Supabase: `ccvzosnhxitfeochnflr`, **ACTIVE_HEALTHY**, plan **Free**
- datos actuales: **TEST**
- Go-Live: **NO declarado**

## Disciplina de desarrollo

Flujo normal:

`feature → CI/build → QA local → PR → aprobación → merge → deploy → QA producción`

No trabajar directo sobre `main` salvo hotfix explícitamente autorizado.

No ejecutar DDL/SQL destructivo ni limpiar datos sin autorización específica.

## Bloqueadores antes de Go-Live

- reconciliar migraciones GitHub ↔ Supabase;
- staging separado;
- RLS/Storage hardening;
- pruebas automatizadas críticas;
- branch protection;
- atomicidad de cierres/importaciones;
- estrategia backup/restore;
- resolver modelo de tiempo grupal Showroom y venta canónica;
- revisar audit_log y geo performance.

## Prompt de continuidad recomendado

> Continúa Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee COMPLETO `docs/CHAT_CONTINUATION_CURRENT.md` y después `docs/CHAT_CONTINUATION_2026-09-20.md`. Verifica GitHub main, Supabase y producción antes de modificar. Resume primero estado real, P0/P1 y siguiente paso. No limpies datos ni repitas migraciones por memoria.

