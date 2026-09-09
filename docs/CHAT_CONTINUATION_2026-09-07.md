# Checkpoint de continuidad — Gestión de Ventas Diaria

Fecha: **07/09/2026 (RD)**

> **LEER PRIMERO SI ESTE CHAT CONTINÚA EN OTRO.** GitHub `main`, Supabase y Cloudflare son la fuente de verdad. Este documento resume el estado operativo y de desarrollo, pero si existe discrepancia debe verificarse el servicio real antes de modificar código, base de datos o producción.

## 1. Producción estable actual

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión productiva validada: **0.6.5-beta.12.2.8**.
- Cloudflare: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID conocido: `b9ee7e19-4428-4e75-81a4-39318ebc7f02`.
- Producción fue validada después de la transferencia de Supabase.
- Los datos continúan siendo **TEST** hasta declaración explícita de Go-Live.

## 2. Supabase

El proyecto `Gestion de Ventas Diaria` conserva el mismo Project Ref:

`ccvzosnhxitfeochnflr`

Fue transferido el 06/09/2026 a una organización Supabase separada, sin clonarlo ni recrearlo. Endpoint, base de datos, Auth, RLS, Storage y project ref permanecieron iguales.

Cloudflare no fue transferido ni requiere cambio por esa operación.

## 3. Nuevo dominio Logística / Despacho y Entregas

### Estado GitHub

- Rama activa: **`feature/logistics-delivery-v1`**.
- PR: **#58 — Logistics & Delivery V1 — implementation**.
- Base: `main`.
- Estado del PR al generar este checkpoint: **OPEN + DRAFT + MERGEABLE**.
- Regla vigente: **NO MERGE / NO DEPLOY de Logística todavía**.

La aplicación productiva sigue siendo beta.12.2.8; Logística se está validando en feature branch.

### Objetos implementados

Dominio separado de rutas/visitas comerciales:

- `delivery_transport_providers`;
- `delivery_drivers`;
- `delivery_vehicles`;
- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- `delivery_proofs`;
- `delivery_proof_documents`;
- `delivery_evidence`;
- `delivery_import_batches`;
- `delivery_access_links`;
- RLS del dominio;
- bucket privado `delivery-evidence`;
- Edge Function `delivery-access` con autenticación por token + PIN.

Edge Function de QA más reciente conocida: **delivery-access v6 ACTIVE**. Verificar versión real antes de desplegar o modificar.

## 4. Funcionalidades ya implementadas y probadas

### Maestros

- Transportistas.
- Choferes internos / contratados / terceros.
- Chofer sin usuario permanente.
- Vehículos propios / alquilados / terceros.
- Asociación de chofer y vehículo con transportista.

### Carga de documentos

- Excel como vía principal.
- Carga manual complementaria.
- Plantilla oficial descargable desde la app: **`entregas.xlsx`**.
- Columnas: Empresa, Factura, Pedido, Codigo Cliente, Cliente, Monto, Bultos, Latitud, Longitud, Telefono, Observaciones.
- Cliente existente puede tomar GPS del maestro.
- Cliente externo puede cargarse sin crear registro maestro.
- Latitud/Longitud opcionales.
- Ubicación pendiente no bloquea despacho.
- Múltiples facturas del mismo cliente/destino se agrupan en una sola parada.

### Viaje / ruta

- creación de viaje con chofer, vehículo y transportista;
- agrupación de documentos en paradas;
- totales de documentos, bultos y monto;
- Torre de Control con mapa;
- división territorial oficial;
- vistas Estándar / Mapa grande / Control Tower;
- actualización manual, sin polling periódico ni Realtime;
- GPS pendiente puede resolverse desde Torre de Control aun con ruta iniciada;
- el chofer recibe cambios mediante actualización manual o respuesta a su siguiente acción.

### Acceso temporal del chofer

- enlace + PIN;
- token guardado como hash;
- PIN criptográfico;
- expiración/revocación;
- 5 fallos → bloqueo temporal;
- acceso aislado al viaje asignado;
- al finalizar el viaje el acceso queda consumido/no operativo.

### Ejecución y tiempos

Probado:

- salida del centro de carga;
- llegada al cliente;
- inicio de descarga;
- fin de descarga;
- entrega;
- incidencia;
- resolución de incidencia por el mismo chofer;
- inicio de retorno a base;
- llegada a base / cierre de viaje;
- viaje finalizado en modo solo lectura.

La regla correcta de retorno quedó definida así:

