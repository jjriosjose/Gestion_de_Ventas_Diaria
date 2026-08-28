# V0.6.5-beta.12.2.1 — Tracking Visual Hotfix

Fecha: **28/08/2026 (RD)**.

## Motivo

QA visual productivo de beta.12.2 detectó tres problemas de presentación:

1. Los checkboxes de Tracking heredaban estilos globales y se renderizaban como bloques azules sobredimensionados.
2. En modo Recorridos, un evento `DISTANT_REGISTRATION` podía ampliar el encuadre hasta incluir cientos de kilómetros y comprimir la lectura de las paradas planificadas.
3. La leyenda del recorrido no explicaba suficientemente que los registros distantes pertenecen a auditoría geográfica y no deben deformar la representación operativa de la ruta.

## Cambios

- Nuevo override aislado `tracking-hotfix.css` para controles de Tracking.
- Checkboxes compactos de 18 px, accesibles y consistentes en filtros, Auto 30 s, Ver paradas y Solo ruta seleccionada.
- Controles del encabezado del mapa convertidos en opciones compactas con mejor jerarquía visual.
- En modo Recorridos, eventos clasificados `DISTANT` o `UNRELIABLE` no forman la línea estimada del recorrido ni determinan el zoom del corredor operativo.
- Las paradas planificadas son la referencia principal del encuadre en modo Recorridos.
- Si una jornada no tiene paradas con coordenadas, el encuadre usa eventos GPS coherentes disponibles.
- Los eventos distantes permanecen íntegros en backend, tarjetas, filtros y modo Calidad GPS.
- El modo Calidad GPS conserva la comparación R (registro) ↔ C (cliente), incluso para distancias muy grandes.
- Leyenda actualizada para explicar que las anomalías geográficas se auditan en Calidad GPS y no se presentan como recorrido real.

## Principio de datos

Este hotfix no elimina ni corrige coordenadas. Solo separa la representación operativa del recorrido de las anomalías de auditoría.

No modifica Rutas, Visitas, Jornadas, Supabase ni la política no bloqueante.
