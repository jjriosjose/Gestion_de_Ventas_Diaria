# V0.6.5-beta.12.1 — GPS Quality Guard

Fecha: **28/08/2026 (RD)**.

## Objetivo

Corregir el caso detectado en producción donde un navegador de escritorio entregó coordenadas aproximadas con `accuracy = 50000 m` y Tracking las representó como posición operativa.

Principio aprobado:

> La precisión GPS y la distancia al cliente son señales de calidad/auditoría. No deben bloquear automáticamente una gestión comercial.

## Política de precisión

Clasificación reutilizable:

- `EXCELLENT`: <= 50 m
- `GOOD`: 51–150 m
- `APPROXIMATE`: 151–500 m
- `LOW`: 501–1000 m
- `UNRELIABLE`: > 1000 m
- `UNKNOWN`: sin precisión utilizable

`UNRELIABLE` no impide guardar. La coordenada queda registrada como evidencia técnica, pero no se utiliza como posición confiable en mapa/playback.

## Distancia al punto maestro

Para visitas se calcula automáticamente distancia entre el punto capturado y las coordenadas maestro del cliente/prospecto.

Reglas automáticas no bloqueantes:

- GPS `UNRELIABLE/UNKNOWN` -> `GPS_UNRELIABLE`.
- GPS confiable + distancia > 1000 m -> `DISTANT_REGISTRATION`.
- GPS confiable y dentro de rango -> sin excepción automática.

La distancia no se interpreta como precisión. Un vendedor puede estar realmente a varios km por registrar tarde una llegada/salida; la operación se conserva y se marca para revisión.

## Captura frontend

`src/lib/geo.ts` cambia de una única lectura a una ventana corta de mejores lecturas:

- `watchPosition`;
- `enableHighAccuracy: true`;
- `maximumAge: 0`;
- hasta 8 s;
- conserva el punto con menor `accuracy` recibido;
- finaliza antes si obtiene <= 100 m;
- si solo existe una lectura imprecisa, la devuelve en vez de bloquear la operación.

Todos los flujos que ya usan `currentPosition()` reciben esta mejora sin reescribir Rutas/Visitas/Eventualidades.

## Backend

Migración:

`20260828141000_v065_beta12_1_gps_quality_guard.sql`

Añade a `visits`:

- `start_gps_quality`
- `end_gps_quality`
- `start_location_exception_code`
- `start_location_exception_text`
- `end_location_exception_code`
- `end_location_exception_text`

Trigger `trg_visits_location_quality` calcula automáticamente calidad, distancia y excepción al insertar/actualizar coordenadas.

## Tracking

`executive_tracking_events_v1` conserva dos conceptos:

- `raw_has_gps`: hubo coordenada registrada;
- `has_gps`: coordenada apta para mapa/playback (`accuracy <= 1000 m`).

También expone:

- `gps_quality`
- `distance_to_target_m`
- `location_exception_code`
- `location_exception_text`

`executive_tracking_snapshot_v1` mantiene el estado operativo aunque el GPS sea malo, pero oculta `last_latitude/last_longitude` cuando el último punto no es confiable.

Ejemplo real validado:

- César Caba 28/08/2026
- `accuracy = 50000 m`
- estado operativo sigue visible
- `last_latitude = null`
- `last_longitude = null`
- etiqueta: `GPS no confiable (±50.0 km)`

Así Tracking deja de presentar una coordenada de red/IP como posición exacta.

## Validaciones SQL reversibles

Caso GPS no confiable:

- accuracy: 50000 m
- quality: `UNRELIABLE`
- exception: `GPS_UNRELIABLE`
- operación permitida.

Caso GPS excelente pero registro distante:

- accuracy: 12 m
- distancia simulada: 2223.9 m
- quality: `EXCELLENT`
- exception: `DISTANT_REGISTRATION`
- operación permitida.

Caso GPS excelente en punto:

- accuracy: 15 m
- distancia: 0 m
- sin excepción.

Las pruebas se ejecutaron dentro de transacciones con `ROLLBACK`; no alteraron la historia de prueba.

## Alcance deliberado

Beta.12.1 implementa clasificación automática y trazabilidad. No bloquea por distancia/precisión.

La captura explícita de un **motivo declarado por el vendedor** (por ejemplo `Olvidé registrar`, `Cliente atendido en otra ubicación`) queda preparada por las columnas `*_location_exception_text/code`, pero no se fuerza en este hotfix para no interrumpir los flujos actuales. Puede incorporarse posteriormente mediante un diálogo UX dedicado sin cambiar el modelo de datos.

## Pendiente antes de producción

- [x] migración aplicada en Supabase
- [x] precisión de 50 km clasificada como no confiable
- [x] punto no confiable eliminado del mapa exacto
- [x] distancia >1 km clasificada sin bloqueo
- [x] adquisición GPS mejorada en código
- [ ] CI TypeScript + Vite
- [ ] PR y revisión
- [ ] merge a `main`
- [ ] Fetch/Pull local
- [ ] build/deploy Cloudflare
- [ ] prueba desde móvil con GPS preciso
