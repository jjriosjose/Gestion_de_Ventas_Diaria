# V0.6.5-beta.12.2.2 · Production deployment status

## Estado

- Producción: **DESPLEGADA**
- Versión: **0.6.5-beta.12.2.2**
- Cloudflare Worker: `gestion-de-ventas-diaria`
- URL: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`
- Current Version ID: `07267e16-3f12-4c8d-918e-d6a5167fef07`
- Fecha de despliegue: 2026-08-28

## Resultado Wrangler

- Assets leídos: 18
- Assets nuevos/modificados: 7
- Assets ya existentes: 8
- Upload: exitoso
- Worker deploy: exitoso
- Triggers: desplegados correctamente

## Alcance de beta.12.2.2

Refinamiento visual general de Tracking:

- leyenda inferior del mapa reducida al semáforo En visita / En traslado / Alerta;
- eliminación de textos explicativos largos dentro del mapa;
- mejor jerarquía de rutas, paradas, fuerza de calle y timeline;
- mejor aprovechamiento del panel derecho;
- mejoras responsive;
- sin cambios en Rutas, Visitas, Jornadas, Supabase, permisos, reglas GPS o validaciones geográficas.

## Validación pendiente

QA visual en producción de:

1. Recorridos.
2. Leyenda inferior compacta.
3. Timeline.
4. Panel Fuerza de calle.
5. Calidad GPS y comparación R ↔ C.
