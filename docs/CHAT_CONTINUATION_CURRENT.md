# Continuación actual — Gestión de Ventas Diaria / Logística

Fecha: **13/09/2026 (RD)**

> **DOCUMENTO MAESTRO ACTUAL. LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub, Supabase, CI y Cloudflare reales son la fuente de verdad. Verificar estado real antes de escribir, mergear o desplegar.

## Orden recomendado de lectura

1. `docs/CHAT_CONTINUATION_CURRENT.md`
2. `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`
3. `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`
4. `docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`
5. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`
6. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`
7. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`
8. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`

Si hay discrepancia, prevalecen GitHub/Supabase/CI/Cloudflare reales y el checkpoint más reciente.

# Producción actual

Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`

Rama productiva: `main`

Main de código desplegado: `ea6a7314e34dbbdad2a54b6590c177f1bcebadf0`.

Release productivo: **0.6.5-beta.15.0**

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Cloudflare Version ID: `6889d500-e3f0-477a-9994-79a5c6c30bf9`

PR de promoción Street Operations V1: **#60 — MERGED**

CI pre-merge: **SUCCESS**

CI post-merge sobre `main`: **SUCCESS**

Deploy Cloudflare: **SUCCESS**

Estado productivo:

**JORNADAS LIBRES + VISITAS ADICIONALES PRODUCTIVO / TRACKING >45 MIN ACTIVO / NO_GESTIONADO ACTIVO / CONFIRMACIÓN SHOWROOM ACTIVA / FALLBACK GPS DE SALIDA ACTIVO / P1 HISTORIAL POR VIAJE ACTIVO / SHARED MAP CORE ACTIVO / FILTRO DESDE-HASTA ACTIVO / EXCEL ESTRUCTURADO ACTIVO / DISTANCIA OPERATIVA ESTIMADA ACTIVA.**

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# Street Operations V1 — PRODUCTIVO

Documento técnico: `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Release: **0.6.5-beta.15.0**

## Jornada Libre

- El vendedor puede iniciar una Jornada Libre cuando no existe ruta planificada disponible para el día actual.
- Internamente usa `route_mode = LIBRE`.
- Mantiene los mismos hitos operativos de una jornada planificada: inicio, llegada, atención, salida y cierre.
- No crea `route_stops` artificiales.
- Cobertura se muestra `N/A`.
- Máximo una Jornada Libre por vendedor y fecha, aunque la primera ya esté finalizada.
- Después del cierre, la UI muestra `Jornada del día finalizada` y no ofrece una segunda jornada.

## Visitas adicionales

- Dentro de una ruta planificada activa el vendedor puede visitar clientes fuera del plan.
- Se guarda `planned=false` y `route_stop_id=null`.
- Las visitas adicionales cuentan para actividad real y Total visitas.
- Nunca inflan numerador ni denominador de cobertura del plan.
- Un cliente que ya existe como parada planificada no puede registrarse como adicional.

## Endurecimiento previo a producción

- Salida de visita: primer intento GPS, reintento explícito y fallback final para guardar sin coordenadas.
- Una gestión comercial no se pierde por un fallo transitorio de GPS.
- Fotos/evidencia no dependen de tener GPS de salida.
- Resultado comercial `NO_GESTIONADO` mostrado como `Cliente no estaba / no gestionado`.
- Si `¿Lo recibieron? = No`, el formulario propone `NO_GESTIONADO` + `NO_RECIBIDO`.
- Showroom: selección de fecha/hora requiere confirmación explícita antes de finalizar.
- Tracking: KPI `Sin registro >45 min`, por vendedor activo único, clicable y con detalle de vendedores que requieren revisión.
- No se agregó GPS periódico, polling nuevo, Realtime ni tracking continuo.

## QA aprobado

### Jornada Libre E2E

- inicio correcto;
- visita libre `planned=false` / `route_stop_id=null`;
- llegada y salida con tiempos;
- formulario comercial normal;
- cierre normal;
- plan y sesión `FINALIZADA`;
- 0 pendientes artificiales;
- cobertura N/A;
- segunda Jornada Libre del mismo día bloqueada en UI y DB.

