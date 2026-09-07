# Continuación actual — Gestión de Ventas Diaria / Logística

Fecha: **07/09/2026 (RD)**

> **LEER PRIMERO EN EL PRÓXIMO CHAT.** GitHub, Supabase, CI y Cloudflare reales son la fuente de verdad. Verificar el estado real antes de escribir, mergear o desplegar.

## Orden obligatorio de lectura

1. **`docs/CHAT_CONTINUATION_CURRENT.md`** — este checkpoint.
2. **`docs/LOGISTICS_P0_IMPLEMENTATION_STATUS_2026-09-07.md`** — estado P0 más reciente.
3. `docs/CHAT_CONTINUATION_2026-09-07_FINAL.md` — handoff histórico anterior a los P0 nuevos.
4. `docs/LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`.
5. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`.
6. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`.
7. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`.

Si hay discrepancia, prevalecen servicios reales + este checkpoint P0 más reciente.

## Producción estable — NO TOCAR POR AHORA

- Repo: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama productiva: `main`.
- `main` verificado antes de P0 en `23eef94d400a69ac66d00e750397433ff935ff5d`.
- Versión productiva conocida: **0.6.5-beta.12.2.8**.
- Producción Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Logística NO está mergeada ni desplegada a producción.
- Datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

## Rama y PR de Logística

Trabajar únicamente en:

**`feature/logistics-delivery-v1`**

PR:

**#58 — Logistics & Delivery V1 — implementation**

Estado obligatorio:

- OPEN;
- DRAFT;
- NO MERGE;
- NO DEPLOY;
- base `main`.

Verificar head y CI reales al comenzar cada sesión porque la documentación también genera nuevos commits.

## Supabase

Proyecto real:

- nombre: `Gestion de Ventas Diaria`;
- Project Ref: `ccvzosnhxitfeochnflr`;
- región: `ca-central-1`;
- estado verificado durante P0: `ACTIVE_HEALTHY`;
- `delivery-access`: ACTIVE v6.

El mismo proyecto fue transferido administrativamente el 06/09/2026; no fue clonado ni recreado.

No repetir migraciones existentes.

## Logística funcional ya existente

La feature branch y Supabase QA ya incluyen:

- módulo Despacho y entregas;
- Transportistas;
- Choferes;
- Vehículos;
- carga Excel y manual;
- plantilla `entregas.xlsx`;
- cliente maestro y cliente externo;
- GPS Excel / maestro / Torre de Control / chofer;
- ubicación pendiente sin bloquear viaje;
- creación de viajes, paradas y documentos;
- múltiples facturas por una misma parada;
- Torre de Control y mapas;
- división territorial;
- acceso temporal por link + PIN;
- ejecución móvil del chofer;
- salida, llegada, descarga, entrega;
- conciliación por documento;
- incidencias y resolución;
- retorno a base;
- cierre físico con hora/GPS;
- viaje finalizado en solo lectura;
- Historial/POD base.

No reimplementar estas funciones por memoria de documentos antiguos.

# P0 actual

## P0-A — Reintentos / saldo pendiente

Estado:

**IMPLEMENTADO EN RAMA + SUPABASE QA / BUILD VERDE / PENDIENTE QA E2E DE ESCRITURA**

Migraciones aplicadas y registradas:

- `20260907094026_delivery_document_retry_traceability`;
- `20260907094801_delivery_document_retry_guard_refinement`.

`delivery_documents` ahora tiene:

- `retry_of_document_id`;
- `attempt_number`;
- `packages_pending` calculado.

Reglas backend implementadas:

- viaje activo → bloquear;
- histórico `DELIVERED` → bloquear;
- `PARTIAL`, `NOT_DELIVERED`, `RESCHEDULED`, `CANCELLED` → reintento elegible con saldo;
- referencia obligatoria al último intento elegible;
- intento #N incremental;
- reintento carga exactamente el saldo pendiente;
- conserva el monto anterior;
- identidad contempla empresa + factura/pedido;
- guard backend evita que un frontend desactualizado cree duplicados silenciosos.

Frontend implementado:

- `src/lib/logisticsRetry.ts`;
- clasificación `NEW | RETRY | BLOCKED`;
- preview con `Reintento permitido · intento #N`;
- conteo de reintentos/bloqueados;
- preflight al Excel/manual y otra vez antes de crear viaje;
- inserción conserva `retry_of_document_id` + `attempt_number`.

Datos TEST históricos no fueron limpiados ni alterados para fabricar la prueba.

Saldos verificados, entre otros:

- QA-0004 → 2 pendientes;
- QA-0005 → 1 pendiente;
- QA-0011 → 9 pendientes.

## P0-B — Firma / POD mejorada

Estado:

**IMPLEMENTADO EN RAMA / BUILD VERDE / PENDIENTE QA MÓVIL E2E**

El portal de chofer ahora separa:

### Etapa 1

- conciliación por documentos;
- bultos entregados/retornados;
- motivo de diferencia;
- receptor;
- documento/teléfono;
- fotografía;
- observación;
- botón `Continuar a firma`.

