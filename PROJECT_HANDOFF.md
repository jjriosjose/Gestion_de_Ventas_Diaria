# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria

> **Índice estable de continuidad.**
>
> Este archivo no duplica todo el estado del proyecto. El checkpoint vivo se mantiene en `docs/CHAT_CONTINUATION_CURRENT.md`.
>
> Nunca guardar secretos, contraseñas, tokens, service keys ni credenciales sensibles.

## LEER PRIMERO

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CHAT_CONTINUATION_2026-09-25.md`
3. `docs/TECHNICAL_AUDIT_2026-09-20.md`
4. `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md`
5. `docs/SUPABASE_CAPACITY_2026-09-20.md`
6. `docs/PRODUCTION_BASELINE.md`
7. Módulo específico que se vaya a modificar.

Prompt recomendado:
`docs/CONTINUATION_PROMPT_2026-09-25_BETA16_3_14.md`

## Fuente de verdad

Si existe discrepancia:

1. GitHub `main`.
2. Supabase vivo.
3. Cloudflare productivo.
4. `docs/CHAT_CONTINUATION_CURRENT.md`.
5. checkpoint fechado más reciente.
6. documentación histórica.
7. historial de conversación.

Nunca asumir que una funcionalidad, PR o migración existe solo porque fue mencionada.

## Snapshot al 25/09/2026

- Repo: `jjriosjose/Gestion_de_Ventas_Diaria`
- app en `main`: **0.6.5-beta.16.3.15**
- producción Cloudflare: **0.6.5-beta.16.3.15**
- Cloudflare Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`
- Supabase ref: `ccvzosnhxitfeochnflr`
- plan Supabase: **Free**
- Go-Live real: **NO declarado**
- Captación Operativa dentro de Rutas: **PRODUCTIVA**
- Captación Programada operacional: **PENDIENTE**
- PR #85 QA Isolation frontend/local staging: **PAUSADO / CLOSED / NO MERGED**
- guards QA backend y Storage: **YA VIVOS EN SUPABASE PRODUCTIVO**
- release hardening PR #87: **MERGED**
- Production Deploy Guard: **ACTIVO EN MAIN**
- baseline ejecutable: `release/production-baseline.json`
- PR #89 responsive UX/TMS/mapa: **MERGED / PRODUCTIVO**
- PR #90 Windows Git deploy guard: **MERGED**
- `main` de referencia: `5395400e4469636b258f67c03eb2eb69416c9d5a`

## Incidente de datos importante

El 25/09 el QA local escribió captaciones TEST en producción.
La limpieza posterior eliminó accidentalmente una visita real de Virmania a TIENDA AMARILLA.

La visita real fue restaurada desde `audit_log` y validada.

Nunca volver a limpiar una sesión completa sin validar:
- visitas;
- captaciones;
- GPS;
- auditoría;
- dependencias;
- actividad posterior.

Ver:
`docs/CHAT_CONTINUATION_2026-09-25.md`

## Disciplina de desarrollo

Flujo normal:

`feature → CI/build → QA aislado → PR → aprobación → merge → deploy → QA producción`

Hasta tener staging:
- localhost/QA no debe escribir en producción;
- los guards backend deben permanecer activos;
- no desactivarlos para facilitar pruebas.

Deploy Cloudflare:
- manual con `npm run deploy`;
- desde `main`;
- protegido por `release:guard`;
- no saltar el guard con `wrangler deploy`;
- merge no equivale a deploy.

## Bloqueadores antes de Go-Live

- staging/Development Branch;
- reconciliación GitHub migrations ↔ Supabase;
- rebuild/disaster-recovery test;
- RLS/Storage hardening;
- pruebas automatizadas críticas;
- branch protection;
- atomicidad de cierres/importaciones;
- estrategia backup/restore;
- resolver modelo de tiempo grupal Showroom y venta canónica;
- revisar `audit_log` y geo performance.

## Prompt de continuidad recomendado

> Continúa Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee COMPLETO `docs/CHAT_CONTINUATION_CURRENT.md` y después `docs/CHAT_CONTINUATION_2026-09-25.md`. Verifica GitHub main, Supabase y Cloudflare antes de modificar. Producción esperada: 0.6.5-beta.16.3.15. PR #85 está pausado/cerrado y no debe mergearse por memoria. Verifica las migraciones QA guards ya vivas en Supabase. Resume primero estado real, P0/P1 y siguiente paso. No limpies datos ni repitas migraciones por memoria.