### Ruta planificada + adicionales

Prueba real 13/09/2026:

- 3 paradas planificadas;
- 3 planificadas finalizadas `VISITADO`;
- 2 visitas fuera del plan completadas;
- 5 visitas totales reales;
- 0 visitas abiertas al cierre;
- ruta/sesión `FINALIZADA`.

### QA final

- fallo inicial GPS al iniciar ruta no dejó sesión huérfana;
- intento posterior registró inicio correctamente;
- `Cliente no estaba / no gestionado`: validado;
- confirmación explícita de fecha/hora de showroom: validada;
- Tracking `Sin registro >45 min`: validado;
- smoke de Rutas / Jornadas / Visitas / Tracking: aprobado.

# Migraciones Street Operations V1

Aplicadas y versionadas; **no repetir por memoria**:

- `20260911225302_open_field_journeys_v1`
- `20260912163228_open_field_journey_start_fix`
- `20260912172056_open_field_one_free_journey_per_day`

Antes del merge productivo se confirmó:

- `0` sesiones activas;
- `0` visitas abiertas;
- sin grupos de doble jornada activa.

# Baseline anterior

Release anterior: **0.6.5-beta.14.0**

Main anterior: `968671f26b4cbff3896ffdc11fb325fa861b96d9`.

Cloudflare Version ID anterior: `ac7ee2e2-0dbf-473d-9877-f46b3455e300`.

Ese baseline fue reemplazado productivamente por `0.6.5-beta.15.0`.

# P0 Logística ya productivo

Validados previamente:

- reintentos trazables y saldo pendiente;
- bloqueo documento entregado;
- bloqueo saldo incorrecto;
- POD/firma en dos etapas;
- firma endurecida contra toque/microtrazo;
- Performance Fase 1;
- GPS móvil por HTTPS;
- cierre de viaje sin eventos duplicados.

Migraciones P0 ya aplicadas; **no repetir**:

- `20260907094026_delivery_document_retry_traceability`
- `20260907094801_delivery_document_retry_guard_refinement`

# Supabase

Proyecto:

- nombre: `Gestion de Ventas Diaria`;
- ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`.

Política vigente:

- sin polling por defecto;
- sin Realtime por defecto;
- sin GPS continuo;
- no limpiar TEST sin backup + aprobación;
- no reescribir RLS global a ciegas.

# P1 — Historial por Viaje / Recorrido Operativo — PRODUCTIVO

Documento técnico principal: `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`

Incluye:

- Documentos + Viajes;
- explorador y búsqueda;
- filtros por estado;
- período Desde/Hasta;
- KPIs;
- mapa profesional compartido;
- secuencia planificada;
- trayectoria GPS estimada;
- desviaciones e incidencias;
- timeline;
- permanencia y resultados;
- Excel estructurado;
- distancia operativa estimada liviana.

Shared Map Core: `src/lib/logisticsMapCore.ts`.

Distancia: `src/lib/logisticsTripDistance.ts`.

La distancia es estimada entre puntos ya existentes; no es recorrido vial exacto. Se mantiene la decisión de **no implementar breadcrumbs ni tracking periódico** para no aumentar consumo y complejidad sobre Supabase Free.

# Seguridad y consumo

Hallazgos previos del Security Advisor siguen como backlog dedicado; no hacer refactor masivo de RLS durante una entrega funcional.

No interpretar datos TEST ni coordenadas QA artificiales como conducta real del vendedor/chofer.

La precisión GPS del dispositivo y la distancia al punto maestro son conceptos distintos. Un punto puede tener precisión aceptable y aun así estar muy distante del cliente; Tracking debe conservar ambas lecturas separadas.

# Reglas de trabajo

- producción actual: **0.6.5-beta.15.0**;
- `main` es la fuente de código productivo;
- PR #60 está mergeado;
- no introducir GPS continuo sin decisión explícita futura;
- no limpiar TEST;
- antes de cualquier cambio revalidar `main`, Supabase, CI y producción;
- si se abre otro chat, leer este documento primero y verificar que el estado vivo siga coincidiendo con este checkpoint.
