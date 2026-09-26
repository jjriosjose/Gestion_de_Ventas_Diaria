# Continuación actual — Gestión de Ventas Diaria

Fecha: **26/09/2026 (RD)**

> **ESTADO VIVO MÁS RECIENTE — 0.6.5-beta.16.3.18 PRODUCTIVO**
>
> Leer a continuación: `docs/CHAT_CONTINUATION_2026-09-26_BETA16_3_18.md`
>
> Prompt actual: `docs/CONTINUATION_PROMPT_2026-09-26_BETA16_3_18.md`
>
> Producción validada: **0.6.5-beta.16.3.18**
>
> Versión visible: **v0.6.5 · 16.3.18**
>
> Cloudflare Current Version ID: `5c63eaec-d61d-41d0-a903-be90b0501cd0`
>
> PR #97 Navigation System V2: **MERGED / PRODUCTIVO**
>
> Baseline ejecutable: `release/production-baseline.json` → **0.6.5-beta.16.3.18**
>
> Todo cambio futuro debe diseñarse como sistema SaaS vendible a empresas: tenant-neutral, escalable, seguro, auditable y configurable.

## Orden de lectura obligatorio

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/CHAT_CONTINUATION_2026-09-26_BETA16_3_18.md`
3. `docs/CHAT_CONTINUATION_2026-09-26_BETA16_3_17.md` *(baseline anterior)*
4. documentos técnicos específicos del módulo a modificar.

Prompt listo para un chat nuevo:
`docs/CONTINUATION_PROMPT_2026-09-26_BETA16_3_18.md`

`PROJECT_HANDOFF.md` es el índice estable y debe apuntar a este checkpoint.

## Estado productivo actual

Repositorio:
`jjriosjose/Gestion_de_Ventas_Diaria`

GitHub `main`:
- versión: **0.6.5-beta.16.3.15**
- merge funcional: `43520095e9349314e3974bd0f4dc19d0cb552824`
- PR #82: **MERGED**
- Build validation funcional #1188: **SUCCESS**
- Release hardening PR #87: **MERGED**
- release-hardening merge: `3e9b60239f84fdb8429135421eee48d0ea9bf2b1`
- Build validation #1214 (hardening): **SUCCESS**

Cloudflare:
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- versión desplegada: **0.6.5-beta.16.3.15**
- Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`
- deploy manual confirmado el 25/09/2026 con `npm run deploy`
- PR #89 (UX responsive/TMS/mapa): **MERGED**
- PR #90 (guard GitHub Desktop Windows): **MERGED**
- commit de código productivo protegido: `5395400e4469636b258f67c03eb2eb69416c9d5a`
- `main` puede contener commits documentales posteriores; verificar HEAD vivo antes de modificar
- baseline productivo protegido actualizado a **0.6.5-beta.16.3.15**
- PR #91 cierre de baseline/documentación: **MERGED**
- PR #92 QA productivo 16.3.15: **MERGED / APROBADO**

Supabase:
- proyecto: `Gestion de Ventas Diaria`
- ref: `ccvzosnhxitfeochnflr`
- plan actual: **Free**
- Go-Live real: **NO declarado**
- los datos operativos siguen considerándose de prueba hasta declaración explícita del usuario

## Desarrollo activo — Reportes 0.6.5-beta.16.3.16-test.6

**NO PRODUCTIVO.**

Rama:
`feature/reports-daily-showroom-fix-test`

PR #94:
- **OPEN / DRAFT / NO MERGE**
- head verificado: `ad78ef4bcf780bd18c8b153a45b681950910c6a1`
- Build validation #1301: **SUCCESS**
- Supabase: sin cambios
- migraciones: ninguna
- deploy: NO

Cambios ya implementados y validados:
- elimina selección invisible de colaborador en Reportes;
- Todos los colaboradores muestra realmente el resumen general;
- drill-down solo por selección explícita;
- Showroom atendido/tiempo/compras/ventas se atribuye a quien realizó la atención;
- Citas se conservan por responsabilidad;
- compras sin importe muestran **Monto pendiente**, no RD$0;
- pendientes separados por Calle / Showroom;
- columna Gestor/Vendedor legible y sticky;
- períodos >45 días muestran resumen mensual con drill-down a días;
- períodos <=45 días conservan tarjetas diarias;
- Excel analítico multihoja para uso empresarial.