No guarda definitivamente aquí.

### Etapa 2

- pantalla/modal grande dedicado a firma;
- resumen de entrega;
- canvas táctil amplio;
- `Limpiar`;
- `Volver` sin guardar;
- `Confirmar firma y entrega`.

La entrega solo se guarda después de una firma real.

`SignaturePad.tsx` fue corregido para que un toque sin trazo no sea aceptado como firma válida.

## P0-C — Performance del portal del chofer

Estado:

**FASE 1 IMPLEMENTADA / BUILD VERDE / PENDIENTE QA MÓVIL COMPARATIVO**

No repetir la Fase 1 aunque `ExternalDelivery.tsx` todavía contenga el `getGeo()` tradicional.

La optimización se aplica mediante:

`public/delivery-geo-optimizer.js`

Política:

- solo `/entrega/`;
- cache GPS en memoria para eventos intermedios;
- intento corto ~1.8 s intermedio;
- fallback intermedio limitado;
- críticos buscan GPS fresco;
- timeout fresco máximo aprox. 3.5 s;
- sin polling;
- sin Realtime;
- sin GPS continuo;
- sin consultas de fondo.

QA móvil requerido:

`Llegué → Iniciar descarga → Fin de descarga → POD → Iniciar retorno → Cerrar viaje`.

Solo si la mejora sigue siendo insuficiente, ejecutar Fase 2 backend:

- throttle `delivery_access_links.last_used_at`;
- paralelización segura;
- medir GPS vs Edge Function vs total.

NO solucionar latencia con polling/Reatime.

# CI

Los builds TypeScript + Vite posteriores a P0-A y P0-B terminaron en **SUCCESS**.

El workflow territorial se ejecuta por commits del PR aunque el cambio no sea territorial; verificar que termine verde sobre el head final antes de promoción.

# Seguridad

Security Advisor fue ejecutado después de las migraciones P0.

El nuevo guard `private.delivery_guard_document_retry()` no apareció como hallazgo.

Permanecen hallazgos globales previos, no creados por este P0:

- vistas ejecutivas `SECURITY DEFINER`;
- funciones antiguas con grants amplios;
- algunas funciones con search_path mutable;
- Leaked Password Protection deshabilitado;
- `bootstrap_credentials` con RLS sin policy.

No hacer hardening global a ciegas dentro del P0. Tratarlo en auditoría dedicada antes de promoción.

# QA pendiente antes de declarar P0 cerrado

## Reintentos

1. QA-0004 con 2 bultos y mismo monto → permitir intento #2;
2. QA-0011 con 9 bultos y mismo monto → permitir intento #2;
3. QA-0001 entregada → bloquear;
4. QA-0004 con saldo incorrecto → bloquear;
5. crear intento #2 y validar trazabilidad;
6. entregar intento #2 y comprobar bloqueo posterior;
7. validar cadena de intento si #2 vuelve a parcial/no entregado.

## Firma/POD

1. receptor obligatorio;
2. diferencia requiere motivo;
3. `Continuar a firma` no guarda;
4. toque sin dibujar no habilita confirmar;
5. trazo real habilita confirmar;
6. `Volver` no guarda y obliga a nueva firma;
7. confirmar guarda una sola vez y actualiza documentos/parada/POD.

## Performance

Comparar latencia perceptual de eventos críticos e intermedios en móvil real.

# P1 posterior a P0

**Historial por Viaje**:

- tabs `Documentos | Viajes`;
- fila por viaje;
- mapa grande;
- timeline de eventos;
- salida, llegadas, entregas, incidencias, retorno y cierre;
- tiempos de viaje/permanencia;
- botón `Ver recorrido`.

Regla semántica obligatoria:

> Es una **trayectoria estimada entre eventos GPS**, NO tracking continuo y NO recorrido vial exacto.

# Orden exacto desde este checkpoint

1. Verificar PR #58, head y CI real.
2. Verificar Supabase real; NO repetir las dos migraciones P0.
3. Ejecutar QA E2E real de reintentos/saldo.
4. Ejecutar QA móvil del nuevo flujo firma/POD.
5. Ejecutar QA móvil comparativo Performance Fase 1.
6. Solo si performance sigue insuficiente, implementar Fase 2 backend.
7. Si los P0 pasan, implementar P1 Historial por Viaje.
8. Repetir QA E2E completo.
9. Auditoría final de seguridad + consumo Supabase + CI.
10. Mantener PR Draft hasta aprobación explícita.
11. Solo entonces decidir GO/NO-GO para merge/deploy.

# Reglas finales

- NO modificar `main`.
- NO mergear PR #58 todavía.
- NO desplegar Logística a Cloudflare productivo todavía.
- NO limpiar datos TEST sin aprobación explícita.
- NO repetir migraciones por memoria.
- NO cambiar RLS/seguridad global sin auditoría y QA.
- GitHub + Supabase + CI + Cloudflare reales prevalecen sobre cualquier documento.
