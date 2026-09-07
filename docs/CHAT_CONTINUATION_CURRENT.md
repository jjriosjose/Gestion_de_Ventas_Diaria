# Continuación actual — Gestión de Ventas Diaria

Fecha del checkpoint: **07/09/2026 (RD)**

> **LEER PRIMERO EN UN CHAT NUEVO.** GitHub `main`, Supabase y Cloudflare son la fuente de verdad. Si este documento contradice el estado real de los servicios, verificar y usar el estado real.

## Documento detallado prioritario

El checkpoint operativo completo actual está en:

**`docs/CHAT_CONTINUATION_2026-09-07.md`**

Debe leerse completo antes de continuar trabajo de Logística.

## Producción estable

- Repo: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Producción validada: **0.6.5-beta.12.2.8**.
- Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID conocido: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Datos actuales: **TEST** hasta declaración explícita de Go-Live.

## Supabase

- Project Ref: `ccvzosnhxitfeochnflr`.
- Mismo proyecto transferido administrativamente el 06/09/2026 a una organización separada.
- No fue clonado/recreado.
- API, DB, Auth, RLS, Storage y project ref permanecieron iguales.
- Cloudflare permanece independiente y no fue movido.

## Logística / Despacho y Entregas — estado actual

La frase anterior **“diseñado pero no implementado” ya NO es válida**.

Estado real al 07/09/2026:

- rama: **`feature/logistics-delivery-v1`**;
- PR: **#58**;
- PR continúa **OPEN + DRAFT + NO MERGE**;
- dominio `delivery_*` implementado en Supabase;
- bucket privado de evidencia implementado;
- Edge Function `delivery-access` implementada y desplegada para QA;
- frontend Logística implementado en la feature branch;
- QA E2E avanzado realizado con datos TEST.

Ya se han probado, entre otros:

- Transportistas / Choferes / Vehículos;
- Excel + plantilla oficial `entregas.xlsx` + carga manual;
- cliente maestro y cliente externo;
- GPS desde Excel / maestro / Torre de Control / chofer;
- ubicación pendiente sin bloquear;
- viaje, paradas y documentos;
- varias facturas en una misma parada;
- acceso temporal por link + PIN;
- ruta del chofer;
- llegada, descarga y entrega;
- conciliación por factura/documento;
- entregas completas/parciales/no entregadas;
- POD/foto/firma base;
- incidencias y resolución por chofer;
- retorno a base separado del cierre;
- GPS de retorno/cierre;
- viaje `COMPLETED` en modo solo lectura;
- bloqueo de nuevas incidencias/acciones después de cierre.

## NO promover Logística todavía

Antes de merge/deploy quedan como mínimo:

1. **P0 Reintentos/saldos pendientes**:
   - activos bloquean;
   - entregados bloquean;
   - no entregados/reprogramados/cancelados pueden reintentarse;
   - parciales solo por bultos retornados;
   - trazabilidad de intento.
2. **P0 Firma/POD mejorada**:
   - conciliación primero;
   - pantalla grande dedicada a firma antes del guardado final.
3. **P0/P1 Performance portal del chofer**:
   - hoy `getGeo()` puede esperar hasta 9 s antes de cada acción;
   - la Edge Function realiza varias operaciones/lecturas antes de devolver payload completo;
   - optimizar sin polling ni Realtime.
4. **P1 Historial por viaje**:
   - `Documentos | Viajes`;
   - mapa grande + timeline de eventos GPS;
   - trayectoria estimada entre eventos, NO GPS continuo.
5. QA E2E final + auditoría PR #58 + CI + smoke móvil.

## Hallazgo de rendimiento prioritario

En `ExternalDelivery.tsx`, casi cada transición operativa llama a geolocalización con:

- `enableHighAccuracy: true`;
- `timeout: 9000`;
- `maximumAge: 30000`.

Esto puede introducir varios segundos de espera **antes** de llamar Supabase.

Luego `delivery-access` valida acceso, consulta/actualiza datos, registra el evento y devuelve viaje + paradas + documentos + incidencias.

Optimización recomendada:

- cache del último GPS exitoso con timestamp;
- GPS fresco solo en eventos geográficamente críticos;
- reutilizar GPS reciente en inicio/fin de descarga;
- timeout de GPS menor con fallback seguro;
- no segundo refresh después de una acción;
- paralelizar operaciones seguras del backend;
- reducir updates innecesarios de `last_used_at`;
- medir tiempo GPS vs Edge Function vs total.

**No introducir polling automático ni Realtime para resolver esta latencia.**

## Política de consumo

Preservar durante validación Supabase Free:

- sin polling periódico;
- sin Realtime por defecto;
- actualización manual o respuesta de acción;
- fotos comprimidas;
- históricos bajo demanda;
- mapa histórico consulta solo el viaje seleccionado.

## Orden de trabajo recomendado

1. leer `docs/CHAT_CONTINUATION_2026-09-07.md`;
2. optimizar rendimiento del portal del chofer;
3. implementar reintentos/saldo pendiente con trazabilidad;
4. mejorar firma/POD;
5. implementar Historial por Viajes/mapa;
6. QA E2E final;
7. auditoría final PR #58;
8. decidir GO/NO-GO de Logística.

## Documentos obligatorios para continuar Logística

1. `docs/CHAT_CONTINUATION_CURRENT.md`.
2. `docs/CHAT_CONTINUATION_2026-09-07.md`.
3. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`.
4. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`.
5. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`.
6. `docs/SUPABASE_TRANSFER_2026-09-06.md`.
7. GitHub `main` real, PR #58, Supabase y Cloudflare reales.

## Workflow obligatorio

- verificar rama antes de escribir;
- mantener Logística en `feature/logistics-delivery-v1` mientras PR #58 siga Draft;
- no tocar `main` sin decisión explícita;
- PR + diff + CI + QA;
- usuario sincroniza con GitHub Desktop;
- en Windows del usuario no depender de `git` CLI;
- no limpiar datos TEST ni repetir migraciones por memoria.

> Diseño/documentación no equivale a producción. Verificar servicios reales antes de cualquier cambio.