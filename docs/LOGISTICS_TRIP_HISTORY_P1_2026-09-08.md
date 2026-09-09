# P1 — Historial por Viaje / Recorrido Operativo

Fecha: 08/09/2026 (RD)

## Objetivo

Evolucionar `Historial / POD` desde una vista centrada únicamente en documentos hacia una herramienta gerencial para analizar viajes completos, recorridos, tiempos, secuencia de paradas, GPS, incidencias y resultados de entrega.

## Regla semántica obligatoria

El sistema muestra una **trayectoria estimada entre eventos GPS registrados**.

No debe describirse como:
- tracking continuo;
- recorrido vial exacto;
- calles efectivamente transitadas entre dos puntos sin eventos intermedios.

La política existente se conserva: sin polling, sin Realtime y sin GPS continuo.

## Rama y base

Rama: `feature/logistics-trip-history-v1`

Base exacta: `main` → `734e1da5f586066083ad3010bccf0aeb8431a020`

Producción base: `0.6.5-beta.13.0`

PR: **#59 Draft**. No merge / no deploy mientras continúe QA.

## Implementación

### Historial / POD

La misma pantalla tiene dos modos:

- `Documentos`: conserva búsqueda, detalle y POD existentes.
- `Viajes`: análisis integral del viaje y su comportamiento operativo.

### Filtro de fecha Desde / Hasta

Se agregó un filtro global de período con:

- `Desde`;
- `Hasta`;
- `Aplicar período`;
- indicador de `Rango cargado`.

El filtro no trabaja únicamente sobre un subconjunto ya descargado. El rango se aplica directamente a `delivery_trips` en Supabase mediante `trip_date`.

Para evitar límites silenciosos:

- viajes paginados en bloques de 500;
- tablas relacionadas consultadas por lotes de IDs;
- el período aplicado gobierna tanto `Documentos` como `Viajes`.

Período inicial: primer día del mes actual → fecha actual de República Dominicana.

### Explorador de viajes

Incluye:

- búsqueda por viaje, chofer, placa y transportista;
- filtros Todos / Finalizados / En curso / Excepciones;
- estado del viaje;
- fecha;
- chofer;
- vehículo;
- progreso de paradas;
- exportación Excel de los viajes visibles después de búsqueda/estado/período.

### KPIs por viaje

- duración total;
- bultos entregados/cargados y retornos;
- cobertura GPS de eventos;
- trazado mínimo GPS: suma recta entre puntos registrados, no distancia vial;
- permanencia media en clientes;
- resultado de paradas.

### Shared Logistics Map Core — P1.1

`Operaciones / Torre de Control` e `Historial / Recorrido` comparten ahora:

`src/lib/logisticsMapCore.ts`

Centraliza:

- OpenStreetMap estándar, sin API key;
- centro y límites de contexto de República Dominicana;
- min zoom / zoomSnap / zoomDelta / maxBounds;
- `fitBounds` y fallback nacional;
- sanitización de HTML en popups;
- colores comunes de rutas;
- utilidades de bounds;
- pane/WMS para límites territoriales oficiales.

Esto elimina la divergencia que originalmente produjo `API KEY REQUIRED` al usar un proveedor CARTO independiente en Historial.

`DeliveryControlMap` conserva su UI y semántica de operación activa; `DeliveryTripJourneyMap` añade únicamente capas históricas propias.

### Mapa profesional de Historial

Componente: `src/components/DeliveryTripJourneyMap.tsx`.

Capas:

- secuencia planificada;
- trayectoria estimada GPS;
- diferencias planificado vs ubicación real registrada;
- incidencias;
- paradas numeradas y coloreadas por estado;
- punto de origen cuando esté disponible.

Mapas base:

- `Mapa`: mismo OpenStreetMap de Operaciones;
- `Satélite`: Esri World Imagery opcional.

Interacción:

- encajar recorrido;
- mapa grande;
- selección de parada desde mapa o lista;
- popups con estado, hora y precisión GPS;
- leyenda operativa.

