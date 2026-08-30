# V0.6.5-beta.12.2.6-rc.1 · Route ordering UX

Estado: **TEST / release candidate**. No desplegado a producción.

## Objetivo

Corregir la experiencia y la lógica de ordenamiento en Planificación antes de crear una ruta.

## Cambios

- Sustituye el botón ambiguo `Ordenar` por dos acciones explícitas:
  - `Cercanos primero`.
  - `Lejanos primero`.
- `Lejanos primero` invierte una única secuencia geográfica continua; no salta repetidamente al cliente más lejano.
- El origen predeterminado es `Centro de la selección`, determinista e independiente de la ubicación del administrador.
- `Mi ubicación actual` queda como alternativa explícita.
- La ubicación de planificación usa una lectura ligera de máximo 2.5 s y cache de 2 minutos. No modifica `currentPosition()` ni la captura GPS operativa.
- Mientras ordena muestra estado visible, spinner y bloquea acciones que podrían alterar la selección.
- La lista muestra número de parada `01..N`.
- El mapa mantiene seleccionados fuera de los clusters y muestra el número de cada parada.
- Clientes sin GPS permanecen al final y el resultado lo informa.
- `stop_order` continúa guardándose desde el orden final de `selected`; no cambia el esquema ni el backend.

## Alcance protegido

- Sin migraciones Supabase.
- Sin SQL.
- Sin cambios a Tracking.
- Sin cambios a Rutas ejecutadas, Visitas o Jornadas.
- Sin cambios a `src/lib/geo.ts`.
- Sin deploy a Cloudflare mientras permanezca RC.

## QA requerido antes de producción

1. Build TypeScript + Vite exitoso.
2. Seleccionar 10-20 clientes con GPS y comprobar `Cercanos primero`.
3. Confirmar que `Lejanos primero` es exactamente la misma secuencia en sentido inverso para clientes con GPS.
4. Confirmar números de parada en lista y mapa.
5. Confirmar feedback inmediato durante ordenación.
6. Probar `Mi ubicación actual`; validar espera máxima corta y fallback automático si GPS no está disponible.
7. Crear una planificación de prueba y comprobar que `route_stops.stop_order` coincide con el orden visual.
8. Verificar que no se altera Tracking, inicio/cierre de jornada ni registro de visitas.

## Promoción prevista

Si QA es aprobado, promover a `0.6.5-beta.12.2.6`, actualizar documentación de continuidad y desplegar posteriormente mediante el flujo normal de Cloudflare.
