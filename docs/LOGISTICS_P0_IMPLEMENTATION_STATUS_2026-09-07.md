# Logistics & Delivery V1 — P0 implementation checkpoint

Fecha: **07/09/2026 (RD)**

Rama: **`feature/logistics-delivery-v1`**

PR: **#58 — Logistics & Delivery V1 — implementation**

> Este documento complementa y prevalece, para el estado P0 más reciente, sobre `CHAT_CONTINUATION_2026-09-07_FINAL.md`. GitHub, Supabase y CI reales continúan siendo la fuente de verdad.

## 1. Restricciones vigentes

- NO modificar `main`.
- NO mergear PR #58 todavía.
- NO desplegar Logística a Cloudflare productivo.
- NO limpiar datos TEST.
- PR #58 debe permanecer Draft hasta cerrar QA E2E y gates finales.

## 2. P0 Reintentos / saldo pendiente

Estado: **IMPLEMENTADO EN RAMA + SUPABASE QA / BUILD VERDE / PENDIENTE QA E2E DE ESCRITURA**.

### Esquema aditivo aplicado

Migraciones reales en Supabase:

- `20260907094026_delivery_document_retry_traceability`;
- `20260907094801_delivery_document_retry_guard_refinement`.

`delivery_documents` incorpora:

- `retry_of_document_id`;
- `attempt_number`;
- `packages_pending` generado como saldo `packages_loaded - packages_delivered` sin permitir negativo.

### Guard backend

`private.delivery_guard_document_retry()` protege la inserción aunque el frontend esté desactualizado o exista una condición de carrera.

Reglas implementadas:

- documento en viaje no terminal: bloquear;
- histórico `DELIVERED`: bloquear;
- `PARTIAL`, `NOT_DELIVERED`, `RESCHEDULED`, `CANCELLED`: elegibles para reintento si conservan saldo;
- reintento debe apuntar al último intento elegible;
- `attempt_number` debe ser exactamente intento anterior + 1;
- el reintento debe cargar exactamente el saldo pendiente completo;
- el monto debe conservar el monto del documento anterior;
- identidad considera factura/pedido y empresa para evitar falsas colisiones entre empresas conocidas;
- sin referencia de reintento no se permite crear silenciosamente un duplicado histórico elegible.

La función vive en esquema `private`, usa `SECURITY DEFINER` con `search_path` fijo y no tiene `EXECUTE` para `PUBLIC`.

### Frontend

Archivo nuevo:

- `src/lib/logisticsRetry.ts`.

`Logistics.tsx` ahora clasifica cada borrador como:

- `NEW`;
- `RETRY`;
- `BLOCKED`.

La vista previa muestra:

- reintentos permitidos;
- intento #N;
- saldo pendiente;
- documentos bloqueados y su motivo.

La clasificación se ejecuta:

- al cargar Excel;
- al agregar manualmente;
- al quitar un documento;
- nuevamente inmediatamente antes de crear el viaje.

El insert de un reintento conserva `retry_of_document_id` y `attempt_number`.

### Validación realizada

Los 12 documentos TEST existentes conservaron `attempt_number = 1` y `retry_of_document_id = null`.

Ejemplos de saldo calculado verificados:

- `QA-0004`: 4 cargados, 2 entregados, **2 pendientes**;
- `QA-0005`: 9 cargados, 8 entregados, **1 pendiente**;
- `QA-0011`: 9 cargados, 0 entregados, **9 pendientes**;
- documentos entregados: saldo 0.

No se insertaron ni modificaron filas operativas durante esta validación. El intento de prueba transaccional por `execute_sql` fue rechazado por el conector al operar en transacción de solo lectura.

## 3. P0 Firma / POD en dos etapas

Estado: **IMPLEMENTADO EN RAMA / BUILD VERDE / PENDIENTE QA MÓVIL E2E**.

`ExternalDelivery.tsx` ahora divide el flujo:

### Etapa 1 — Detalle / conciliación

1. conciliación por documento;
2. bultos cargados / entregados / retorno;
3. motivos obligatorios cuando existe diferencia;
4. nombre del receptor;
5. documento y teléfono opcionales;
6. foto;
7. observación;
8. botón `Continuar a firma`.

No existe guardado definitivo en esta etapa.

### Etapa 2 — Firma dedicada

