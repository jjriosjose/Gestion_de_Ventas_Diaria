# Continuación actual — Gestión de Ventas Diaria

Fecha: **13/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub `main`, Supabase, CI y Cloudflare reales son la fuente de verdad. Antes de escribir, migrar, mergear o desplegar, verificar el estado vivo.

## Orden de lectura recomendado

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`
3. `docs/CONTINUATION_PROMPT_2026-09-13_BETA16_2.md`
4. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
5. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
6. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
7. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
8. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
9. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
10. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

`PROJECT_HANDOFF.md` se conserva como documento histórico; su cabecera original quedó desactualizada y no debe prevalecer sobre este checkpoint ni sobre el estado vivo.

# Estado vivo al cierre de este checkpoint

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva de código: `main`

Release incorporado a `main`: **0.6.5-beta.16.2**

PR: **#63 — MERGED**

Merge funcional beta.16.2: `0355723c5931650c9e1942b0fa7ed63da057fcaf`

CI pre-merge final de la rama: Build validation **#996 SUCCESS**.

CI post-merge de `main`: Build validation **#997 SUCCESS**.

Cloudflare productivo: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último deploy Cloudflare confirmado antes de beta.16.2: release **0.6.5-beta.16.1**, Version ID `e3909fe3-5fa2-460e-b7dd-8517b1a8de31`.

**Importante:** al escribir este checkpoint, beta.16.2 ya está mergeada en GitHub `main`, pero el deploy Cloudflare de beta.16.2 todavía requiere ejecutar el flujo local validado `Pull main → npm run build → npx wrangler deploy`. Una vez desplegado, registrar aquí el nuevo Cloudflare Version ID. Un commit posterior que modifique solo documentación no requiere redeploy.

Todos los datos actuales siguen siendo **TEST** hasta declaración explícita del usuario de Go-Live.

# Beta.16.2 — Journey / Route Lifecycle

Documento: `docs/V065_BETA16_2_JOURNEY_ROUTE_LIFECYCLE.md`

Objetivo resuelto: un Vendedor ya no tiene que filtrar día por día para descubrir rutas planificadas antiguas que vencieron sin iniciarse.

Comportamiento vigente:

- Rutas consulta `executive_route_journeys_v4` para el estado operativo consolidado.
- Si existen rutas históricas `NO_INICIADA`, aparece un banner `N rutas anteriores no ejecutadas`.
- El banner muestra fecha de la más reciente y cantidad de paradas.
- `Ver no ejecutadas` abre `/jornadas?status=NO_INICIADA`.
- Jornadas detecta ese acceso y abre automáticamente en rango personalizado desde `01/01` del año hasta hoy.
- Las rutas vencidas se conservan como histórico; no se crea sesión artificial y no se permite ejecutarlas fuera de fecha.
- El wrapper de Rutas ya no usa refresco periódico de 30 segundos; actualiza en carga inicial y al recuperar foco/visibilidad.
- Sin migración Supabase, sin cambios RLS, sin limpieza de datos, sin Realtime y sin GPS continuo.

QA real TEST aprobado con Virmania Inoa:

- 01/09/2026 — Ruta de visitas — 15 paradas — no ejecutada.
- 30/08/2026 — Ruta de visitas — 8 paradas — no ejecutada.
- Banner Rutas: 2 rutas anteriores no ejecutadas.
- Jornadas: ambas visibles juntas en rango 01/01/2026 → 13/09/2026.
- Total planificado: 23; visitado: 0; cobertura: 0%.

Regla crítica a preservar: **una ruta pertenece exclusivamente a su fecha operativa**. Si vence sin iniciarse, queda `NO_INICIADA` para consulta/auditoría, pero no se reactiva en una fecha posterior.

# Captación

Beta.16.2 **no modifica Captación**.

La prueba del 13/09 ocurrió en domingo y el módulo solicitó confirmación de `Captación libre`; se determinó que ese comportamiento correspondía al contexto de día sin tarea activa. No introducir otra modificación en Captación sin una nueva necesidad reproducible en un día operativo normal.

# Beta.16.1 — Reporting Executive Consistency V2

Release anterior inmediatamente productivo en Cloudflare antes de beta.16.2: **0.6.5-beta.16.1**.

Incluye el Resumen ejecutivo de Inicio y exportación PDF ejecutivo ya validados visualmente. El PDF se genera correctamente a dos páginas con KPI, gráficas y rankings y mantiene consistencia con la vista ejecutiva.

# CRM Territorial + Showroom Flow — PRODUCTIVO

Migración aplicada; **no repetir por memoria**:

- `20260913165442_crm_territorial_showroom_v1`

Flujo vigente:

**Interés → solicitud → validación del Gestor → cita confirmada → llegada → espera → atención → resultado comercial → salida física.**

Capacidades que deben preservarse:

- filtros territoriales en CRM;
- llamadas entrantes/salientes;
- resultado `COMPRO` con monto;
- venta CRM incluida en resumen ejecutivo;
- pre-agenda separada de cita confirmada;
- Gestor responsable separado de quién atendió;
- Recepción V2 con cola de validación, agenda futura, llegada, espera, atención y salida;
- todos los Gestores pueden consultar movimiento, pero las acciones sensibles respetan responsable/RLS;
- compras showroom alimentan Dashboard;
- alertas sin polling continuo.

# Street Operations / Jornadas — PRODUCTIVO

Documento: `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Reglas vigentes:

- Jornada Libre disponible cuando no existe ruta planificada del día.
- `route_mode = LIBRE`.
- máximo una Jornada Libre por vendedor y fecha.
- visitas adicionales dentro de una ruta planificada usan `planned=false` y no inflan cobertura.
- cobertura planificada = visitados del plan / planificados del plan.
- jornadas vencidas no pueden continuar al día siguiente.
- pendientes de cierre requieren revisión/cierre, no continuidad.
- no GPS periódico, no polling nuevo, no Realtime.

Migraciones aplicadas; **no repetir**:

- `20260911225302_open_field_journeys_v1`
- `20260912163228_open_field_journey_start_fix`
- `20260912172056_open_field_one_free_journey_per_day`

# Logística — PRODUCTIVO

P0 validado:

- reintentos trazables y saldo pendiente;
- bloqueo de documento entregado;
- bloqueo de saldo incorrecto;
- POD/firma en dos etapas;
- firma endurecida;
- Performance Fase 1;
- GPS móvil por HTTPS;
- cierre de viaje sin duplicación de eventos.

P1 Historial por Viaje:

- documentos + viajes;
- filtros y KPI;
- mapa compartido;
- secuencia planificada;
- trayectoria GPS estimada;
- timeline;
- permanencia/resultados;
- Excel estructurado;
- distancia operativa estimada.

La trayectoria/distancia es una estimación entre eventos GPS ya registrados; no representa ruta vial exacta. No implementar breadcrumbs ni tracking continuo sin decisión explícita.

Migraciones P0 aplicadas; **no repetir**:

- `20260907094026_delivery_document_retry_traceability`
- `20260907094801_delivery_document_retry_guard_refinement`

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`.

La transferencia administrativa realizada anteriormente fue del mismo proyecto; no se clonó ni recreó.

Política de datos y consumo:

- sin polling por defecto;
- sin Realtime por defecto;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación explícita;
- no repetir migraciones por memoria;
- no hacer refactor masivo de RLS/security durante una entrega funcional;
- Security Advisor pendiente se trata como auditoría dedicada.

# Reglas de trabajo obligatorias

1. `main` es la fuente de código productivo.
2. Desarrollo nuevo: rama feature → PR → CI → QA → autorización → merge.
3. Antes de escribir: verificar `main`, PRs, CI, Supabase y producción.
4. No usar conversaciones antiguas como fuente de verdad cuando contradigan el estado vivo.
5. No limpiar datos TEST sin backup y aprobación.
6. No alterar Auth/RLS/migraciones de forma masiva sin análisis dedicado.
7. No introducir polling, Realtime ni GPS continuo por defecto.
8. Mantener el producto SaaS-ready de forma progresiva sin improvisar multi-tenancy parcial.
9. GitHub Desktop se usa para sincronización local; CMD/PowerShell para `npm`, build y deploy.
10. Si un chat nuevo continúa el proyecto, leer este documento y luego `docs/CONTINUATION_PROMPT_2026-09-13_BETA16_2.md`.

# Próximo paso inmediato

GitHub `main` ya contiene beta.16.2 y CI #997 pasó. Falta únicamente sincronizar el `main` local, construir y desplegar Cloudflare. Después del deploy:

- confirmar versión visible `0.6.5-beta.16.2`;
- registrar Cloudflare Version ID;
- actualizar este documento con el deploy definitivo si todavía figura como pendiente.
