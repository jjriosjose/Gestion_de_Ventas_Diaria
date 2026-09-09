# P1 — Historial por Viaje / Recorrido Operativo

Fecha de cierre funcional: **09/09/2026 (RD)**

## Objetivo

Evolucionar `Historial / POD` hacia una herramienta gerencial para analizar viajes completos, tiempos, secuencia de paradas, GPS, incidencias, resultados de entrega y una estimación liviana de distancia operativa.

## Principio de arquitectura

La solución debe mantenerse compatible con una operación de bajo consumo sobre Supabase Free.

Por decisión de producto **NO se implementa tracking periódico, breadcrumbs, polling, Realtime ni GPS continuo**.

La distancia se calcula en el navegador usando únicamente información que el sistema ya posee. No genera nuevas filas ni escrituras adicionales en Supabase.

## Regla semántica obligatoria

El sistema puede mostrar dos conceptos distintos:

1. **Trayectoria GPS estimada**: une visualmente eventos que sí contienen GPS.
2. **Distancia operativa estimada**: suma segmentos rectos entre puntos operativos disponibles, priorizando GPS y usando ubicación planificada cuando falta GPS.

Ninguno de los dos debe describirse como:

- tracking continuo;
- recorrido vial exacto;
- calles efectivamente transitadas;
- kilometraje real de odómetro.

## Rama y release

Rama: `feature/logistics-trip-history-v1`

PR: **#59**

Base: `main` @ `734e1da5f586066083ad3010bccf0aeb8431a020`

Producción base: `0.6.5-beta.13.0`

Release objetivo: **`0.6.5-beta.14.0`**

## P1 — Historial por Viaje

`Historial / POD` mantiene dos modos:

- `Documentos`: búsqueda, evidencias y POD existentes.
- `Viajes`: análisis integral del recorrido y comportamiento operativo.

La vista Viajes incluye:

- explorador de viajes;
- búsqueda por viaje, chofer, placa y transportista;
- filtros Todos / Finalizados / En curso / Excepciones;
- estado, fecha y progreso de paradas;
- KPIs de duración, bultos, GPS, distancia estimada, permanencia y resultados;
- mapa profesional;
- secuencia planificada;
- trayectoria GPS estimada;
- desviaciones plan/real;
- incidencias;
- mapa grande / encajar;
- paradas numeradas;
- selección mapa/lista;
- lectura gerencial;
- timeline operativo con precisión GPS.

## P1.1 — Shared Logistics Map Core

`Operaciones / Torre de Control` e `Historial / Recorrido` comparten:

`src/lib/logisticsMapCore.ts`

Centraliza:

- OpenStreetMap estándar sin API key;
- centro y límites de República Dominicana;
- zoom / maxBounds / fitBounds;
- sanitización de popups;
- colores y utilidades comunes;
- infraestructura de límites territoriales oficiales.

Se eliminó la dependencia CARTO independiente que provocó `API KEY REQUIRED`.

QA visual del usuario confirmó que los mapas de Operaciones e Historial funcionan correctamente después de la unificación.

## P1.2 — Filtro Desde / Hasta

`Historial / POD` posee un período global:

- `Desde`;
- `Hasta`;
- `Aplicar período`;
- indicador de rango cargado.

El filtro se aplica directamente sobre `delivery_trips.trip_date` en Supabase, no solo sobre datos ya descargados.

Características:

- período inicial: primer día del mes actual → hoy RD;
- viajes paginados en bloques;
- relaciones cargadas por lotes de IDs;
- el período gobierna Documentos y Viajes;
- no depende de los 250 viajes más recientes.

QA del usuario confirmó correctamente un rango de un solo día (`08/09/2026`) y la reducción a los viajes correspondientes.

## P1.3 — Exportación Excel estructurada

`Exportar Excel` respeta:

1. período Desde/Hasta aplicado;
2. búsqueda;
3. filtro de estado.

Los eventos e incidencias masivos de los viajes visibles se consultan únicamente al exportar y por lotes.

Archivo:

`Historial_Viajes_<desde>_a_<hasta>.xlsx`

