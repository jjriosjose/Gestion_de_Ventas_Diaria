# V0.6.5-beta.12.2 — Deployment Status

Fecha: 28/08/2026 (RD).

## Producción

- Estado: desplegado correctamente en Cloudflare Workers.
- URL: https://gestion-de-ventas-diaria.jjriosjose.workers.dev
- Current Version ID: `4716f902-0100-4486-9133-77839bfa72fa`
- Versión de aplicación: `0.6.5-beta.12.2`
- Merge commit a `main`: `c373cb155b8f410c759d92bc67479e1836e0ad43`
- PR: #45 — V0.6.5-beta.12.2 · Tracking Intelligence

## Deploy reportado

Wrangler detectó 7 assets nuevos o modificados y los subió correctamente. El Worker y sus triggers fueron desplegados sin errores.

## Alcance desplegado

- modos En vivo / Recorridos / Calidad GPS;
- visualización multi-vendedor con color estable por vendedor;
- paradas con identidad de vendedor y estado independiente;
- rutas planificadas y uniones estimadas de eventos GPS diferenciadas;
- filtros de recorrido, tipo de evento, calidad GPS y validación frente al cliente;
- panel Registro vs Cliente;
- comparación gráfica R (registro) vs C (cliente);
- timeline rediseñado para eliminar solapamientos visuales;
- sin cambios en ejecución de Rutas/Visitas/Jornadas;
- sin GPS continuo;
- sin geofencing bloqueante;
- sin nueva migración Supabase.

## QA pendiente

- [ ] validar visualmente modo Recorridos con datos reales;
- [ ] validar selección y aislamiento de una ruta;
- [ ] validar modo Calidad GPS con el registro real de César;
- [ ] revisar panel Registro vs Cliente y distancia;
- [ ] revisar timeline rediseñado en desktop;
- [ ] validar comportamiento multi-vendedor cuando existan varias jornadas visibles.