1. **Iniciar retorno a base** = salida del último cliente / inicio del trayecto de regreso.
2. **Llegué a base · cerrar viaje** = llegada física a la base, hora final y GPS de cierre.

Se agregaron guards para no cerrar sin retorno y para impedir nuevas incidencias/acciones después de `COMPLETED`.

### POD / conciliación

Probado con varias facturas en una sola parada.

Escenario QA validado:

- 3 documentos;
- una factura completa;
- una parcial;
- una no entregada;
- conciliación por documento;
- retorno de bultos;
- motivos por diferencia;
- motivo específico `Cliente rechazó factura completa`;
- una parada con resultado parcial;
- POD asociado a documentos de la parada.

Regla monetaria ya ajustada:

- documento completo → suma su monto completo como monto entregado confirmado;
- documento parcial → no se prorratea dinero;
- documento no entregado → 0 entregado;
- monto entregado de la parada = suma solo de documentos completamente entregados.

## 5. Hallazgos de QA todavía pendientes antes de producción

### P0 — Reintentos de documentos

La lógica actual de duplicados es demasiado rígida: bloquea documentos históricos cuyo estado no sea `CANCELLED`, incluso si el viaje anterior ya finalizó con `PARTIAL`, `NOT_DELIVERED` o `RESCHEDULED`.

Regla funcional a implementar:

- documento en viaje ACTIVO → bloquear;
- documento histórico `DELIVERED` → bloquear;
- `NOT_DELIVERED` / `RESCHEDULED` / `CANCELLED` → permitir reintento;
- `PARTIAL` → permitir únicamente los bultos retornados/pendientes;
- mantener trazabilidad de intentos para distinguir reintento legítimo de duplicado accidental.

Diseño recomendado:

- `retry_of_document_id` o equivalente;
- `attempt_number`;
- mostrar en preview `Reintento permitido`, bultos pendientes e intento #N.

No implementar una simple excepción que permita duplicados sin trazabilidad.

### P0 — Firma / POD más cómodo

El `SignaturePad` existe, pero actualmente forma parte del formulario largo de entrega. En móvil puede quedar fuera de la zona visible y es poco cómodo para el receptor.

Diseño recomendado:

- flujo POD en 2 etapas;
- etapa 1: conciliación de documentos, motivos, receptor, teléfono, foto y observaciones;
- botón `Continuar a firma`;
- etapa 2: pantalla/modal grande dedicado a la firma;
- canvas táctil amplio;
- `Limpiar` + `Confirmar firma y entrega`;
- no guardar definitivamente la entrega antes de finalizar la firma;
- opción futura `Sin firma` solo con motivo obligatorio si el negocio lo requiere.

### P1 — Historial por viaje / recorrido

`Historial / POD` hoy está orientado principalmente a factura/documento.

Diseño recomendado:

- tabs `Documentos | Viajes`;
- `Documentos` conserva la experiencia actual;
- `Viajes` muestra una fila por viaje;
- al seleccionar un viaje: mapa grande + timeline de eventos;
- puntos GPS de salida, llegadas, entregas, incidencias, retorno y cierre;
- métricas de duración total, permanencia por cliente, descarga, retorno, etc.;
- botón `Ver recorrido` desde `Despacho y entregas > Viajes` que navegue a Historial/POD con el viaje seleccionado.

Semántica obligatoria:

**Trazabilidad GPS por eventos, NO GPS continuo de fondo.** Las líneas entre puntos son trayectoria estimada y no deben presentarse como recorrido vial exacto.

## 6. Hallazgo de rendimiento — portal del chofer

El usuario reportó que entre cada cambio de proceso la pantalla tarda varios segundos.

### Causa principal identificada en frontend

`ExternalDelivery.tsx` llama `getGeo()` antes de casi cada acción operativa.

Configuración actual conocida:

- `enableHighAccuracy: true`;
- `timeout: 9000`;
- `maximumAge: 30000`.

Por tanto un botón puede esperar hasta 9 segundos por GPS antes de iniciar siquiera la llamada a Supabase.

### Costo adicional en backend

Cada llamada a `delivery-access` realiza actualmente varios pasos:

1. resolver token/hash y consultar `delivery_access_links`;
2. validar PIN;
3. consultar viaje;
4. actualizar `last_used_at` del acceso;
5. leer/escribir el evento solicitado;
6. insertar `delivery_event`;
7. devolver un payload completo del viaje.

`tripPayload()` vuelve a consultar en paralelo:

- viaje;
- paradas;
- documentos;
- incidencias.

En `delivery_result` además existen operaciones secuenciales por documento y cargas de evidencia que pueden ampliar la demora.

