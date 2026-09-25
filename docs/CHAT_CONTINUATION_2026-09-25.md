# Continuación — Gestión de Ventas Diaria — 25/09/2026

> **CHECKPOINT HISTÓRICO — 16.3.14. NO USAR COMO ESTADO ACTUAL.**
>
> Para continuidad actual leer:
> 1. `docs/CHAT_CONTINUATION_CURRENT.md`
> 2. `docs/CHAT_CONTINUATION_2026-09-25_BETA16_3_15.md`
> 3. `docs/CONTINUATION_PROMPT_2026-09-25_BETA16_3_15.md`

> Checkpoint fechado. Para el estado vivo leer primero `docs/CHAT_CONTINUATION_CURRENT.md`.
> Fuente de verdad: **GitHub main → Supabase vivo → Cloudflare productivo → documentación → historial del chat**.

## 1. Estado productivo confirmado

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

- `main`: **0.6.5-beta.16.3.14**
- merge funcional: `43520095e9349314e3974bd0f4dc19d0cb552824`
- PR #82: MERGED
- Build validation #1188: SUCCESS
- Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Version ID: `9f5528db-cf99-4a17-92b3-4ff85d9e9e98`
- deploy manual de 16.3.14: confirmado el 25/09/2026

Supabase:
- proyecto: Gestion de Ventas Diaria
- ref: `ccvzosnhxitfeochnflr`
- plan actual: Free
- Go-Live real: NO declarado
- los datos operativos siguen considerándose de prueba hasta declaración explícita de Go-Live.

## 2. Beta.16.3.14 — Captación Operativa dentro de Rutas

Productivo y validado visualmente.

Regla:
- una sola jornada operativa por vendedor;
- dentro de Ruta Planificada/Jornada Libre pueden coexistir secuencialmente visitas, captaciones y eventualidades;
- nunca dos actividades operativas abiertas simultáneamente.

Flujo Captación dentro de ruta:
1. `Captar prospecto`.
2. `Llegué / iniciar captación`: GPS + hora; vuelve a Rutas.
3. Tracking muestra **En captación**.
4. `Finalizar captación`: abre formulario completo.
5. GPS/hora salida + duración + resultado.
6. solo `CAPTADO` crea `prospects`.
7. vuelve a **En traslado**.

Tracking:
- `CAPTURE_START`
- `CAPTURE_END`
- estado **En captación**
- filtros Inicio/Fin captación
- bloque `Detalle de captaciones` con resultado, prospecto, contacto, teléfono, tipo, interés, observaciones, tiempos, GPS y evidencias.

Jornadas:
- tiempo de captación separado;
- captación deja de inflar traslado/espera;
- gestiones y prospectos captados visibles.

Objetos principales:
- `capture_interactions`
- `start_route_capture_interaction`
- `finish_route_capture_interaction`
- `cancel_route_capture_interaction`
- `executive_tracking_events_v2`
- `executive_route_journeys_v5`

Migraciones:
- `20260925024317_capture_operational_v2_test_foundation`
- `20260925145033_capture_operational_v2_production_hardening`

## 3. Incidente QA del 25/09 y reparación

Durante QA local, localhost estaba conectado a Supabase productivo. Las captaciones TEST aparecieron luego en producción.

Se retiraron:
- colmado manolito
- test colmado
- prueba -3
- prueba secuencial
- prospectos QA asociados

Migración:
- `20260925152837_cleanup_capture_operational_v2_qa_data_20260925`

La limpieza eliminó también por error una visita real de Virmania a `TIENDA AMARILLA, SRL` porque compartía la misma Jornada Libre.

La visita fue reconstruida inmediatamente desde `audit_log`:
- `TIENDA AMARILLA, SRL`: 10:35–11:09
- GPS llegada: 19.363489, -70.5729495
- GPS salida: 19.3952554, -70.5241195
- resultado: RECIBIDO
- contacto y comentarios originales restaurados

Migración:
- `20260925154251_repair_virmania_real_visit_after_qa_cleanup_20260925`

Estado vivo verificado posteriormente:
1. TIENDA AMARILLA, SRL — finalizada.
2. EL BOMBAZO — finalizada.
3. ALMACENES EL ENCANTO (STGO) — inició después; no asumir su estado actual sin consultar Supabase.

Regla permanente:
**nunca limpiar una sesión completa por asociación temporal sin validar cada visita, GPS y dependencias individualmente.**

## 4. Protección QA ya viva en Supabase

Aunque el frontend de QA Isolation fue pausado, dos protecciones backend YA están aplicadas a producción y deben considerarse fuente de verdad.

