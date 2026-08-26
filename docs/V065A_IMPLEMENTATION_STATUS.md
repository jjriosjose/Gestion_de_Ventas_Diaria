# V0.6.5-A — Estado de implementación

Fecha de corte: 2026-08-26.

Este documento registra el primer bloque implementado de V0.6.5. La versión visible de la aplicación continúa identificándose como **0.6.4** en `package.json`, pero el bloque técnico **V0.6.5-A** ya fue integrado a `main`, aplicado en Supabase y desplegado en Cloudflare.

## Estado de GitHub

- Rama estable: `main`.
- Optimización de Mapa / División territorial integrada mediante PR #24.
- Commit de merge/squash del bloque geográfico: `7787607bbbaea4bebef27505a686193b15cbf4b9`.
- Corrección de reinicio de rutas cerradas integrada mediante PR #25.
- Commit de aplicación después del fix: `bfe89f7493867e114cb381f68265fb1b91f5c250`.
- Documentación posterior puede hacer avanzar `main` sin cambiar el código desplegado.
- `Build validation` de TypeScript + Vite: SUCCESS.
- Build local previo al deploy: SUCCESS.
- `package.json` continúa en `0.6.4`; esto NO representa todavía una liberación completa V0.6.5.

## V0.6.5-A — Mapa y División territorial

Implementado:

- caché temporal en memoria de cartera paginada;
- deduplicación de solicitudes simultáneas de clientes;
- caché temporal de `client_geo_assessments`;
- caché del directorio oficial de áreas administrativas;
- caché por `area_id` de geometrías oficiales ya consultadas;
- índice en memoria para resolver jerarquías oficiales sin búsquedas lineales repetidas;
- memoización de opciones Región -> Provincia -> Municipio -> Distrito Municipal;
- reducción de `fitBounds` innecesarios;
- redibujado de clientes diferido mediante `requestAnimationFrame`;
- feedback `Actualizando mapa…` y `Cargando límites…`;
- protección contra respuestas asíncronas obsoletas al cambiar rápido de territorio;
- ajuste automático al nuevo límite oficial solamente cuando cambia el área seleccionada.

Se mantiene sin cambios la separación conceptual entre:

1. Maestro comercial del cliente.
2. División territorial oficial.
3. Coordenada almacenada / diagnóstico territorial / GPS de visita.

Ninguna discrepancia geográfica modifica automáticamente el maestro ni las coordenadas del cliente.

## Cartografía simplificada para renderizado

Migración Supabase aplicada:

- ledger: `20260826044324`
- nombre: `v065a_simplified_territory_map`
- archivo GitHub: `supabase/migrations/20260826044324_v065a_simplified_territory_map.sql`

Se creó `public.administrative_areas_map` como vista de solo lectura para renderizado interactivo.

Reglas:

- la fuente oficial continúa siendo `public.administrative_areas`;
- la vista usa geometrías simplificadas únicamente para dibujar límites con mayor velocidad;
- `security_invoker=true`;
- `anon` sin SELECT;
- `authenticated` con SELECT;
- fallback del frontend a `administrative_areas` si la vista simplificada no está disponible.

Validación observada:

- 593 áreas;
- 0 geometrías nulas;
- SRID 4326;
- 10 regiones, 32 provincias, 158 municipios y 393 distritos municipales se preservan;
- tamaño GeoJSON promedio de la vista simplificada cercano a 3 KB, frente a geometrías originales que podían superar 1 MB en algunos niveles.

## Corrección crítica — ruta FINALIZADA no puede reiniciarse

Hallazgo detectado visualmente después de cerrar una ruta:

- el botón `Iniciar ruta / salida` seguía renderizado en gris/deshabilitado;
- la causa era que `activeSession` pasaba a `null` al finalizar y el JSX regresaba a la rama del botón de inicio;
- el `disabled` impedía el clic normal, pero la regla no estaba correctamente expresada por el renderizado;
- adicionalmente, el backend no rechazaba explícitamente una segunda `route_session` del mismo `route_plan_id` si se intentaba fuera de la interfaz.

Corrección frontend:

- las acciones de ruta se muestran solo cuando existe sesión activa o el plan está `PLANIFICADA`;
- una ruta `FINALIZADA` deja de mostrar `Iniciar ruta / salida`;
- `start()` valida que el plan esté `PLANIFICADA`;
- el UPDATE a `route_plans` exige también `status='PLANIFICADA'`.

Corrección backend:

Migración Supabase aplicada:

- ledger: `20260826045200`
- nombre: `v065a_closed_route_restart_guard`
- archivo GitHub: `supabase/migrations/20260826045200_v065a_closed_route_restart_guard.sql`

Se reforzó `private.enforce_route_session_operational_date()` para:

- rechazar rutas cuyo estado no sea `PLANIFICADA`;
- rechazar una ruta que ya tenga una `route_session` registrada;
- conservar las validaciones de fecha operativa de Santo Domingo y fecha programada.

Además se añadió un índice único parcial sobre `route_sessions(route_plan_id)` cuando `route_plan_id` no es nulo. De esta forma la regla queda protegida también en base de datos y no depende únicamente de la interfaz.

Al momento de aplicar la restricción no existían rutas con más de una sesión registrada.

## Producción / Cloudflare

Deploy manual confirmado el 2026-08-26 desde Windows con Wrangler 4.125.0.

- Worker: `gestion-de-ventas-diaria`.
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Current Version ID: `6d684564-2421-4c22-89de-15f501e049d1`.
- Resultado de upload/deploy: SUCCESS.
- Build ejecutado como parte de `npm run deploy`: SUCCESS.
- El deploy contiene el código de aplicación de V0.6.5-A ya integrado en `main`.
- Supabase ya contiene ambas migraciones de V0.6.5-A.
- La etiqueta visible de versión continúa en `0.6.4` hasta liberar V0.6.5 completa; no usar esa etiqueta como indicador de si V0.6.5-A está o no desplegada.

## Validación post-deploy pendiente

Antes de iniciar el siguiente bloque funcional validar manualmente en producción:

1. carga normal de la aplicación;
2. Mapa -> División territorial oficial;
3. respuesta Región -> Provincia -> Municipio -> Distrito Municipal;
4. carga y cambio de límites oficiales sin bloqueos evidentes;
5. ruta `FINALIZADA` sin botón `Iniciar ruta / salida`;
6. ausencia de errores funcionales en navegación básica.

## Próximo bloque funcional

Después de validar esta actualización en la aplicación desplegada, continuar con el orden acordado de V0.6.5. El siguiente bloque recomendado es la fundación de **Pedidos/Ventas**, seguido por formulario único de Visita y Visitas adicionales.

Este archivo complementa `PROJECT_HANDOFF.md`, `docs/REQUIREMENTS_STATUS.md` y `docs/V065_FUNCTIONAL_DESIGN.md`; no sustituye ninguno de ellos.