- modal/pantalla ampliada;
- resumen de documentos, entregados y retorno;
- canvas táctil grande;
- opción `Limpiar`;
- opción `Volver` sin guardar;
- botón `Confirmar firma y entrega`;
- el guardado definitivo solo se ejecuta después de una firma válida.

### Corrección adicional del canvas

`SignaturePad.tsx` fue corregido para que un simple toque sin trazo no genere una firma PNG aparentemente válida. Solo se habilita confirmación cuando existe tinta/trazo real.

## 4. P0 Performance del chofer

Estado: **FASE 1 YA IMPLEMENTADA / BUILD VERDE / PENDIENTE QA MÓVIL COMPARATIVO**.

Se mantiene la política documentada en `LOGISTICS_DRIVER_PERFORMANCE_PHASE1_2026-09-07.md`:

- sin polling;
- sin Realtime;
- sin GPS continuo;
- cache GPS solo en memoria;
- eventos intermedios pueden reutilizar fix reciente;
- eventos críticos intentan GPS fresco;
- timeout fresco aproximado máximo 3.5 s.

QA móvil requerido:

`Llegué → Iniciar descarga → Fin de descarga → POD → Iniciar retorno → Llegué a base / cerrar viaje`.

Solo si la mejora es insuficiente corresponde Fase 2 backend.

## 5. CI

Los builds TypeScript + Vite posteriores a P0-A y P0-B terminaron en **SUCCESS**.

El workflow territorial puede ejecutarse nuevamente por cada commit aunque los cambios no sean territoriales; verificar su conclusión sobre el head final antes de promoción.

## 6. Supabase posterior a P0

Proyecto: `ccvzosnhxitfeochnflr`.

Estado conocido: `ACTIVE_HEALTHY`.

`delivery-access`: ACTIVE v6.

Security Advisor posterior a las migraciones no reportó el nuevo guard de reintentos como hallazgo. Permanecen hallazgos globales previos en componentes no creados por este P0, entre ellos vistas ejecutivas `SECURITY DEFINER`, funciones antiguas con grants amplios y Leaked Password Protection deshabilitado.

No hacer hardening global dentro de este P0 sin QA dedicado.

## 7. QA E2E requerido antes de declarar P0 cerrado

### Reintentos

1. cargar `QA-0004` con exactamente 2 bultos y mismo monto → debe aparecer `Reintento permitido · intento #2`;
2. cargar `QA-0011` con exactamente 9 bultos y mismo monto → permitir intento #2;
3. intentar `QA-0001` entregada → bloquear;
4. intentar `QA-0004` con cantidad distinta de 2 → bloquear;
5. crear un reintento permitido y verificar `retry_of_document_id` + `attempt_number = 2`;
6. completar ese intento y comprobar que un intento posterior se bloquee si ya quedó `DELIVERED`;
7. probar una cadena de reintentos si un intento #2 vuelve a quedar parcial/no entregado.

### Firma/POD

1. completar conciliación;
2. intentar continuar sin receptor → bloquear;
3. parcial sin motivo → bloquear;
4. continuar a firma con datos válidos;
5. tocar el canvas sin dibujar → Confirmar debe seguir deshabilitado;
6. firmar con trazo real → habilitar confirmación;
7. `Volver` → no debe guardar y debe requerir nueva firma al regresar;
8. confirmar → guardar una sola vez el POD y actualizar parada/documentos correctamente.

### Performance

Comparar perceptualmente las transiciones móviles, especialmente `Iniciar descarga` y `Fin de descarga`.

## 8. P1 posterior

Después de cerrar los P0 por QA:

- Historial `Documentos | Viajes`;
- fila por viaje;
- mapa grande;
- timeline de eventos;
- salida, llegadas, entregas, incidencias, retorno, cierre;
- tiempos de viaje/permanencia;
- `Ver recorrido`;
- recorrido siempre descrito como **trayectoria estimada entre eventos GPS**, nunca como tracking continuo o recorrido vial exacto.

## 9. Siguiente paso exacto

**No programar Fase 2 de performance ni promover el PR todavía.**

El siguiente gate es ejecutar QA E2E en dispositivo/app real de los tres P0 ya implementados. Si Performance Fase 1 no alcanza una mejora aceptable, entonces implementar Fase 2 backend. Si los tres P0 pasan, continuar con P1 Historial por Viaje y después QA E2E final + auditoría de seguridad/consumo + decisión GO/NO-GO.
