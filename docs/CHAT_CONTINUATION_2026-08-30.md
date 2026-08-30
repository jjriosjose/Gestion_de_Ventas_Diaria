# Continuidad de chat — Gestión de Ventas Diaria

Fecha del checkpoint: **30/08/2026 (República Dominicana)**

> Este documento es el checkpoint operativo prioritario para continuar el proyecto. Si algo aquí difiere del estado real de GitHub, Supabase o Cloudflare, **los servicios reales son la fuente de verdad**.

## 1. Fuentes de verdad

- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`
- Rama estable: `main`
- Frontend: React + TypeScript + Vite
- Backend: Supabase
- Producción: Cloudflare Workers / Wrangler
- Datos actuales: **TEST** hasta declaración explícita de Go-Live.
- No asumir que una función existe solo por historial de chat: verificar código y servicios.

## 2. Estado GitHub actual

- Versión en `main`: **0.6.5-beta.12.2.6**
- Release: **Route Ordering UX**
- PR RC histórico: #52, cerrado sin merge únicamente porque permaneció Draft.
- PR release: **#53, MERGED**.
- Merge SHA: **`97d798e440974127dc40c4a1a402569ce8cb159b`**.
- GitHub Actions sobre el head final del PR: **SUCCESS**.
- GitHub Actions sobre `main` después del merge, run #594: **SUCCESS**.
- `package.json` en `main` confirma `0.6.5-beta.12.2.6`.

## 3. Cloudflare / producción

URL productiva:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último Version ID confirmado antes de beta.12.2.6:

`c359c16b-b8fa-4e86-98b5-79c30d22e83d`

Ese Version ID corresponde al checkpoint productivo anterior **0.6.5-beta.12.2.5 · Smart Map Framing**.

**Importante:** beta.12.2.6 ya está fusionada y validada en GitHub `main`, pero no debe declararse desplegada en Cloudflare hasta ejecutar el flujo real de Wrangler y registrar un nuevo `Current Version ID`.

El flujo productivo confirmado sigue siendo manual desde el repositorio local sincronizado:

1. GitHub Desktop -> `main` -> Fetch/Pull.
2. `npm run build`.
3. `npm run deploy`.
4. registrar URL y `Current Version ID` de Wrangler.
5. smoke test de producción.

## 4. V0.6.5-beta.12.2.6 — Route Ordering UX

Problema corregido: el botón de ordenamiento de Planificación no comunicaba actividad, podía esperar hasta 8 s por una lectura GPS nueva y podía usar silenciosamente la ubicación física del administrador como origen.

Implementado y validado:

- `Cercanos primero`.
- `Lejanos primero`.
- El sentido inverso reutiliza la misma secuencia geográfica y la recorre al revés.
- Origen predeterminado: **Centro de la selección**, determinista y reproducible.
- Opción explícita: **Mi ubicación actual**.
- GPS exclusivo de planificación: espera máxima 2.5 s, cache 2 min y fallback al centro de selección.
- No se modificó `src/lib/geo.ts`.
- Feedback visible `Ordenando ruta…`.
- Botones bloqueados durante procesamiento.
- Numeración `01..N` en lista de preparación.
- Numeración visible en mapa.
- Seleccionados permanecen fuera de clusters para conservar la secuencia.
- Clientes sin GPS quedan al final.
- `route_stops.stop_order` conserva el orden visual aprobado.

Documentos:

- `docs/V065_BETA12_2_6_ROUTE_ORDERING_RC1.md`
- `docs/V065_BETA12_2_6_ROUTE_ORDERING_RELEASE.md`

## 5. QA manual de beta.12.2.6

Prueba realizada con cartera de **Rendy Mejías**:

- 11 clientes seleccionados, todos con GPS;
- ordenamiento visual correcto;
- continuidad geográfica validada;
- fallback visible de `Mi ubicación actual` al centro de selección cuando GPS no estuvo disponible;
- `Lejanos primero` validado;
- planificación TEST creada;
- módulo Rutas mostró exactamente la misma secuencia `1..11`;
- mapa y lista de Rutas conservaron el mismo `stop_order`.

Resultado: **QA funcional aprobado**.

## 6. Tracking — estado protegido

Tracking continúa como torre de control operativo, no como GPS continuo de fondo.

Capacidades vigentes:

- ruta `/tracking`;
- permiso `tracking.view`;
- filtros por fecha, vendedor, estado, frescura, territorio, recorrido, tipo de registro, calidad GPS y registro vs cliente;
- modos `En vivo`, `Recorridos`, `Calidad GPS`;
- layouts `Estándar`, `Mapa grande`, `Control Tower`;
- panel `Fuerza de calle`;
- playback por `route_plan_id`;
- timeline de eventos GPS;
- mapa Leaflet + OSM;
- colores estables por vendedor;
- número de parada visible;
- líneas/flechas de secuencia planificada;
- comparación `R = registro` vs `C = cliente`;
- anomalías geográficas se auditan, no bloquean automáticamente;
- Smart Map Framing de beta.12.2.5 permanece vigente.

Beta.12.2.6 **no modificó Tracking**.

No hay breadcrumbs/GPS continuo de fondo. Los puntos GPS reales provienen de eventos como inicio/fin de ruta, inicio/fin de visita y eventualidades; las uniones son estimadas.

## 7. Supabase

No hubo cambios Supabase para beta.12.2.6:

- sin SQL;
- sin migraciones;
- sin cambios de esquema;
- sin cambios de RLS.

Vistas de Tracking existentes:

- `executive_tracking_events_v1`
- `executive_tracking_stops_v1`
- `executive_tracking_snapshot_v1`

Función de permiso:

- `private.current_user_can_view_tracking()`

No hacer replay manual ciego de migraciones.

## 8. Datos TEST / Go-Live

Todos los datos actuales de la app continúan considerándose **TEST**.

- no borrar historial sin aprobación explícita;
- no limpiar producción hasta que el usuario declare Go-Live;
- datasets de QA deben ser identificables y reversibles.

La planificación utilizada para validar beta.12.2.6 es una planificación TEST.

## 9. Cartera y rutas mensuales — trabajo realizado

Archivo maestro identificado:

- `Base Cartera(2).xlsx`
- hoja principal `cartera`
- aproximadamente 1,997 registros y 47 columnas
- hojas adicionales `usuarios` y `Hoja2`.

Se generó el Excel:

`Rutas_Mensuales_Septiembre_2026.xlsx`

Criterios usados:

- septiembre 2026;
- lunes a viernes;
- exclusión de cadenas;
- conservación de Vendedor/Gestor real;
- prioridad por recencia de compra, montos, pagos, balances/relevancia;
- algunos clientes con 2 visitas al mes;
- coherencia geográfica;
- mínimo 8 clientes diarios cuando la cartera y geografía lo permiten;
- rutas reducidas cuando forzar 8 clientes implicaría mezclar zonas absurdamente distantes.

Este Excel queda como base para futuras pruebas de carga múltiple de vendedores y validación de Tracking/Control Tower.

## 10. Próximo QA recomendado

Después de desplegar beta.12.2.6, el siguiente QA de mayor valor es **multi-vendedor con 3–4 vendedores**, utilizando rutas coherentes para validar:

- colores por vendedor;
- Smart Map Framing;
- rutas próximas/parcialmente solapadas;
- Fuerza de calle;
- selección individual y atenuación;
- flechas/secuencia;
- puntos cercanos y solapados;
- Control Tower;
- desempeño con varias rutas simultáneas.

No insertar datos masivos en Supabase sin definir antes escenario, reversibilidad y método de carga.

## 11. Workflow de desarrollo obligatorio

- feature branch;
- PR a `main`;
- revisar diff;
- CI verde;
- QA manual cuando corresponda;
- merge solo aprobado;
- GitHub Desktop Fetch/Pull;
- `npm run build`;
- `npm run deploy`;
- no afirmar producción hasta obtener `Current Version ID` real;
- registrar checkpoint de producción.

## 12. PROJECT_HANDOFF.md

`PROJECT_HANDOFF.md` sigue conteniendo historial y decisiones arquitectónicas muy importantes, pero su cabecera quedó desactualizada en beta.10. Para el estado reciente debe leerse primero **este checkpoint del 30/08/2026** y luego `PROJECT_HANDOFF.md` como contexto histórico.

GitHub `main`, Supabase y Cloudflare siempre prevalecen sobre documentación o conversación si existe discrepancia.