### Plan de optimización recomendado

No introducir polling ni Realtime.

Optimizar en este orden:

1. **GPS cache inteligente** en el portal del chofer:
   - conservar último GPS exitoso con timestamp;
   - reutilizarlo para eventos intermedios recientes;
   - no esperar una nueva lectura de alta precisión en cada botón.
2. **GPS por criticidad**:
   - obtener lectura fresca en eventos importantes de ubicación: salida, llegada, entrega, inicio retorno y cierre;
   - para inicio/fin de descarga se puede reutilizar GPS reciente de la misma parada.
3. Reducir timeout de geolocalización para evitar esperas largas visibles; usar fallback seguro a último GPS reciente/null.
4. No hacer refresh redundante: la respuesta de la acción ya debe devolver el estado actualizado.
5. Optimizar Edge Function:
   - evitar update de `last_used_at` en cada acción si fue actualizado hace pocos segundos/minuto;
   - paralelizar actualizaciones de documentos cuando sea seguro;
   - paralelizar upload de firma/foto cuando aplique;
   - revisar si puede reducirse el número de lecturas para resolver acceso y devolver payload sin debilitar seguridad.
6. Instrumentar tiempos en QA antes/después y medir:
   - tiempo GPS;
   - tiempo Edge Function;
   - tiempo total percibido por acción.

Objetivo UX recomendado: acciones simples normalmente ~1–2 s con GPS reciente; eventos que requieran nueva ubicación pueden tardar algo más, pero no deben bloquear repetidamente hasta 9 s.

## 7. Política de consumo a preservar

Durante validación en Supabase Free:

- sin polling automático;
- sin refresh periódico;
- sin Realtime por defecto;
- actualización manual o respuesta de acción;
- fotos comprimidas;
- históricos bajo demanda;
- mapa de recorrido histórico solo consulta eventos del viaje seleccionado;
- monitorear Database Size, Storage, Egress y Edge Function invocations.

## 8. Estado de producción / decisión actual

**NO promover Logística a producción todavía.**

Antes de merge/deploy deben cerrarse como mínimo:

1. política de reintentos y saldo pendiente;
2. nuevo flujo de firma/POD;
3. optimización de latencia del portal del chofer;
4. QA E2E final;
5. auditoría final de PR #58;
6. CORS QA/producción;
7. CI verde;
8. smoke test móvil final.

Historial por viaje / mapa es altamente recomendado antes de cerrar el módulo; si se difiere debe quedar explícitamente documentado como P1 post-release.

## 9. Workflow obligatorio

- verificar rama antes de escribir;
- trabajar Logística solo en `feature/logistics-delivery-v1` mientras PR #58 siga Draft;
- no tocar `main` sin decisión explícita de release;
- PR + diff + CI;
- QA manual;
- merge aprobado;
- usuario sincroniza con GitHub Desktop;
- en Windows del usuario no depender de `git` CLI;
- antes de deploy: `main`, 0 changed files, build, deploy, registrar Cloudflare Version ID y smoke test.

## 10. Orden recomendado desde este checkpoint

1. Actualizar documentación/continuidad.
2. Optimizar latencia del portal del chofer sin polling.
3. Implementar reintentos/saldos pendientes con trazabilidad.
4. Rediseñar firma/POD en dos etapas.
5. Implementar Historial/POD por Viajes + mapa/timeline.
6. QA E2E final con datos TEST.
7. Auditoría final de seguridad, consumo y PR #58.
8. Solo entonces decidir GO/NO-GO de Logística a `main` y Cloudflare.

## 11. Documentos a leer en un chat nuevo

1. `docs/CHAT_CONTINUATION_CURRENT.md`.
2. `docs/CHAT_CONTINUATION_2026-09-07.md`.
3. `docs/LOGISTICS_DELIVERY_V1_FUNCTIONAL_DESIGN.md`.
4. `docs/LOGISTICS_DELIVERY_V1_IMPLEMENTATION_PLAN.md`.
5. `docs/LOGISTICS_DELIVERY_V1_RESOURCE_POLICY.md`.
6. `docs/SUPABASE_TRANSFER_2026-09-06.md`.
7. verificar GitHub `main`, PR #58, Supabase y Cloudflare reales.

## 12. Regla final

> Documentación de diseño o historial de chat NO equivale a producción. Verificar siempre estado real. No repetir migraciones, no limpiar datos TEST y no modificar seguridad por memoria. Logística permanece en QA hasta cerrar los gates indicados arriba.
