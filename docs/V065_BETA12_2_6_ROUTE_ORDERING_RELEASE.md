# V0.6.5-beta.12.2.6 · Route Ordering UX

Fecha de aprobación funcional: **30/08/2026 (RD)**.

Estado: **APROBADA para producción tras QA manual + CI verde**.

## Objetivo

Corregir la experiencia y la lógica de ordenamiento de rutas en Planificación antes de crear una jornada de visitas.

## Cambios incluidos

- Sustituye el botón ambiguo `Ordenar` por dos acciones explícitas:
  - `Cercanos primero`.
  - `Lejanos primero`.
- `Lejanos primero` usa exactamente la misma secuencia geográfica continua en sentido inverso; no salta repetidamente al cliente más lejano.
- Origen predeterminado determinista: `Centro de la selección`.
- Alternativa explícita: `Mi ubicación actual`.
- La lectura GPS usada solo para planificación espera máximo 2.5 s, reutiliza la posición durante 2 minutos y hace fallback al centro de la selección si no está disponible.
- No modifica `src/lib/geo.ts` ni la lógica GPS operativa de Rutas, Visitas, Jornadas o Tracking.
- Feedback visible `Ordenando ruta…` y bloqueo de acciones concurrentes.
- Numeración `01..N` en la lista de preparación.
- Numeración equivalente en el mapa.
- Los clientes seleccionados permanecen visibles fuera de clusters para conservar la secuencia.
- Clientes sin GPS quedan al final y se informa el resultado.
- `route_stops.stop_order` continúa guardándose desde el orden final de `selected`.

## QA ejecutado

### Automatizado

- GitHub Actions `Build validation`: **SUCCESS** (`tsc -b && vite build`).
- Validación controlada: la secuencia `Lejanos primero` es el inverso exacto de la secuencia geocodificada `Cercanos primero`.
- Clientes sin GPS permanecen al final en ambos sentidos.

### Manual con usuario

Caso real de prueba con cartera de **Rendy Mejías**:

1. selección de 11 clientes con GPS;
2. ordenamiento visible y numerado en Planificación;
3. validación del fallback cuando `Mi ubicación actual` no estuvo disponible;
4. validación visual de continuidad geográfica;
5. validación de `Lejanos primero`;
6. creación de planificación TEST;
7. verificación en módulo Rutas de la misma secuencia `1..11`;
8. mapa y lista de Rutas conservaron el mismo `stop_order`.

Resultado: **QA funcional aprobado**.

## Alcance protegido

- Sin migraciones Supabase.
- Sin SQL.
- Sin cambios de esquema.
- Sin cambios a Tracking.
- Sin cambios a lógica de ejecución de Jornadas.
- Sin cambios a registro/cierre de Visitas.
- Sin borrado de datos TEST.

## Promoción

- RC validada: `0.6.5-beta.12.2.6-rc.1`.
- Release promovida: `0.6.5-beta.12.2.6`.
- PR de promoción: #52.

## Producción

El merge a `main` y el despliegue Cloudflare deben confirmarse por separado. No registrar un Version ID de Cloudflare hasta obtenerlo del despliegue real de Wrangler/Cloudflare.