### Lectura gerencial

Se generan observaciones de lectura, no sentencias automáticas:

- calidad/cobertura GPS;
- incidencias;
- entregas parciales/no entregadas/reprogramadas;
- diferencia entre secuencia planificada y llegadas observadas;
- desviaciones grandes entre ubicación esperada y registrada;
- intervalos largos sin puntos GPS.

Una desviación GPS puede significar comportamiento operativo o mala calidad del maestro; no se corrige automáticamente.

### Excel estructurado

Archivo generado desde el navegador usando la dependencia existente `exceljs`.

El botón `Exportar Excel` toma **los viajes visibles** después de:

1. período Desde/Hasta ya aplicado;
2. búsqueda;
3. filtro de estado.

Para no volver pesada la pantalla, `delivery_events` y `delivery_incidents` de todos los viajes exportados se consultan **solo al pulsar Exportar Excel**.

Nombre:

`Historial_Viajes_<desde>_a_<hasta>.xlsx`

Hojas:

1. `Resumen`
   - período;
   - búsqueda/estado;
   - viajes/paradas/documentos;
   - bultos;
   - monto;
   - eventos/cobertura GPS;
   - incidencias;
   - nota semántica sobre trayectoria GPS.
2. `Viajes`
   - chofer/vehículo/transportista;
   - paradas/documentos/bultos/monto;
   - salida/retorno/cierre/duración;
   - cobertura y trazado GPS;
   - gaps;
   - incidencias;
   - resultados y permanencia.
3. `Paradas`
   - destino;
   - GPS planificado/real;
   - desviación;
   - bultos/montos;
   - tiempos de llegada/descarga/entrega/permanencia.
4. `Documentos`
   - factura/pedido/cliente;
   - bultos/monto/estado;
   - intento y lineage de reintento cuando exista.
5. `Eventos`
   - timeline técnico;
   - GPS, precisión, fuente y payload.
6. `Incidencias`
   - tipo/severidad/estado;
   - descripción/resolución;
   - timestamps y GPS.

Formato Excel:

- encabezados profesionales;
- filtros automáticos;
- fila superior congelada;
- formatos de fecha, fecha-hora, moneda y porcentaje;
- colores por estado;
- anchos de columna preparados para análisis.

## Rendimiento

Al navegar Historial:

- el período se consulta en Supabase;
- no se cargan todos los eventos de todos los viajes;
- eventos e incidencias se consultan solo para el viaje seleccionado y se cachean durante la sesión.

Al exportar:

- eventos/incidencias de los viajes exportados se cargan bajo demanda y por lotes.

No se agregó polling, Realtime ni GPS continuo.

## Base de datos

No requiere migración ni cambio de esquema/RLS.

Usa las tablas existentes:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`.

## QA realizado

### Mapas

Validado visualmente por el usuario:

- Operaciones / Torre de Control;
- mapa estándar;
- mapa grande;
- Control Tower;
- Historial / recorrido;
- sin `API KEY REQUIRED`;
- Shared Map Core sin regresión visible.

### Build

Head funcional con fecha/export antes de este commit documental:

`c1d2628ee008ed4f8d99f0d0327ffdc1323adfcc`

Build validation:

- TypeScript: **SUCCESS**;
- Vite: **SUCCESS**.

## QA todavía pendiente

Antes de merge/deploy:

1. actualizar la rama local;
2. confirmar el toolbar Desde/Hasta;
3. probar varios rangos;
4. confirmar que viajes/documentos cambian según el período;
5. combinar período + búsqueda + estado;
6. descargar el Excel;
7. abrir el archivo y validar sus 6 hojas, formatos y registros;
8. confirmar que el Excel coincide con los viajes visibles;
9. revisar responsive del toolbar de fecha.

## No hacer todavía

- no mergear a `main` sin QA final y aprobación;
- no desplegar Cloudflare;
- no agregar tracking continuo;
- no modificar RLS ni tablas para P1;
- no limpiar datos TEST.