Migraciones vivas:
- `20260925160308_qa_data_isolation_production_write_guard`
- `20260925160509_qa_data_isolation_storage_guard`

Efecto:
- localhost / 127.0.0.1 / ::1 / request QA se clasifica como QA;
- 42 tablas públicas están protegidas por trigger `zz_qa_write_guard`;
- INSERT/UPDATE/DELETE QA contra Supabase productivo quedan bloqueados;
- Storage productivo tiene políticas RESTRICTIVE para INSERT/UPDATE/DELETE desde QA;
- producción canónica continúa operando normalmente.

Estas dos migraciones se versionaron en GitHub `main` como parte del checkpoint documental del 25/09.

## 5. QA Data Isolation frontend — PAUSADO

Rama conservada:
`feature/qa-data-isolation-v1`

Versión de la rama:
`0.6.5-beta.16.3.15-test.1`

PR #85:
- CLOSED
- DRAFT histórico
- NO MERGED
- NO PRODUCCIÓN
- título: `[PAUSED] QA data isolation frontend / local staging`

Contenía experimentalmente:
- selección automática Producción / QA aislada / solo lectura;
- banner MODO PRUEBA;
- variables `VITE_SUPABASE_QA_*`;
- guard de `npm run deploy`;
- documentación de staging.

Decisión del usuario:
- **no continuar por ahora con Docker/Supabase local**;
- **no asumir costos ahora**;
- el usuario prevé activar membresía Supabase la próxima semana;
- entonces se reconsiderará Supabase Development Branch/staging.

No reabrir PR #85 por memoria. Preguntar/confirmar antes y verificar costo/plan vigente.

## 6. Captación Programada — siguiente fase funcional, no iniciada

La Captación dentro de Rutas está productiva.

Pendiente:
- ejecutar tareas planificadas de Captación como jornada real `CAPTACION`;
- inicio/fin de jornada de captación;
- interacción por establecimiento;
- tiempos y GPS;
- historial de tareas;
- detalle completo en módulo Captación;
- reflejo completo también en Tracking;
- no mezclar tareas programadas con jornadas de VISITAS.

El módulo Captación seguirá siendo el espacio de administración/ejecución de captaciones programadas; Tracking será el centro diario de supervisión.

## 7. Llamadas — 16.3.13

Productivo:
- historial detallado por cliente;
- filtros período/dirección;
- resumen período;
- resumen por cliente;
- compras/monto;
- visitas reales a Showroom.

QA local aprobado. QA productivo completo todavía figura pendiente en documentación y debe validarse si se retoma ese módulo.

## 8. P0/P1 vigentes

P0:
1. Staging separado antes de nuevas pruebas funcionales con escritura.
2. Reconciliación GitHub migrations ↔ Supabase ledger/schema antes de disaster recovery/Go-Live.
3. No repetir/aplicar migraciones por memoria.
4. Seguridad/RLS/Storage por rol/propiedad.
5. Rebuild/disaster-recovery test antes de Go-Live.
6. Branch protection para main.

P1:
- QA automatizado crítico;
- atomicidad de cierres/importaciones;
- modelo canónico de ventas/touchpoints;
- Showroom concurrente;
- audit_log grande;
- geo performance.

## 9. Reglas operativas que no deben romperse

- GitHub main, Supabase vivo y producción son fuente de verdad.
- No hacer cambios directos a main salvo hotfix explícito.
- No limpiar datos sin plan + dependencias + confirmación.
- No ejecutar QA local con escritura contra producción.
- No modificar/recrear la Jornada Libre histórica de Rendy reparada anteriormente.
- Visita adicional pertenece a la MISMA jornada activa.
- Captación oportunista pertenece a la MISMA jornada de visitas.
- Captación Programada será una jornada CAPTACION separada, no una visita.
- Recepción controla presencia física; Gestor controla resultado comercial.
- No inferir venta por intención.
- No introducir GPS continuo/polling por defecto.
- Deploy Cloudflare es manual; merge no implica deploy.

## 10. Próximo paso recomendado al retomar

Si el usuario ya activó membresía Supabase:
1. verificar plan/costo real;
2. crear Development Branch/staging;
3. validar migraciones en staging;
4. configurar QA aislado;
5. reabrir/rediseñar PR #85 solo si sigue siendo conveniente;
6. después iniciar Captación Programada.

Si todavía NO activó membresía:
- mantener producción en 16.3.14;
- no hacer QA con escritura desde localhost;
- trabajar solo en análisis/diseño/documentación hasta decidir staging.
