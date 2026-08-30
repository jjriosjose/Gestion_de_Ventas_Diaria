# V0.6.5-beta.12.2.6-rc.1 · Route Ordering UX

Estado final del RC: **QA APROBADO el 30/08/2026 (RD)**.

Este documento conserva el historial de validación del release candidate. La versión promovida se documenta en `docs/V065_BETA12_2_6_ROUTE_ORDERING_RELEASE.md`.

## Objetivo

Corregir la experiencia y la lógica de ordenamiento en Planificación antes de crear una ruta.

## Cambios validados

- `Cercanos primero`.
- `Lejanos primero`.
- `Lejanos primero` invierte una única secuencia geográfica continua; no salta repetidamente al cliente más lejano.
- Origen predeterminado `Centro de la selección`, determinista e independiente de la ubicación del administrador.
- Alternativa explícita `Mi ubicación actual`.
- Lectura GPS exclusiva para planificación: máximo 2.5 s, cache 2 min y fallback al centro de la selección.
- Feedback `Ordenando ruta…`, spinner y bloqueo de acciones concurrentes.
- Numeración `01..N` en lista y mapa.
- Seleccionados visibles fuera de clusters para preservar secuencia.
- Clientes sin GPS al final.
- `stop_order` se guarda desde el orden final de `selected`.

## Protección de alcance confirmada

- Sin migraciones Supabase.
- Sin SQL.
- Sin cambios a Tracking.
- Sin cambios a Rutas ejecutadas, Visitas o Jornadas.
- Sin cambios a `src/lib/geo.ts`.

## QA completado

1. GitHub Actions TypeScript + Vite: SUCCESS en RC.
2. Selección real de 11 clientes con GPS.
3. `Cercanos primero` validado visualmente.
4. `Lejanos primero` validado como secuencia inversa coherente.
5. Numeración visible en lista y mapa.
6. `Mi ubicación actual` probada con fallback visible al centro de selección cuando GPS no estuvo disponible.
7. Planificación TEST creada.
8. Módulo Rutas confirmó la misma secuencia `1..11` y la misma geometría.

Resultado: **RC aprobado para promoción a `0.6.5-beta.12.2.6`**.
