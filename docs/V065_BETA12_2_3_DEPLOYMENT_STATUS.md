# V0.6.5-beta.12.2.3 — Deployment Status

## Estado
- Producción: desplegada correctamente
- Plataforma: Cloudflare Workers
- URL: https://gestion-de-ventas-diaria.jjriosjose.workers.dev
- Current Version ID: `ef3a9c6e-d358-4833-ac80-abb37751c207`
- Fecha de confirmación: 2026-08-29

## Release
- Versión: `0.6.5-beta.12.2.3`
- PR principal: #48 — Route Sequence Clarity
- Fix previo al deploy: #49 — Align route arrow bearing
- Merge principal: `3017e1a8a8c471530f3d49d13d59448249a03304`
- Fix merge: `bbdd3de4b9bdf2731081c0f42106accccdae00a9`

## Alcance funcional
- Número de parada siempre visible.
- Estado de parada como segunda capa visual.
- Flechas direccionales entre paradas.
- Mayor contraste del recorrido planificado.
- Separación visual de coordenadas coincidentes sin alterar el dato real.
- KPI `Sin señal reciente`.
- Calidad de señal y coherencia geográfica agrupadas por concepto.
- Timeline con jerarquía por tipo de evento.
- Rotación de caché PWA.

## Backend
- Sin cambios de Supabase.
- Sin cambios en reglas GPS, permisos, Rutas, Visitas o Jornadas.
- No requiere SQL.

## QA post-deploy pendiente
- Verificar secuencia visual `1 → 2 → 3...` en modo Recorridos.
- Confirmar número + estado secundario por parada.
- Confirmar dirección correcta de flechas.
- Validar solapamientos y multi-vendedor.
- Revisar timeline y agrupación KPI.
