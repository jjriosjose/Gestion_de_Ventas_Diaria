# Continuación — Gestión de Ventas Diaria — 25/09/2026 — beta16.3.15

> Checkpoint actual de continuidad. Leer primero `docs/CHAT_CONTINUATION_CURRENT.md`.
> Fuente de verdad: **GitHub main → Supabase vivo → Cloudflare productivo → documentación actual → historial del chat**.

## 1. Estado productivo confirmado

Repositorio:
`jjriosjose/Gestion_de_Ventas_Diaria`

Aplicación:
- versión productiva: **0.6.5-beta.16.3.15**
- versión visible al usuario: **v0.6.5 Beta**
- Cloudflare URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Cloudflare Current Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`
- commit de código productivo protegido: `5395400e4469636b258f67c03eb2eb69416c9d5a`
- último cierre documental previo a este checkpoint: `9db173a3316f12bd4daebbcf19241bae605623f0`
- QA productivo visual: **APROBADO en PC y teléfono**
- PR #91 cierre de baseline/documentación: **MERGED**
- PR #92 cierre de QA productivo: **MERGED**
- módulos revisados visualmente: Login, Rutas, Mapa/Análisis territorial y resto de módulos sin fallas visibles reportadas.

Supabase:
- proyecto: `Gestion de Ventas Diaria`
- ref: `ccvzosnhxitfeochnflr`
- plan: **Free**
- Go-Live real: **NO declarado**
- hasta declaración explícita del usuario, los datos operativos deben tratarse con máxima cautela; no hacer limpiezas por memoria.

## 2. Release 0.6.5-beta.16.3.15

PR #89: **MERGED**.

Cambios productivos:
- Login responsive actualizado.
- 8 capacidades visibles:
  - Clientes
  - Rutas
  - Captación
  - Logística / TMS
  - Llamadas
  - Visitas
  - Tracking
  - Mapas
- versión visible simplificada a **v0.6.5 Beta**;
- build técnico conservado para auditoría;
- Configuración → **Acerca del sistema**;
- Captación oportunista compactada en móvil;
- estados vacíos de Jornada Libre compactados;
- Mapa → Análisis territorial optimizado para PC y teléfono;
- panel territorial anclado dentro del mapa;
- mayor área útil para regiones;
- responsive validado visualmente.

Build validation #1251: **SUCCESS**.

Supabase:
- sin cambios;
- sin nuevas migraciones;
- sin cambios RLS/Auth.

## 3. Production Deploy Guard

Release hardening:
- PR #87: MERGED.
- PR #90: MERGED.
- Build validation #1253: SUCCESS.

`npm run deploy` ejecuta `predeploy → release:guard`.

El guard bloquea:
- rama distinta de `main`;
- working tree sucio;
- `main` local distinto de `origin/main`;
- historia sin baseline protegido;
- versión con `test`;
- package.json/package-lock desincronizados;
- integridad anti-regresión fallida.

Windows:
- detecta Git del PATH;
- si Git no está en PATH, detecta automáticamente el Git incluido con GitHub Desktop;
- no es necesario instalar Git adicional solo para desplegar.

Regla:
**no usar `wrangler deploy` para saltar el guard**.

## 4. Baseline productivo protegido

Archivo ejecutable:
`release/production-baseline.json`

Baseline:
- versión: **0.6.5-beta.16.3.15**
- commit de código protegido: `5395400e4469636b258f67c03eb2eb69416c9d5a`
- Cloudflare Version ID: `d221fada-8015-4840-b01a-5c2ec4d88880`

Capacidades protegidas por CI incluyen:
- rutas principales;
- Captación Operativa;
- Tracking de Captación;
- Jornadas;
- Llamadas 16.3.13;
- Logística/TMS;
- Login con TMS + Tracking;
- versión visible/build técnico;
- Acerca del sistema;
- estados vacíos compactos;
- Mapa territorial responsive;
- migraciones críticas;
- prohibición de referencias productivas a vistas `*_test`.

## 5. Captación Operativa 16.3.14 — sigue productiva

PR #82: MERGED.
Build #1188: SUCCESS.

Flujo:
- Captación dentro de Ruta Planificada/Jornada Libre;
- no crea jornada paralela;
- inicio con GPS/hora;
- Tracking muestra **En captación**;
- finalización registra GPS/hora/duración/resultado;
- solo `CAPTADO` crea prospecto;
- vuelve a **En traslado**.

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

## 6. Incidente QA del 25/09 — cerrado

QA local escribió datos TEST en producción.

Se retiraron:
- colmado manolito
- test colmado
- prueba -3
- prueba secuencial
- prospectos QA asociados

Migración:
- `20260925152837_cleanup_capture_operational_v2_qa_data_20260925`

La limpieza eliminó también por error una visita real de Virmania a `TIENDA AMARILLA, SRL`.

Fue reconstruida desde `audit_log` con:
- `20260925154251_repair_virmania_real_visit_after_qa_cleanup_20260925`

Secuencia verificada después:
1. TIENDA AMARILLA, SRL — finalizada.
2. EL BOMBAZO — finalizada.
3. ALMACENES EL ENCANTO (STGO) — actividad posterior.

Regla permanente:
**nunca limpiar una sesión completa por asociación temporal sin validar actividad, GPS, audit_log y dependencias individualmente.**

## 7. Protección QA backend — viva en producción

Migraciones:
- `20260925160308_qa_data_isolation_production_write_guard`
- `20260925160509_qa_data_isolation_storage_guard`

Estado vivo verificado:
- **42** tablas públicas con trigger `zz_qa_write_guard`;
- entorno productivo marcado como producción;
- Storage con políticas RESTRICTIVE:
  - `qa_storage_insert_guard`
  - `qa_storage_update_guard`
  - `qa_storage_delete_guard`

Estas protecciones permanecen activas aunque el frontend QA/staging esté pausado.

## 8. QA/Staging separado — PAUSADO hasta membresía Supabase

PR #85:
- CLOSED
- NO MERGED
- NO PRODUCCIÓN

Rama histórica:
`feature/qa-data-isolation-v1`

Importante:
- el frontend experimental de selección QA de PR #85 NO está en main;
- el **Production Deploy Guard sí está en main**, pero llegó por PR #87/#90 de forma independiente;
- Docker/local Supabase fue descartado por ahora;
- el usuario prevé activar membresía Supabase y entonces evaluar Development Branch/staging.

Hasta crear staging:
- no hacer QA funcional con escritura desde localhost contra producción;
- no desactivar los guards QA.

## 9. Llamadas 16.3.13 — productivo

Productivo:
- historial por cliente;
- filtros período/dirección;
- resumen del período;
- resumen por cliente;
- compras/monto;
- visitas reales a Showroom.

No perder estas capacidades en futuras ramas.

## 10. Captación Programada — pendiente

Aún NO implementada como jornada operacional completa.

Pendiente:
- jornada `CAPTACION`;
- inicio/fin;
- tarea planificada → ejecución real;
- GPS/tiempos/resultado;
- historial;
- detalle en Captación;
- detalle en Tracking;
- separación clara respecto a jornadas VISITAS.

## 11. P0/P1

P0:
1. Staging/Development Branch antes de nuevas pruebas funcionales con escritura.
2. Reconciliación GitHub migrations ↔ Supabase ledger/schema.
3. Rebuild/disaster-recovery test.
4. Security/RLS/Storage hardening.
5. Branch protection de `main`.
6. No repetir migraciones por memoria.

P1:
- QA automatizado crítico;
- atomicidad de cierres/importaciones;
- modelo canónico de ventas/touchpoints;
- Showroom concurrente;
- crecimiento de `audit_log`;
- geo performance.

## 12. Workflow obligatorio

`feature branch → CI/build → QA aislado → PR → aprobación → merge → main → Fetch/Pull → npm run deploy → QA producción → actualizar baseline/documentación`

Deploy:
- manual;
- solo desde `main`;
- mediante `npm run deploy`;
- merge ≠ deploy.

## 13. Qué debe hacer un chat nuevo

Antes de modificar:
1. leer `docs/CHAT_CONTINUATION_CURRENT.md`;
2. leer este archivo;
3. verificar GitHub main;
4. verificar Supabase vivo;
5. verificar Cloudflare productivo;
6. revisar PR abiertos;
7. no asumir estado por historial del chat.

Si el usuario ya pagó Supabase:
- verificar plan/costo real;
- evaluar Development Branch/staging;
- no reutilizar automáticamente PR #85 sin revisar su vigencia.

Si todavía no pagó:
- mantener 16.3.15 estable;
- no hacer QA con escritura local;
- continuar análisis/diseño/documentación.
