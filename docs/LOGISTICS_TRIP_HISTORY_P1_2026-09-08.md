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

## Rama

`feature/logistics-trip-history-v1`

Base exacta de creación:

`main` → `734e1da5f586066083ad3010bccf0aeb8431a020`

Producción base:

`0.6.5-beta.13.0`

## Implementación

### Historial / POD

La misma pantalla ahora tiene dos modos:

- `Documentos`: conserva búsqueda, detalle y POD existentes.
- `Viajes`: nueva experiencia de análisis integral.

### Explorador de viajes

Incluye:

- búsqueda por viaje, chofer, placa y transportista;
- filtros Todos / Finalizados / En curso / Excepciones;
- estado del viaje;
- fecha;
- chofer;
- vehículo;
- progreso de paradas.

### KPIs por viaje

- duración total;
- bultos entregados/cargados y retornos;
- cobertura GPS de eventos;
- trazado mínimo GPS (suma recta entre puntos registrados, no distancia vial);
- permanencia media en clientes;
- resultado de paradas.

### Mapa profesional

Componente: `src/components/DeliveryTripJourneyMap.tsx`.

Capas:

- secuencia planificada;
- trayectoria estimada GPS;
- diferencias planificado vs ubicación real registrada;
- incidencias;
- paradas numeradas y coloreadas por estado;
- punto de origen cuando esté disponible.

Mapas base:

- Claro (CARTO);
- Calles (OpenStreetMap);
- Satélite (Esri World Imagery).

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
- desviaciones grandes entre ubicación esperada y ubicación registrada;
- intervalos largos sin puntos GPS.

Una desviación GPS puede significar comportamiento operativo o mala calidad del maestro; no se corrige automáticamente.

### Indicadores de ejecución

- coincidencia de secuencia observada;
- mayor intervalo entre puntos GPS;
- máxima desviación plan/real;
- monto del viaje;
- documentos;
- incidencias.

### Paradas y timeline

Por parada:

- orden;
- cliente/destino;
- resultado;
- hora de llegada;
- permanencia;
- bultos.

Timeline:

- salida;
- llegadas;
- inicio/fin de descarga;
- confirmación/parcial/no entrega;
- incidencias;
- retorno;
- cierre;
- disponibilidad y precisión GPS por evento.

## Rendimiento

No se cargan todos los eventos de todos los viajes al abrir `Historial / POD`.

Los eventos e incidencias se consultan **solo para el viaje seleccionado** y se mantienen en cache de memoria durante la sesión de la vista.

No se agregó polling, Realtime ni consultas de fondo.

## Base de datos

No requiere migración.

Usa las tablas existentes:

- `delivery_trips`;
- `delivery_stops`;
- `delivery_documents`;
- `delivery_events`;
- `delivery_incidents`.

## QA técnico

Build validation sobre head `09cdd3f9b0e158f3c65a5d328fb1053537cf73be`:

- npm install: SUCCESS;
- TypeScript + Vite build: SUCCESS.

## QA visual pendiente

Validar localmente antes de merge/deploy:

1. `Historial / POD > Documentos` no perdió funcionalidad.
2. `Viajes` lista los 5 viajes TEST actuales.
3. Seleccionar viaje con 5 paradas y revisar mapa.
4. Alternar Planificada / GPS / Desviación / Incidencias.
5. Alternar Claro / Calles / Satélite.
6. Probar `Mapa grande` y `Encajar`.
7. Seleccionar parada en lista y mapa.
8. Revisar timeline y KPIs contra Supabase.
9. Validar responsive en laptop/tablet.
10. Confirmar que líneas GPS se entiendan como estimadas, no ruta vial exacta.

## No hacer todavía

- no mergear a `main` sin QA visual y aprobación;
- no desplegar Cloudflare;
- no agregar tracking continuo;
- no modificar RLS ni tablas para este P1;
- no limpiar datos TEST.