Validaciones del usuario:
- 25/09 general: **5 compras**;
- monto registrado: **RD$3,532,014.70**;
- **2 montos pendientes**: 1 Calle + 1 Showroom;
- resumen mensual por rango: correcto;
- tabla Gestores: correcta y más legible;
- Excel: **“quedó muy bien”**.

Excel multihoja:
- Parametros
- Resumen Vendedores
- Resumen Gestores
- Comercial Diario
- Jornadas Calle
- CRM Diario
- Showroom Detalle
- Visitas Detalle
- Llamadas Detalle

Principio acordado:
> Todo cambio futuro debe diseñarse pensando en una aplicación SaaS vendible a empresas: tenant-neutral, escalable, segura, auditable y con datos reutilizables analíticamente.

Continuidad detallada:
`docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_16_TEST6.md`

## Release hardening — YA MERGEADO EN MAIN

PR #87: **MERGED**.

No cambia pantallas ni lógica comercial y no requiere deploy por sí solo.

Protecciones añadidas:
- `release/production-baseline.json` protege el baseline **0.6.5-beta.16.3.15**;
- `docs/PRODUCTION_BASELINE.md` documenta el baseline humano;
- `npm run release:integrity` valida capacidades/migraciones críticas antes del build;
- Build validation ejecuta el control anti-regresión;
- `npm run deploy` ejecuta automáticamente `predeploy → release:guard`;
- deploy bloqueado fuera de `main`;
- deploy bloqueado con working tree sucio;
- deploy bloqueado si `main` local ≠ `origin/main`;
- deploy bloqueado si el historial no contiene el baseline productivo protegido;
- deploy bloqueado para versiones `test`;
- deploy bloqueado si `package.json` y `package-lock.json` no coinciden;
- referencias productivas a vistas `*_test` son rechazadas por CI.

Documentación actualizada:
- `docs/CLOUDFLARE_DEPLOY.md`
- `docs/DEPLOYMENT_CHECKLIST.md`
- `docs/PRODUCTION_BASELINE.md`

Regla:
> No ejecutar `wrangler deploy` directamente para saltar el guard. El comando productivo normal es `npm run deploy`.

## 0.6.5-beta.16.3.15 — UX responsive / Login / TMS / Mapa

**PRODUCTIVO.**

Cambios incluidos:
- Login renovado con 8 capacidades: Clientes, Rutas, Captación, Logística / TMS, Llamadas, Visitas, Tracking y Mapas.
- Responsive validado en PC y teléfono.
- Versión visible simplificada a **v0.6.5 Beta** conservando versión/build técnico.
- Configuración agrega **Acerca del sistema**.
- Estados vacíos de Captación/Jornada Libre compactados en móvil.
- Análisis territorial del Mapa reorganizado para aprovechar mejor el área útil en PC y teléfono.
- Sin cambios Supabase, migraciones, RLS ni Auth.

