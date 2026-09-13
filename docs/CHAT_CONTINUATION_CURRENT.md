# Continuación actual — Gestión de Ventas Diaria

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

Main de código desplegado: `fde063fd4e5746575af7cc350901056d32ec0849`.

Release productivo: **0.6.5-beta.16.0**

Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Cloudflare Version ID: `875c7105-7d7c-4b05-a047-226f3f453dc2`

PR de promoción CRM Territorial + Showroom Flow V1: **#61 — MERGED**

CI pre-merge: **SUCCESS**

CI post-merge `main` build #969: **SUCCESS**

Deploy Cloudflare: **SUCCESS**

> Nota: cualquier commit posterior al SHA desplegado que modifique solo documentación no requiere redeploy.

Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

# CRM Territorial + Showroom Flow V1 — PRODUCTIVO

Release: **0.6.5-beta.16.0**

Migración aplicada y versionada; **no repetir por memoria**:

- `20260913165442_crm_territorial_showroom_v1`

## Llamadas / CRM territorial

- Filtros territoriales compatibles con la lógica del módulo Mapa: Maestro comercial o División territorial oficial.
- Región, provincia, municipio/distrito según la fuente territorial elegida.
- Filtros por vendedor, gestor, tipo, estado CRM, resultado, dirección de llamada y rango de fechas.
- Cobertura telefónica y cartera pendiente por territorio.
- Llamadas entrantes y salientes.
- Duración opcional, sin valor artificial por defecto.
- Resultado `COMPRO` exige monto de compra.
- Ventas por llamada alimentan el resumen ejecutivo.
- Cartera priorizada + Cliente 360 en dos columnas; `Gestionar` mantiene el formulario visible.
- `Registrar llamada` permite seleccionar/buscar cliente de forma directa.
- Fecha/hora tentativa de showroom requiere confirmación explícita.

## Agenda / Showroom

Flujo vigente:

**Interés → solicitud → validación del Gestor → cita confirmada → llegada → espera → atención → resultado comercial → salida física.**

- Solicitudes originadas desde llamada o visita se asignan al Gestor oficial del cliente.
- Solicitudes sin Gestor quedan en cola administrativa para asignación.
- Todos los Gestores pueden consultar el movimiento completo de Agenda/Showroom.
- Solo el Gestor responsable o administración puede ejecutar la atención comercial correspondiente.
- Pre-agenda/PENDIENTE_VALIDACION se distingue de una cita realmente confirmada.
- `Quién atendió` usa desplegable de Gestores activos y se guarda separado del Gestor responsable.
- Próxima acción usa catálogo estructurado/desplegable.
- Compra showroom registra monto y alimenta Dashboard.
- Disponibilidad diaria del Gestor: Disponible / En atención / Almuerzo.
- Salir a comer y regresar del almuerzo no usa polling ni Realtime.

## Recepción V2

- Centro operativo para agenda futura, pre-agenda, llegadas, espera, atención y salida.
- KPIs: Por validar, Citas hoy, Próximos 7 días, Próximos 30 días, Dentro, En espera, En atención.
- Rango Desde/Hasta y accesos rápidos Hoy / 7 / 30 / 90 días.
- Filtros por Gestor, tipo de cliente, origen, estado y búsqueda.
- `Pre-agenda · solicitudes por validar` separada del calendario de llegadas confirmadas.
- Calendario muestra fecha/hora real confirmada, cliente, origen y Gestor responsable.
- Llegada de una cita confirmada puede registrarla:
  - Recepción;
  - Administración;
  - el Gestor responsable de esa cita.
- Otros Gestores pueden consultar la cita, pero no registrar la llegada.
- Llegada sin cita de un cliente comercial conserva Gestor oficial o exige asignar uno.
- `Detalle de visita` usa catálogo estructurado; casos especiales van en Observación.
- Recepción carga la cartera completa de clientes mediante paginación, evitando límite práctico de 1000.
- La salida física permanece separada de la finalización de la atención comercial.

## Alertas

- Showroom pendiente de validar genera alerta al Gestor responsable.
- Llegada/cliente esperando queda visible para el Gestor responsable.
- Las alertas siguen `assigned_manager_id`.
- Se actualizan con navegación/foco/apertura de campana sin polling continuo.

## Dashboard / Inicio

Ventas registradas unifican:

**calle + llamadas + showroom**

con desglose por origen.

Las compras y montos de llamada/showroom se integran al resumen ejecutivo y rankings sin crear un sistema de facturación paralelo.

