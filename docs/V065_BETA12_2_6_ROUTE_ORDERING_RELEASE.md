# V0.6.5-beta.12.2.6 · Route Ordering UX

Fecha de aprobación funcional: **30/08/2026 (RD)**.

Estado: **PRODUCTIVA · QA manual + CI + despliegue Cloudflare validados**.

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
- Build final del head de release `d8775d8bc45cc1b725298bec955a218c1b883f4e`: **SUCCESS**.
- Build de `main` tras merge `97d798e440974127dc40c4a1a402569ce8cb159b`: **SUCCESS**.
- Build local previo al deploy: **SUCCESS**.
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
- PR RC histórico: **#52**, cerrado sin merge por limitación técnica al permanecer Draft.
- PR de release: **#53**, fusionado a `main`.
- Merge SHA: **`97d798e440974127dc40c4a1a402569ce8cb159b`**.

## Producción

- Cloudflare Workers URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Wrangler validado: **4.125.0**.
- `Current Version ID`: **`c04e27a4-fb7d-49f7-bc35-acd42acaba40`**.
- Despliegue: **SUCCESS**.
- Fecha: **30/08/2026 (RD)**.

Este Version ID reemplaza como checkpoint productivo al anterior `c359c16b-b8fa-4e86-98b5-79c30d22e83d` de beta.12.2.5.