Release:
- PR #89: MERGED.
- Build validation #1251: SUCCESS.
- deploy productivo: 25/09/2026.
- Cloudflare Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`.
- QA productivo visual posterior al deploy: **APROBADO** en PC y teléfono por el usuario.
- Login, Rutas, Mapa/Análisis territorial y demás módulos revisados sin fallas visibles.

Hardening posterior:
- PR #90: MERGED.
- El Production Deploy Guard detecta automáticamente Git incluido en GitHub Desktop en Windows.
- Build validation #1253: SUCCESS.
- No cambia la app productiva; protege futuros deploys.

## 0.6.5-beta.16.3.14 — Captación Operativa dentro de Rutas

**PRODUCTIVO.**

Regla principal:
- una sola jornada operativa por vendedor;
- dentro de Ruta Planificada/Jornada Libre se pueden ejecutar secuencialmente visitas, captaciones y eventualidades;
- no deben existir dos actividades operativas abiertas a la vez.

Flujo Captación:
- `Captar prospecto`;
- `Llegué / iniciar captación` registra GPS/hora y vuelve a Rutas;
- Tracking muestra **En captación**;
- `Finalizar captación` abre el formulario completo;
- salida registra GPS/hora/duración/resultado;
- solo `CAPTADO` crea `prospects`;
- después vuelve a **En traslado**.

Tracking productivo:
- `CAPTURE_START`
- `CAPTURE_END`
- estado **En captación**
- filtros Inicio/Fin captación
- detalle completo de Captaciones: resultado, código, contacto, teléfono, tipo, interés, observaciones, horas, duración, GPS y evidencias

Jornadas:
- tiempo de captación separado;
- captación ya no infla traslado/espera;
- gestiones/prospectos de captación visibles.

Objetos:
- `capture_interactions`
- `start_route_capture_interaction`
- `finish_route_capture_interaction`
- `cancel_route_capture_interaction`
- `executive_tracking_events_v2`
- `executive_route_journeys_v5`

Migraciones:
- `20260925024317_capture_operational_v2_test_foundation`
- `20260925145033_capture_operational_v2_production_hardening`

## Incidente QA del 25/09 — cerrado y documentado

QA local escribió contra Supabase productivo y las captaciones TEST quedaron visibles en producción.

Se retiraron:
- `colmado manolito`
- `test colmado`
- `prueba -3`
- `prueba secuencial`
- prospectos QA asociados

Migración:
- `20260925152837_cleanup_capture_operational_v2_qa_data_20260925`

La limpieza eliminó también por error una visita real de Virmania a `TIENDA AMARILLA, SRL`.

Se reconstruyó desde `audit_log` mediante:
- `20260925154251_repair_virmania_real_visit_after_qa_cleanup_20260925`

Secuencia real verificada posteriormente:
1. `TIENDA AMARILLA, SRL` — finalizada.
2. `EL BOMBAZO` — finalizada.
3. `ALMACENES EL ENCANTO (STGO)` — inició después.

**No asumir el estado actual de la tercera visita sin consultar Supabase.**

Regla permanente:
> No limpiar una sesión completa por asociación temporal. Validar cada visita/captación, GPS, auditoría y dependencias antes de borrar.

## Protección QA backend — YA VIVA EN PRODUCCIÓN

Aunque el trabajo de staging se pausó, dos protecciones backend ya están aplicadas y forman parte del estado real de Supabase:

- `20260925160308_qa_data_isolation_production_write_guard`
- `20260925160509_qa_data_isolation_storage_guard`

Estado verificado:
- localhost / 127.0.0.1 / ::1 / request QA se clasifica como QA;
- **42 tablas públicas** están protegidas por `zz_qa_write_guard`;
- INSERT/UPDATE/DELETE QA contra producción quedan bloqueados;
- Storage productivo tiene políticas RESTRICTIVE:
  - `qa_storage_insert_guard`
  - `qa_storage_update_guard`
  - `qa_storage_delete_guard`

Estas dos migraciones están versionadas en GitHub como parte de este checkpoint.

## QA Data Isolation frontend / staging — PAUSADO

Rama:
`feature/qa-data-isolation-v1`

Versión experimental:
`0.6.5-beta.16.3.15-test.1`

PR #85:
- **CLOSED**
- draft histórico
- **NO MERGED**
- **NO PRODUCCIÓN**
- título: `[PAUSED] QA data isolation frontend / local staging`

Decisión del usuario:
- no continuar por ahora con Docker/Supabase local;
- no asumir ningún costo por ahora;
- el usuario prevé activar membresía Supabase la próxima semana;
- entonces se evaluará Development Branch/staging.

No reabrir ni mergear PR #85 por memoria.

## Captación Programada — siguiente fase funcional

Aún **NO implementada** como jornada operacional completa.

Pendiente:
- iniciar/finalizar jornada `CAPTACION`;
- tarea planificada → jornada de captación;
- interacción por establecimiento;
- GPS/tiempos/resultado;
- historial de tareas;
- detalle completo en Captación;
- detalle completo también en Tracking;
- no mezclar Captación Programada con jornada de VISITAS.

Diseño acordado:
- Captación dentro de Ruta/Jornada Libre = oportunidad comercial dentro de la misma jornada.
- Captación Programada = módulo Captación + jornada `CAPTACION`.
- Tracking = centro principal de supervisión diaria para ambos orígenes.

## Llamadas — 0.6.5-beta.16.3.13

Productivo:
- historial desplegable por cliente;
- filtros período/dirección;
- resumen general del período;
- resumen acumulado por cliente;
- compras/monto;
- visitas reales a Showroom.

QA local aprobado.
Las capacidades de Llamadas continúan protegidas por `release:integrity`; si se modifica el módulo, repetir QA específico antes de promover.

## Workflow obligatorio

`feature branch → CI/build → QA aislado → PR → aprobación → merge → deploy → QA producción`

Hasta crear staging:
- **NO ejecutar QA local con escritura contra Supabase productivo**;
- si localhost recibe `QA_WRITE_BLOCKED`, es comportamiento esperado;
- no desactivar guards QA para “hacer que la prueba funcione”.

Deploy Cloudflare:
- manual con `npm run deploy`;
- `npm run deploy` está protegido por Production Deploy Guard;
- nunca usar `wrangler deploy` para saltar el guard;
- merge a `main` NO implica deploy.

## P0/P1 abiertos

### P0

1. **Staging/Development Branch** antes de nuevas pruebas funcionales con escritura.
2. **Reconciliación GitHub migrations ↔ Supabase ledger/schema** antes de disaster recovery/Go-Live.
3. **Rebuild/disaster-recovery test**.
4. **Security/RLS/Storage** por rol/propiedad.
5. **Branch protection** de `main`.
6. No repetir migraciones por memoria.

### P1

- QA automatizado crítico;
- atomicidad de cierres/importaciones;
- modelo canónico de ventas/touchpoints;
- Showroom concurrente;
- `audit_log` grande;
- geo performance.

## Reglas críticas permanentes

- GitHub `main`, Supabase vivo y Cloudflare productivo prevalecen.
- No modificar directo `main` salvo hotfix explícito.
- No limpiar datos sin plan + dependencias + aprobación.
- No recrear una jornada histórica por memoria.
- Visita adicional pertenece a la MISMA jornada activa.
- Captación oportunista pertenece a la MISMA jornada activa.
- Captación Programada será jornada `CAPTACION`.
- Recepción controla presencia física; Gestor controla resultado comercial.
- No inferir venta por intención.
- No introducir GPS continuo/polling masivo por defecto.
- No hacer cambios RLS amplios sin pruebas por rol.
- No desplegar feature branch como procedimiento normal.
- Si un chat contradice este documento, volver a verificar servicios vivos.

## Próximo paso exacto al retomar

Si el usuario YA activó membresía Supabase:
1. verificar plan y condiciones actuales;
2. evaluar/crear Development Branch o staging;
3. validar las migraciones recientes en staging;
4. configurar QA aislado;
5. decidir si se reutiliza o se rehace parte del PR #85;
6. después iniciar Captación Programada.

Si el usuario TODAVÍA NO activó membresía:
- mantener producción en **0.6.5-beta.16.3.15**;
- no hacer pruebas locales con escritura;
- continuar solo con análisis/diseño/documentación hasta decidir staging.

## Continuidad preparada para próximo chat

- checkpoint de desarrollo actual: `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_16_TEST6.md`
- prompt actual: `docs/CONTINUATION_PROMPT_2026-09-25_BETA16_3_16_TEST6.md`
- baseline productivo vigente: `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md`
- checkpoint anterior `docs/CHAT_CONTINUATION_2026-09-25.md`: histórico de 16.3.14; no usar como estado vivo.
- baseline ejecutable: `release/production-baseline.json`
- baseline humano: `docs/PRODUCTION_BASELINE.md`