Hojas finales:

1. `Resumen`
2. `Viajes`
3. `Tramos`
4. `Paradas`
5. `Documentos`
6. `Eventos`
7. `Incidencias`

Incluye:

- encabezados profesionales;
- filtros automáticos;
- fila superior congelada;
- fechas / fecha-hora;
- moneda y porcentajes;
- colores de estado;
- trazabilidad de reintentos;
- GPS, precisión y fuente;
- nota explícita de semántica de distancia.

## P1.4 — Distancia operativa estimada liviana

Nuevo núcleo:

`src/lib/logisticsTripDistance.ts`

Objetivo: ofrecer una estimación de distancia útil para gestión **sin agregar ninguna escritura GPS**.

### Prioridad de puntos

Para cada parada:

1. `actual_delivery_latitude / actual_delivery_longitude` si existen;
2. evento GPS asociado a la parada si existe;
3. `planned_latitude / planned_longitude` como fallback;
4. si no existe ninguna ubicación, la parada queda reportada como `sin ubicación` y no fabrica coordenadas.

Para origen / retorno:

- usa coordenadas de origen del viaje cuando existen;
- usa eventos `DEPARTED_ORIGIN`, `RETURNED_ORIGIN` o `TRIP_COMPLETED` cuando tienen GPS;
- si el viaje terminó y existe origen conocido, puede usar ese origen como retorno planificado cuando no hubo GPS de cierre.

### Cálculo

Los puntos disponibles se ordenan operativamente y cada par consecutivo forma un segmento.

La distancia de cada segmento se calcula con Haversine y el total es la suma de esos segmentos rectos.

No se consulta un servicio de rutas y no se afirma distancia vial exacta.

### KPI

Se reemplaza `Trazado mínimo GPS` por:

**Distancia operativa estimada**

Formato adaptativo:

- menos de 1 km → metros;
- 1 km o más → kilómetros.

El subtítulo informa:

- cantidad de segmentos;
- paradas con GPS;
- paradas estimadas mediante ubicación planificada;
- paradas sin ubicación cuando existan.

La lectura gerencial marca cuando parte de la distancia utiliza coordenadas planificadas.

### Excel

La hoja `Viajes` incluye:

- distancia operativa estimada;
- segmentos estimados;
- paradas con GPS;
- paradas por ubicación planificada;
- paradas sin ubicación.

La nueva hoja `Tramos` transparenta cada cálculo:

- origen del segmento;
- fuente de coordenadas;
- destino del segmento;
- latitud / longitud de ambos puntos;
- distancia estimada en metros y kilómetros;
- advertencia de que no representa ruta vial exacta.

## Rendimiento y consumo

Navegación normal:

- eventos/incidencias solo para el viaje seleccionado;
- cache en memoria de la vista;
- sin polling ni Realtime.

Exportación:

- eventos/incidencias de los viajes visibles solo bajo demanda;
- procesamiento del Excel en navegador.

P1.4:

- **0 tablas nuevas**;
- **0 migraciones**;
- **0 filas GPS adicionales**;
- **0 escrituras adicionales**;
- cálculo client-side.

## Base de datos

Sin cambios de esquema/RLS.

Tablas existentes utilizadas:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`;
- POD/evidencias para la vista documental.

## QA / CI

QA visual realizado por el usuario:

- Operaciones / Torre de Control: OK;
- Historial / mapa: OK;
- mapa grande: OK;
- proveedor sin API key: OK;
- filtro Desde/Hasta: OK;
- exportación Excel inicial: archivo generado correctamente.

Build P1.4 con estimador y Excel por tramos:

- TypeScript: **SUCCESS**;
- Vite: **SUCCESS**.

El usuario autorizó la promoción a producción el 09/09/2026.

## Restricciones permanentes

- no introducir tracking continuo sin una decisión futura explícita;
- no presentar distancia estimada como kilometraje vial real;
- no agregar consumo de Supabase solo para enriquecer la línea del mapa;
- no limpiar datos TEST sin backup + aprobación;
- los datos continúan siendo TEST hasta declaración explícita de Go-Live.
