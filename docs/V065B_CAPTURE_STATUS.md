# V0.6.5-B — Captación unificada y trazabilidad territorial

Fecha de corte: 2026-08-26.

Este documento registra el bloque de corrección de Captación ejecutado después de V0.6.5-A. `package.json` continúa en 0.6.4 porque V0.6.5 todavía no se declara como release completa.

## Estado de implementación

- PR #26 integrado: contexto y trazabilidad de Captación.
- Commit de aplicación: `1ec870e084565baba984f2129bc09b91a9bc2478`.
- PR #27 integrado: centralización del punto de entrada de Captación.
- Commit de aplicación final del bloque: `52dfc88c83c1e921e75359eb60d7937368df9047`.
- PR #28 integrado: V0.6.5-B.1, estabilización del viewport territorial y simplificación del acceso a Captación desde Planificación.
- Commit `main` V0.6.5-B.1: `e1b2a0f0403a2184eda84ddb47bbff1a75e1ee73`.
- Build TypeScript + Vite de rama: SUCCESS.
- Build TypeScript + Vite de `main`: SUCCESS.
- Build local previo al deploy V0.6.5-B.1: SUCCESS (`✓ built in 12.49s`).
- Supabase actualizado.
- Cloudflare desplegado correctamente.
- Cloudflare Version ID actual: `024c4b90-d0c5-4513-9304-cee54d7c82da`.

## Problema que se corrigió

Existían dos arquitecturas paralelas para CAPTACION:

1. `Planificación -> Captación por zona`, usando `territories` y una fecha única.
2. Módulo `Captación`, usando división territorial oficial, período Desde/Hasta, objetivo e inclusión opcional de sábado.

El segundo flujo era el más reciente y completo. La coexistencia podía crear tareas que el módulo operativo de Captación no interpretaba de manera uniforme.

Adicionalmente, un Vendedor podía registrar un prospecto sin tarea activa. El registro conservaba GPS, pero podía quedar con `capture_assignment_id = null` y sin Región/Provincia/Municipio, apareciendo visualmente como `Sin zona`.

## Regla funcional consolidada

### Fuente única de asignación

Las tareas de prospección se asignan y ejecutan desde el módulo **Captación**.

`Planificación` queda dedicada a rutas de **VISITAS**. Su acceso `Captación` redirige a `/captacion` y ya no crea tareas CAPTACION con la lógica antigua.

### Tarea activa

Si el Vendedor tiene una o más tareas de Captación activas:

- el prospecto debe asociarse a una tarea activa;
- no existe opción silenciosa `Sin asociar`;
- si hay varias tareas activas, debe elegirse una;
- la captación vinculada suma al objetivo de esa tarea;
- el GPS se compara contra la geometría asignada;
- se registra si quedó dentro o fuera de la zona asignada;
- si está fuera, la interfaz advierte antes de guardar.

### Captación libre

Si el Vendedor no tiene ninguna tarea activa ese día:

- puede registrar una **Captación libre**;
- debe confirmarlo explícitamente;
- no suma a ningún objetivo asignado;
- la ubicación territorial se resuelve automáticamente desde el GPS;
- nunca debe mostrarse `Sin zona` si el GPS permite resolver una división oficial.

## Contexto territorial por GPS

Migración aplicada y versionada:

- `supabase/migrations/20260826132000_v065b_capture_context.sql`

Campos añadidos a `public.prospects`:

- `capture_mode`: `TAREA` / `LIBRE`.
- `gps_area_id`.
- `gps_area_name`.
- `gps_area_level`.
- `district_municipality`.
- `within_assigned_area`.

Trigger:

- `private.enrich_prospect_capture_context()`.
- `zz_prospects_capture_context`.

La lógica resuelve por GPS:

- Región.
- Provincia.
- Municipio.
- Distrito Municipal.

Si existe tarea CAPTACION, compara el punto GPS contra:

1. `official_area_id` cuando la tarea usa división oficial.
2. `territory_id` como fallback para compatibilidad con tareas históricas de zonas personalizadas.

No modifica clientes, cartera, Vendedor/Gestor ni coordenadas maestras.