## QA aprobado CRM V1

Casos reales TEST verificados:

- COMERCIAL DE LEON visible en Recepción dentro del rango futuro.
- CASA MIREYA / COMETA: pre-agenda separada de cita confirmada.
- BEKIM S SRL: llegada sin cita, alerta y movimiento visibles para Gestores.
- Un Gestor puede ver citas/movimientos de otro Gestor.
- Un Gestor distinto no puede registrar llegada de una cita ajena.
- Recepción puede registrar llegada después de que el Gestor responsable confirma la cita.
- El Gestor responsable conserva capacidad de registrar la llegada de su propia cita.
- Compra showroom RD$200,450 persistida y reflejada en Dashboard.
- Nueva compra CRM/Showroom de COMETA persistida con seguimiento estructurado.
- Dashboard QA validó desglose calle + llamadas + showroom.
- No se observaron llegadas parciales/duplicadas cuando RLS bloqueó una acción no autorizada.

# Street Operations V1 — PRODUCTIVO

Documento técnico: `docs/OPEN_FIELD_JOURNEYS_V1_2026-09-11.md`

Release de promoción original: **0.6.5-beta.15.0**

## Jornada Libre

- El vendedor puede iniciar una Jornada Libre cuando no existe ruta planificada disponible para el día actual.
- Internamente usa `route_mode = LIBRE`.
- Mantiene inicio, llegada, atención, salida y cierre.
- No crea `route_stops` artificiales.
- Cobertura N/A.
- Máximo una Jornada Libre por vendedor y fecha.
- Visitas adicionales dentro de ruta planificada se guardan `planned=false` y no alteran cobertura planificada.
- Salida de visita: GPS con reintento y fallback final para guardar sin coordenadas.
- Resultado `NO_GESTIONADO` mostrado como `Cliente no estaba / no gestionado`.
- Tracking: `Sin registro >45 min` por vendedor activo, con detalle clicable.
- Sin GPS periódico, polling nuevo, Realtime ni tracking continuo.

Migraciones aplicadas; **no repetir**:

- `20260911225302_open_field_journeys_v1`
- `20260912163228_open_field_journey_start_fix`
- `20260912172056_open_field_one_free_journey_per_day`

# P1 — Historial por Viaje / Recorrido Operativo — PRODUCTIVO

Documento técnico: `docs/LOGISTICS_TRIP_HISTORY_P1_2026-09-08.md`

Incluye:

- Documentos + Viajes;
- explorador y búsqueda;
- filtros de estado y período Desde/Hasta;
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

La distancia es estimada entre puntos ya existentes; no es recorrido vial exacto. No implementar breadcrumbs ni tracking periódico sin decisión explícita.

# P0 Logística — PRODUCTIVO

Validados previamente:

- reintentos trazables y saldo pendiente;
- bloqueo documento entregado;
- bloqueo saldo incorrecto;
- POD/firma en dos etapas;
- firma endurecida contra toque/microtrazo;
- Performance Fase 1;
- GPS móvil por HTTPS;
- cierre de viaje sin eventos duplicados.

Migraciones aplicadas; **no repetir**:

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

# Seguridad y consumo

Hallazgos previos del Security Advisor siguen como backlog dedicado; no hacer refactor masivo de RLS durante una entrega funcional.

No interpretar datos TEST ni coordenadas QA artificiales como conducta real del vendedor/chofer.

La precisión GPS y la distancia al punto maestro son conceptos distintos y deben conservarse separadas en Tracking.

# Baseline anterior inmediato

Release anterior: **0.6.5-beta.15.0**

Main desplegado anterior: `ea6a7314e34dbbdad2a54b6590c177f1bcebadf0`.

Cloudflare Version ID anterior: `6889d500-e3f0-477a-9994-79a5c6c30bf9`.

Ese baseline fue reemplazado productivamente por **0.6.5-beta.16.0**.

# Reglas de trabajo

- producción actual: **0.6.5-beta.16.0**;
- código desplegado: `fde063fd4e5746575af7cc350901056d32ec0849`;
- Cloudflare Version ID: `875c7105-7d7c-4b05-a047-226f3f453dc2`;
- `main` es la fuente de código productivo;
- PR #61 está mergeado;
- no introducir GPS continuo sin decisión explícita futura;
- no limpiar TEST;
- antes de cualquier cambio revalidar `main`, Supabase, CI y producción;
- si se abre otro chat, leer este documento primero y verificar que el estado vivo siga coincidiendo con este checkpoint.
