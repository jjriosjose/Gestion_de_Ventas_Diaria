# Adaptaciones útiles de conceptos TMS — Gestión de Ventas Diaria

Baseline auditado: **V0.6.4**.

Este proyecto toma algunos conceptos de un TMS únicamente cuando aportan a la gestión comercial. **Gestión de Ventas Diaria no es un TMS logístico** y no debe evolucionar hacia telemetría/gestión de flota por accidente de diseño.

---

## Conceptos TMS adaptados a gestión comercial

### Jornada comercial

Una `route_session` representa la ventana operativa de trabajo de una ruta de vendedor.

En V0.6.4:

- tiene inicio;
- puede tener GPS inicial;
- tiene cierre normal o parcial;
- guarda `ended_at`;
- puede guardar GPS final;
- después del cierre la jornada queda congelada.

Para reportería de visitas ligadas a ruta, `session_date` es el día operativo.

### Parada comercial

Cada cliente planificado es una `route_stop`.

Estados operativos relevantes:

- `PENDIENTE`
- `EN_VISITA`
- `VISITADO`
- `NO_VISITADO`
- `REPROGRAMADO`
- `CANCELADO`

Cerrar una jornada no convierte una parada pendiente en visitada.

### Cobertura vs cierre operativo

Conceptos que deben mantenerse separados:

- **Cobertura real** = visitas completadas / paradas planificadas.
- **Resueltos** = paradas con resultado o justificación final.
- **Resolución / cierre operativo** = resueltos / planificados.

Una ruta puede tener cobertura 18.2 % y cierre operativo 100 % si el resto de paradas quedó correctamente justificado al finalizar la jornada.

### Excepciones y eventualidades

La app diferencia:

- excepción de una parada;
- eventualidad de la jornada/ruta.

Ejemplos de eventualidad:

- avería;
- neumático;
- accidente;
- tráfico;
- clima;
- cierre de vía;
- otra incidencia operacional.

Las eventualidades pueden incluir:

- inicio/fin;
- impacto;
- descripción;
- GPS;
- evidencia opcional.

No deben mezclarse con tiempo de atención a clientes.

### Evidencia de visita

La prueba operativa puede incluir:

- GPS puntual y precisión;
- hora llegada/salida;
- resultado comercial;
- recibido/no recibido;
- observaciones;
- fotografías/evidencias;
- compra/no compra/pendiente;
- monto opcional.

### Calidad geográfica

Las coordenadas reales de visita se comparan contra:

- territorio maestro;
- coordenada guardada;
- división administrativa oficial.

Una discrepancia crea evidencia/revisión; no autoriza corrección automática.

### División territorial

`administrative_areas` contiene actualmente 593 áreas activas:

- 10 regiones;
- 32 provincias;
- 158 municipios;
- 393 distritos municipales.

Mapa, Planificación, Captación y Calidad geográfica consumen esa jerarquía.

---

## Distancia — adaptación actual

V0.6.4 incorporó **distancia GPS geodésica estimada**, no telemetría continua.

La vista `executive_daily_route_metrics` estima tramos cuando existen puntos GPS:

```text
inicio de ruta → primera visita
visita anterior → siguiente visita
última visita → cierre de ruta
```

Se exponen métricas como:

- `start_to_first_m`
- `between_visits_m`
- `last_to_end_m`
- `estimated_distance_m`
- `gps_segments`

Regla de interpretación:

> Distancia GPS estimada entre puntos disponibles ≠ odómetro ≠ distancia vial exacta.

Si en el futuro se integra un motor de rutas, la nueva métrica debe llamarse explícitamente **distancia vial estimada** y coexistir con la geodésica actual.

---

## Tiempo — adaptación actual

Reporterías V0.6.x separan:

- jornada de ruta;
- atención a clientes;
- promedio por visita;
- eventualidades;
- traslado/espera estimado.

`Traslado/espera estimado` es un residual de la jornada. Puede contener conducción, tráfico, estacionamiento, pausas y espera.

**No debe presentarse como “tiempo conduciendo” sin tracking o fuente vial adicional.**

Pendientes de refinamiento V0.6.5:

- % jornada en atención;
- % jornada en traslado/espera;
- visitas por hora de jornada;
- interpretación de productividad sin premiar automáticamente visitas muy cortas.

---

## Deliberadamente fuera de alcance actual

- GPS continuo de vehículos.
- telemetría.
- odómetro automático.
- combustible.
- vehículos/placas/conductores como módulo logístico.
- cubicaje/capacidad/peso.
- muelles y cargas.
- WMS/ERP logístico.
- prueba de entrega de mercancía.
- control de flota.

Estos elementos solo deben incorporarse si aparece un requerimiento comercial explícito y se aprueba una nueva fase de arquitectura.

---

## Flujo geográfico conservador

1. Se registra GPS puntual de visita.
2. Se compara con la cartografía y los datos del cliente.
3. Se clasifica la coherencia/inconsistencia.
4. Se conserva evidencia.
5. Administración puede revisar casos cuando corresponda.
6. Ninguna diferencia sobrescribe por sí sola el maestro o las coordenadas.

Esta regla sigue vigente y es intencional.

---

## Referencias de continuidad

Para el estado real del proyecto consultar:

- `PROJECT_HANDOFF.md`
- `docs/REQUIREMENTS_STATUS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/GEOGRAPHY_SETUP.md`

Este archivo debe mantenerse como documento de alcance conceptual: ayuda a diferenciar lo que la app adoptó de un TMS y lo que sigue deliberadamente fuera de alcance.