## Preview antes de guardar

RPC autenticado:

- `public.preview_capture_context(latitude, longitude, capture_assignment_id)`.

La interfaz lo usa para mostrar antes del guardado:

- ubicación real determinada por GPS;
- modo TAREA/LIBRE;
- zona asignada cuando exista;
- dentro/fuera de zona.

## Caso de regresión validado

Prospecto de prueba `PRO-49641201`, captado por Rendy Mejías el 2026-08-26 antes de que iniciara su tarea de El Seibo del 2026-08-28:

- `capture_assignment_id = null`.
- `capture_mode = LIBRE`.
- GPS real resuelto como Región Ozama.
- Provincia: Distrito Nacional.
- Municipio: Santo Domingo de Guzmán.
- Distrito Municipal: Distrito Nacional.

No debe asociarse retroactivamente a El Seibo porque físicamente fue captado en otra ubicación y la tarea todavía no estaba activa.

## UI de Captación

El formulario `Nuevo prospecto` ahora:

- exige tarea activa cuando existen tareas activas;
- exige confirmación explícita para Captación libre si no hay tareas activas;
- captura/valida GPS;
- muestra ubicación territorial detectada;
- advierte si la captura está fuera de la zona asignada;
- muestra el modo y contexto territorial en el historial.

Excel/PDF de Captación incluyen contexto adicional como modo, Región/Provincia/Municipio/Distrito y dentro/fuera de zona cuando aplique.

## Planificación

`src/pages/Planning.tsx` queda dedicada a rutas de VISITAS y conserva:

- Vendedor y fecha;
- cartera / fuera de cartera según permiso;
- maestro comercial vs división territorial oficial;
- Región/Provincia/Municipio;
- filtros oficiales;
- Gestor y empresa;
- GPS y calidad territorial;
- disponibilidad;
- zonas guardadas como filtro;
- selección por lista/mapa/polígono/radio;
- orden por cercanía;
- creación de `route_plans` tipo VISITAS + `route_stops`.

No crea nuevas tareas CAPTACION. Se conserva un único acceso desde el selector `Ruta de visitas | Captación`, eliminando el botón superior duplicado `Ir a Captación`.

## V0.6.5-B.1 — pulido de mapa y navegación

Tras la validación funcional del 2026-08-26 se cerraron dos detalles adicionales:

- El mapa territorial inicia encuadrado en República Dominicana.
- Se evita que el viewport inicial se aleje hasta Centroamérica/Sudamérica.
- Al limpiar una división oficial, el mapa vuelve al encuadre nacional.
- El zoom automático por Región/Provincia/Municipio/Distrito oficial se conserva.
- No se alteraron coordenadas, clientes ni lógica territorial; el cambio es exclusivamente de viewport.
- Planificación deja un solo acceso a Captación para reducir ambigüedad de UX.

## Producción / Cloudflare

Deploy V0.6.5-B inicial confirmado el 2026-08-26:

- Cloudflare Version ID: `fc685ac7-0ac2-466d-9dab-bce717af2672`.

Deploy V0.6.5-B.1 confirmado el 2026-08-26:

- Worker: `gestion-de-ventas-diaria`.
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Version ID: `024c4b90-d0c5-4513-9304-cee54d7c82da`.
- Assets nuevos/modificados subidos: 5.
- Deploy Wrangler: SUCCESS.

## Validación funcional

Confirmado:

1. Captación libre se muestra explícitamente cuando no existe tarea activa.
2. El prospecto de prueba ya muestra territorio resuelto por GPS y no `Sin zona`.
3. Planificación ya no crea CAPTACION por el flujo antiguo.
4. Planificación conserva rutas de VISITAS.
5. Mapa territorial optimizado y límites oficiales cargan con mejor rendimiento.
6. V0.6.5-B.1 corrige el encuadre inicial del mapa.

Pendiente de prueba end-to-end controlada:

1. Tarea activa asociada obligatoriamente.
2. Incremento del objetivo solo para captaciones vinculadas.
3. Advertencia dentro/fuera de zona según GPS real.
