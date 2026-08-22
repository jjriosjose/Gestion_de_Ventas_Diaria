# Configuración de geografía administrativa

La v0.3 contiene la estructura y las funciones PostGIS, pero para resolver automáticamente Región/Provincia/Municipio hace falta cargar una fuente oficial de límites territoriales de República Dominicana.

## Datos esperados

Se recomienda utilizar una fuente oficial de división territorial y convertirla a GeoJSON/FeatureCollection o cargarla mediante un proceso controlado. Niveles soportados:

- REGION
- PROVINCIA
- MUNICIPIO
- LOCALIDAD (opcional)

Tabla destino: `public.administrative_areas`.

RPC disponible para carga controlada por administrador:

`upsert_administrative_area_geojson(level, code, name, geojson, parent_id, source, source_version)`

## Regla de seguridad

Los usuarios autenticados pueden leer las áreas. Solo Administrador/Supervisor puede crear o modificar polígonos.

## Estado antes de cargar polígonos

Las visitas siguen guardando GPS y precisión. Los eventos geográficos se registran como `PENDIENTE` hasta disponer de los límites administrativos.
