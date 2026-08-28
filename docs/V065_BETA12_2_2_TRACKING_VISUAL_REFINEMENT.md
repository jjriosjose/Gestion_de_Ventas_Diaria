# V0.6.5-beta.12.2.2 · Tracking Visual Refinement

## Objetivo
Refinar la lectura visual de Tracking después del QA productivo de beta.12.2.1, sin alterar la lógica operativa de Rutas, Visitas, Jornadas, Supabase ni la captura GPS.

## Cambios principales
- La leyenda inferior del mapa queda reducida al semáforo operativo: En visita, En traslado y Alerta.
- Se ocultan de la leyenda visible los textos explicativos de líneas, registros distantes y codificación por vendedor/parada.
- Se mantiene la semántica de recorrido y auditoría ya implementada; no se elimina información ni evidencia.
- Mayor legibilidad de la leyenda de rutas y de los marcadores de paradas.
- Mejor jerarquía tipográfica en Fuerza de calle, métricas y paneles de calidad geográfica.
- El panel derecho deja de estirarse innecesariamente cuando hay pocos vendedores.
- Timeline de reproducción con tarjetas más amplias, tipografía más legible y anomalías visualmente secundarias.
- Refinamiento responsive para tablet y móvil.

## Seguridad funcional
- Sin cambios en permisos.
- Sin cambios en tablas, vistas o funciones Supabase.
- Sin migraciones.
- Sin cambios de reglas de distancia, GPS o validación geográfica.
- Sin geofencing bloqueante.
- Los registros distantes y GPS no confiables continúan preservados para auditoría.

## Versión
`0.6.5-beta.12.2.2`
