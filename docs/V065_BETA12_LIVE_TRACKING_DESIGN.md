# V0.6.5-beta.12 — Live Operations Tracking

Fecha de diseño: **28/08/2026 (RD)**.

## Objetivo

Crear un nuevo módulo empresarial de **Tracking / Monitoreo de calle** para supervisar en una sola pantalla la operación de Vendedores, con vista global, filtros, mapa, estados operativos, paradas, timeline y reproducción de recorrido.

Beta.12 es **aditiva**: no sustituye ni cambia la lógica de Planificación, Rutas, Visitas, Jornadas o Reportes.

## Principio de veracidad del dato

La plataforma actualmente registra GPS en eventos operativos:

- inicio de jornada/ruta;
- inicio de visita;
- fin de visita;
- fin de jornada;
- eventualidades cuando existan.

No existe todavía un breadcrumb GPS continuo en segundo plano.

Por tanto:

- `Última ubicación` = coordenada del último evento GPS realmente persistido;
- nunca se etiquetará como `ubicación actual` una coordenada antigua;
- la UI mostrará frescura del dato;
- el estado operativo se infiere por eventos, no por movimiento GPS continuo;
- el playback usa puntos reales y tramos visuales estimados entre ellos.

Una fase futura de GPS periódico/background requerirá aprobación separada por impacto en permisos, privacidad, batería, datos móviles, almacenamiento y compatibilidad PWA/móvil.

## Nombre funcional

Visible: **Tracking**

Concepto interno reutilizable: `live_tracking` / `field_tracking`.

No usar lógica específica de empresa en el dominio.

## Acceso

Nuevo permiso: `tracking.view`.

Defaults:

- Administrador: sí, global;
- Supervisor: sí, global;
- Vendedor/Gestor/Recepción/SoloLectura: no por defecto;
- perfiles no ejecutivos podrán recibir permiso explícito en el futuro.

Backend:

- Admin/Supervisor -> todos los Vendedores;
- otros usuarios autorizados -> únicamente `employee_id` propio.

## Pantalla

Ruta propuesta: `/tracking`.

### 1. Toolbar

- fecha;
- Vendedor (por defecto Todos);
- estado operativo;
- frescura;
- Región oficial;
- Provincia oficial;
- Municipio oficial;
- limpiar filtros;
- actualizar;
- autoactualización 30 s cuando la fecha es hoy.

### 2. KPI

- Vendedores visibles;
- jornadas activas;
- en visita;
- en traslado;
- sin actualización reciente;
- visitas realizadas;
- cobertura acumulada.

Todos responden a filtros.

### 3. Mapa principal

Debe ocupar la mayor parte de la pantalla.

Capas:

- última posición real registrada de cada Vendedor;
- paradas planificadas;
- parada actual / último cliente;
- próxima parada;
- eventos GPS del Vendedor seleccionado;
- polilínea estimada entre eventos registrados.

Estados visuales:

- EN_VISITA -> verde;
- EN_TRASLADO -> azul;
- EVENTUALIDAD -> ámbar/rojo según estado;
- PENDIENTE_CIERRE -> rojo;
- PLANIFICADA -> gris/azul suave;
- FINALIZADA -> gris;
- NO_EJECUTADA -> gris/rojo tenue.

Frescura independiente:

- RECIENTE: <= 15 min;
- ATENCION: >15 y <=30 min;
- ANTIGUO: >30 min.

Un Vendedor puede estar `EN_VISITA` y simultáneamente tener registro `ANTIGUO`; no se debe reemplazar el estado semántico por una falsa conclusión de movimiento.

### 4. Panel lateral

Tarjeta por Vendedor:

- nombre;
- estado;
- hora/antigüedad del último registro;
- último cliente/evento;
- próxima parada;
- visitados/planificados;
- cobertura;
- tiempo en calle;
- atención;
- GPS km;
- acción `Ubicar`;
- acción `Ver recorrido`.

Debe poder mostrar todos los Vendedores juntos y seleccionar uno sin perder filtros.

### 5. Playback

Disponible al seleccionar un Vendedor con al menos dos eventos GPS.

Controles:

- reproducir/pausar;
- reiniciar;
- anterior/siguiente;
- velocidad 1x/2x/4x;
- barra de progreso;
- evento actual con hora y cliente.

El mapa anima la secuencia de eventos registrados. La polilínea entre ellos es **estimada** y no afirma representar las calles exactas transitadas.

### 6. Timeline

Orden cronológico:

- Inicio de ruta;
- Llegada / Inicio visita;
- Salida / Fin visita;
- Eventualidad;
- Fin de ruta.

Cada evento incluye:

- hora;
- tipo;
- cliente cuando aplique;
- coordenada real;
- precisión GPS si existe.

## Estado inferido

Prioridad:

1. `PENDIENTE_CIERRE` si la jornada está vencida y abierta;
2. `FINALIZADA` si `ended_at` existe;
3. `EVENTUALIDAD` si existe eventualidad abierta;
4. `EN_VISITA` si existe visita abierta;
5. `EN_TRASLADO` si sesión activa sin visita/eventualidad abierta;
6. `PLANIFICADA` si existe plan del día sin sesión;
7. `NO_EJECUTADA` para histórico nunca iniciado.

La ubicación mostrada corresponde siempre al último evento GPS real disponible.

## Backend beta.12

Crear únicamente vistas ejecutivas/aditivas; no modificar tablas operativas existentes.

### `executive_tracking_events_v1`

Timeline unificado de eventos GPS de ruta/visita/eventualidad.

### `executive_tracking_stops_v1`

Paradas planificadas con coordenada del cliente/prospecto y snapshot territorial.

### `executive_tracking_snapshot_v1`

Una fila por jornada/plan con:

- estado inferido;
- último evento;
- última coordenada;
- precisión;
- último cliente;
- siguiente parada;
- KPIs de jornada;
- territorios oficiales;
- frescura.

Todas las vistas aplican scoping defensivo.

## Actualización

Beta.12 usará refresco automático de 30 segundos cuando se consulta el día actual y refresco manual inmediato.

Esto es `near-live operational tracking`, no background GPS continuo.

## SaaS-ready

- permiso genérico `tracking.view`;
- estados internos desacoplados de branding;
- filtros territoriales usan capa oficial existente pero la UI no debe acoplar la lógica central a República Dominicana;
- ningún `if empresa == Karaka`;
- componentes de mapa/tracking reutilizables.

## No incluido en beta.12 inicial

- captura GPS cada N segundos/minutos en background;
- geofencing automático persistente;
- rutas viales reconstruidas con proveedor de routing;
- ETA de tráfico real;
- despacho/optimización automática tipo fleet;
- tracking de Gestores sin operación de calle.

Esas capacidades pueden evolucionar después sin reconstruir el módulo.

## Criterios de aceptación

1. Administrador puede ver todos los Vendedores juntos.
2. Filtros actualizan mapa, tarjetas y KPI de forma consistente.
3. Un usuario sin acceso global no puede leer ubicaciones de otros desde backend.
4. El mapa distingue último registro real de ubicación actual.
5. Último evento de inicio de visita produce `EN_VISITA`.
6. Último evento de fin de visita con sesión abierta produce `EN_TRASLADO`.
7. Jornada cerrada produce `FINALIZADA`.
8. Se visualizan paradas planificadas y próxima parada.
9. Playback reproduce eventos de un Vendedor seleccionado.
10. Tramos del playback se presentan como estimados.
11. Responsive desktop/tablet y degradación usable móvil.
12. No se altera ninguna función existente de Rutas/Jornadas/Visitas.
