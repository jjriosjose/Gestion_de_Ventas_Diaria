# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria

> **Índice estable de continuidad.**
>
> Este archivo no duplica todo el estado del proyecto. El checkpoint vivo se mantiene en `docs/CHAT_CONTINUATION_CURRENT.md`.
>
> Nunca guardar secretos, contraseñas, tokens, service keys ni credenciales sensibles.

## LEER PRIMERO

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_16_TEST6.md`
3. `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md` *(baseline productivo)*
4. `docs/TECHNICAL_AUDIT_2026-09-20.md`
5. `docs/DB_MIGRATION_RECONCILIATION_2026-09-20.md`
6. `docs/SUPABASE_CAPACITY_2026-09-20.md`
7. `docs/PRODUCTION_BASELINE.md`
8. Módulo específico que se vaya a modificar.

Prompt recomendado:
`docs/CONTINUATION_PROMPT_2026-09-25_BETA16_3_16_TEST6.md`

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
- commit de código productivo protegido: `5395400e4469636b258f67c03eb2eb69416c9d5a`
- QA productivo 16.3.15: **APROBADO en PC y teléfono**
- PR #91 cierre de baseline: **MERGED**
- PR #92 cierre de QA productivo: **MERGED**

## Desarrollo activo al llenarse el chat

- rama: `feature/reports-daily-showroom-fix-test`
- PR #94: **OPEN / DRAFT / NO MERGE**
- versión: **0.6.5-beta.16.3.16-test.6**
- head: `ad78ef4bcf780bd18c8b153a45b681950910c6a1`
- Build validation #1301: **SUCCESS**
- producción sigue en **0.6.5-beta.16.3.15**
- no Supabase / no migraciones / no deploy

Reportes prueba ya incluye:
- resumen general correcto;
- atribución Showroom por quien atendió;
- montos pendientes Calle/Showroom;
- tablas empresariales con nombre sticky;
- resumen mensual automático para rangos >45 días;
- drill-down mensual → diario;
- Excel analítico multihoja.

Validaciones confirmadas por el usuario:
- 25/09: 5 compras, RD$3,532,014.70, 2 pendientes;
- resumen mensual correcto;
- Excel “quedó muy bien”.

Leer:
`docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_16_TEST6.md`

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
`docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md`

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

> Continúa Gestión de Ventas Diaria del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`. Lee COMPLETO `docs/CHAT_CONTINUATION_CURRENT.md` y después `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_16_TEST6.md`. Verifica GitHub main, PR #94, Supabase y Cloudflare antes de modificar. Producción esperada: 0.6.5-beta.16.3.15; desarrollo activo esperado: 0.6.5-beta.16.3.16-test.6 en `feature/reports-daily-showroom-fix-test`. No confundas la prueba con producción y no mergees PR #94 por memoria.
