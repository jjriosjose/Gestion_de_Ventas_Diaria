# V0.6.5-beta.11 — Operational Intelligence & UX Polish

Fecha de definición: **27/08/2026 (RD)**.

> Documento rector de beta.11. Su objetivo es evitar una actualización fragmentada: todos los cambios visuales, lógicos y de interfaz de este bloque deben responder a una misma arquitectura de producto.

---

# 1. Objetivo general

Transformar la capa actual de Jornadas, Reportes y Notificaciones en una experiencia de nivel empresarial premium, comparable en disciplina funcional a productos modernos de Sales Operations / CRM / Field Service.

Beta.11 debe mejorar simultáneamente:

1. exactitud matemática;
2. lectura ejecutiva;
3. jerarquía visual;
4. operación diferenciada por rol;
5. navegación contextual;
6. seguimiento de tareas CRM;
7. consistencia de filtros;
8. accesibilidad y responsive;
9. microinteracciones;
10. exportaciones alineadas con la interfaz.

No se aceptan tarjetas o efectos puramente decorativos sin valor operacional.

---

# 2. Principios de producto obligatorios

## 2.1 Una métrica debe tener una definición única

Inicio, Jornadas, Reportes y exportaciones deben reutilizar la misma semántica para:

- cobertura;
- cierre operativo;
- tiempo en calle;
- tiempo atendiendo clientes;
- traslado/espera;
- tiempo CRM;
- tiempo showroom;
- llamadas;
- citas;
- compras;
- ventas.

## 2.2 Cada rol debe verse reflejado en su trabajo real

- Vendedor = calle, ruta, visitas, cobertura, atención, traslado, GPS.
- Gestor = CRM, llamadas, seguimientos, citas, showroom, contactabilidad y conversión.
- Admin/Supervisor = visión transversal y drill-down.

No convertir Gestores en rutas ficticias.

## 2.3 UI premium = claridad, no exceso

- pocas capas visuales;
- agrupación semántica;
- jerarquía tipográfica;
- colores usados para estado/prioridad;
- sombras sutiles;
- hover sobrio;
- sin grids automáticos que produzcan huecos visuales grandes;
- sin duplicar información en tarjetas innecesarias.

## 2.4 Seguridad y scoping

Los filtros frontend nunca sustituyen RLS/scoping backend.

---

# 3. Prioridades beta.11

## P0 — Corrección lógica

1. Corregir `Horas gestión calle`.
2. Exponer `Atención clientes`.
3. Exponer `Traslado / espera estimado`.
4. Evitar duplicación/inflado de tiempos históricos.

## P1 — Centro Operativo por rol

5. Ampliar Jornadas a `Control Operativo` con vistas Calle y CRM/Showroom.
6. Vista de Gestores.
7. Follow-ups / cola de trabajo.

## P1 — UX premium

8. Rediseño de KPI por grupos semánticos.
9. Hover/focus/selected states.
10. Notificaciones categorizadas.
11. Navegación al objeto exacto.
12. Filtros jerarquizados y persistentes.
13. Panel lateral de detalle.

## P2 — Refinamiento

14. Exportaciones.
15. Accesibilidad.
16. Responsive.
17. Optimización de bundle si el bloque queda estable.

---

# 4. Corrección de tiempos de calle

## 4.1 Bug conocido beta.10

`Horas gestión calle` usa actualmente `operational_seconds` del resumen diario para Vendedores.

Esto puede inflarse por sesiones históricas abiertas calculadas con `now()`.

No debe continuar.

## 4.2 Fuente correcta

### Tiempo en calle

```text
SUM(executive_route_journeys_v2.route_window_seconds)
```

Representa:

```text
Inicio de ruta -> cierre de jornada
```

limitado al día operativo.

### Atención clientes

```text
SUM(executive_route_journeys_v2.visit_seconds)
```

Es la suma real de:

```text
ended_at - started_at
```

de todas las visitas válidas.

### Eventualidades

```text
SUM(executive_route_journeys_v2.incident_seconds)
```

### Traslado / espera estimado

```text
SUM(executive_route_journeys_v2.transit_wait_estimated_seconds)
```

No llamarlo `Tiempo conduciendo`.

## 4.3 Promedio de atención

```text
Atención total / visitas finalizadas
```

Debe mostrarse como indicador descriptivo.

Nunca colorear automáticamente como “mejor” por ser más corto.

---

# 5. Nuevo concepto: Control Operativo

El módulo actual `/jornadas` evoluciona visualmente a un centro de operación.

Nombre de navegación puede mantenerse `Jornadas` por continuidad, pero cabecera administrativa sugerida:

```text
CONTROL OPERATIVO
```

Tabs principales:

```text
[ Calle ] [ CRM / Showroom ]
```

Admin/Supervisor ve ambos.

Vendedor entra directamente a Calle / Mis jornadas.

Gestor entra directamente a CRM / Mi gestión.

---

# 6. Vista Calle — Vendedores

## 6.1 KPI de período

Grupo `Ejecución`:

- Jornadas.
- Activas.
- Finalizadas.
- No ejecutadas.
- Pendientes de cierre.

Grupo `Cobertura`:

- Planificados.
- Visitados.
- Cobertura real.
- Resueltos.
- Cierre operativo.

Grupo `Tiempo`:

- Horas en calle.
- Atención clientes.
- Promedio por visita.
- Traslado / espera estimado.
- Eventualidades.

Grupo `Movilidad`:

- Distancia GPS estimada.

## 6.2 Tabla principal Calle

Columnas recomendadas:

| Fecha | Vendedor | Estado | Plan | Visitados | Cobertura | Atención | Jornada | GPS |
|---|---|---|---:|---:|---:|---|---|---:|

Quitar de la tabla principal información secundaria como horario completo si hace la lectura demasiado densa.

Horario, traslado, eventualidades, cierre y motivo quedan en detalle.

## 6.3 Detalle lateral

Reemplazar modal grande por drawer/panel derecho cuando sea técnicamente razonable.

Debe mantener visible la tabla y filtros.

Secciones:

- resumen;
- tiempos;
- paradas;
- eventualidades;
- mapa/GPS cuando corresponda;
- cierre.

---

# 7. Vista CRM / Showroom — Gestores

## 7.1 No usar route_session

El Gestor no debe tener una ruta ficticia.

Su operación se deriva de:

- `calls`;
- `appointments`;
- `showroom_sessions`;
- `follow_ups`;
- compras/ventas asociadas;
- primera/última actividad.

## 7.2 KPI de carga de trabajo

- Seguimientos programados.
- Seguimientos pendientes.
- Seguimientos vencidos.
- Seguimientos completados.
- Citas pendientes de validar.
- Citas confirmadas.

## 7.3 KPI de llamadas

- Llamadas realizadas.
- Contactadas.
- No contesta.
- Ocupado.
- Teléfono incorrecto.
- Contactabilidad.
- Duración total llamadas.
- Promedio por llamada.
- Citas generadas desde llamada.

## 7.4 KPI de showroom

- Citas programadas.
- Citas recibidas / atendidas.
- No show si el modelo lo soporta de forma confiable.
- Reprogramadas.
- Tiempo de atención showroom.
- Promedio de atención showroom.

## 7.5 KPI comercial

- Clientes con compra.
- Conversión.
- Monto vendido.
- Venta promedio por cliente.

## 7.6 Ventana de actividad

Para Gestor usar:

```text
Primera actividad registrada
Última actividad registrada
Ventana de actividad registrada
Tiempo de gestión registrado
```

No llamarlo `Jornada laboral` hasta que exista un mecanismo explícito de inicio/cierre para Gestores.

---

# 8. Follow-ups / próximas acciones CRM

## 8.1 Base existente

Tabla `follow_ups` ya existe con:

- `assigned_employee_id`;
- `due_at`;
- `status`;
- `source_type`;
- `source_id`;
- `completed_at`;
- notas.

## 8.2 Integración objetivo

Cuando una llamada/visita crea:

```text
next_action + follow_up_date
```

crear/actualizar un `follow_up` cuando corresponda.

Flujo conceptual:

```text
Actividad -> Próxima acción -> Fecha -> Follow-up -> Cola de trabajo
```

## 8.3 Cola del Gestor

Vista tipo worklist:

```text
HOY
12 seguimiento(s)
8 completados
3 pendientes
1 vencido
```

Prioridades:

- vencido;
- vence hoy;
- próximo;
- completado.

Acciones rápidas:

- abrir cliente;
- registrar llamada;
- completar;
- reprogramar.

---

# 9. Reportes — nueva arquitectura visual

No presentar todos los KPI como una sola matriz plana.

## 9.1 Bloque A — Ejecución Calle

- Jornadas.
- Cobertura.
- Cierre operativo.
- Distancia GPS.
- Horas en calle.
- Atención clientes.
- Traslado/espera.

## 9.2 Bloque B — CRM / Showroom

- Seguimientos.
- Llamadas.
- Contactabilidad.
- Tiempo llamadas.
- Citas.
- Atendidos showroom.
- Tiempo showroom.

## 9.3 Bloque C — Resultado Comercial

- Clientes con compra.
- Venta calle.
- Venta showroom.
- Monto vendido total.
- Conversión.

## 9.4 Tarjeta Monto vendido

Debe:

- permanecer en una sola línea cuando exista espacio;
- usar `font-variant-numeric: tabular-nums`;
- usar tamaño responsive (`clamp`);
- no truncar cifras relevantes;
- tener jerarquía comercial clara;
- evitar dejar un gran vacío en la fila.

---

# 10. Sistema de tarjetas premium

## 10.1 Estados

### Default

- borde neutro;
- sombra mínima.

### Hover

- `translateY(-2px)` aprox.;
- borde ligeramente tintado con brand;
- sombra ligeramente mayor;
- icono/fondo se intensifica;
- transición ~160–200 ms.

### Focus-visible

Equivalente accesible al hover.

### Selected / acting as filter

- borde brand persistente;
- fondo suave;
- indicador claro de filtro activo.

## 10.2 No usar hover falso

Si una tarjeta no hace nada al clic, no usar cursor pointer.

Si es accionable:

- clic filtra/drill-down;
- tecla Enter/Espacio también.

## 10.3 Reduced motion

Respetar:

```css
prefers-reduced-motion
```

---

# 11. Filtros premium

## 11.1 Dos niveles

### Principales

- Período.
- Mes / Fecha / Rango.
- Tipo colaborador.
- Colaborador.

### Segmentación

- Estado.
- Tipo cliente.
- Región.
- Provincia.
- Municipio.
- otros solo si agregan valor.

## 11.2 Chips activos

Debajo:

```text
Filtros activos:
[ Agosto 2026 × ] [ Vendedores × ] [ Ozama × ]
```

Acción:

`Limpiar todo`.

## 11.3 Persistencia

Preferencia:

query parameters.

Ejemplo:

```text
/reportes?period=month&month=2026-08&employee=...
```

Objetivos:

- volver de detalle sin perder contexto;
- compartir enlace filtrado;
- historial navegador coherente.

---

# 12. Centro de Alertas Operativas

La campana actual evoluciona a un panel categorizado.

## 12.1 Categorías

- Jornadas.
- Rutas / Visitas.
- CRM / Seguimientos.
- Agenda / Showroom.
- Calidad de datos.
- Sistema.

## 12.2 Severidad

### Crítica — rojo

- jornada vencida;
- visita abierta en jornada vencida;
- bloqueo operativo.

### Acción requerida — ámbar

- follow-up vencido;
- cita pendiente de validar;
- ruta que requiere acción próxima.

### Información — azul

- planificación nueva;
- cita confirmada;
- asignación.

### Resuelto/completado — verde

Solo cuando aporte valor mantenerlo visible temporalmente.

## 12.3 Estructura visual

- encabezado con conteo;
- tabs o filtros rápidos;
- agrupación por categoría;
- badge de severidad;
- icono;
- título;
- contexto;
- fecha relativa;
- acción.

## 12.4 Navegación exacta

Una alerta debe abrir el objeto correspondiente.

Ejemplos:

```text
Jornada vencida -> /jornadas + jornada seleccionada
Cita -> /agenda + cita seleccionada
Follow-up -> CRM + cliente/tarea seleccionada
```

No quedarse únicamente en la página general.

## 12.5 Acciones globales

- marcar todas como leídas;
- filtrar categoría;
- filtrar acción requerida;
- deduplicar notificaciones equivalentes.

---

# 13. Datos de Gestores — definiciones

## Llamadas

Fuente: `calls`.

Duración:

- preferir `duration_seconds` real;
- si se conserva estimación histórica, etiquetar correctamente cuando no sea real;
- no mezclar silenciosamente tiempos estimados y reales en una métrica llamada `duración real`.

## Citas

Fuente: `appointments`.

Distinguir:

- solicitadas;
- pendientes validación;
- confirmadas/programadas;
- reprogramadas;
- finalizadas/asistidas cuando el modelo lo indique.

## Showroom

Fuente: `showroom_sessions`.

Tiempo:

```text
ended_at - started_at
```

## Compras / ventas

Separar:

- venta visita;
- venta showroom;
- total.

---

# 14. Gráficos recomendados

No agregar gráficos por llenar espacio.

## Calle

- Plan vs Visitados vs Resueltos por día.
- Cobertura diaria.
- Opcional: Tiempo en calle vs Atención.

## CRM

- Llamadas vs contactadas por día.
- Seguimientos completados vs vencidos.
- Citas vs showroom atendido.

## Comercial

- Ventas calle vs showroom por período.

---

# 15. Drill-down

KPI accionables deben filtrar o abrir detalle.

Ejemplos:

- `Pendientes cierre` -> Jornadas filtrada.
- `No ejecutadas` -> lista correspondiente.
- `Seguimientos vencidos` -> worklist vencida.
- `Clientes con compra` -> detalle de clientes.
- `Monto vendido` -> desglose por canal/cliente.

La selección debe permanecer visible mediante estado de tarjeta y chips de filtro.

---

# 16. Exportaciones

Excel/PDF deben seguir la misma semántica que pantalla.

## Calle

- tiempo en calle;
- atención;
- traslado/espera;
- distancia;
- cobertura;
- cierre.

## CRM

- llamadas;
- duración;
- contactabilidad;
- follow-ups;
- citas;
- showroom;
- tiempos;
- ventas.

No exportar una métrica con nombre distinto al usado en UI salvo explicación explícita.

---

# 17. Responsive

## Desktop

- filtros en dos niveles;
- KPI agrupados;
- tablas + drawer.

## Tablet

- KPI 2–3 columnas;
- filtros reordenados;
- drawer casi full-width.

## Móvil

- KPI en una columna o 2 según ancho;
- prioridad a acciones actuales;
- tablas convertidas a tarjetas cuando sea más usable;
- notificaciones en panel full-height;
- targets táctiles adecuados.

---

# 18. Accesibilidad

- `focus-visible` claro;
- navegación con teclado;
- color no debe ser único indicador;
- contraste suficiente;
- aria-label en iconos accionables;
- elementos clicables semánticos;
- reduced motion.

---

# 19. Performance

Deuda conocida: bundle >500 KB.

Beta.11 debe evitar empeorarla innecesariamente.

Después de estabilizar funcionalidad:

- evaluar lazy loading por ruta;
- dividir Reportes/Jornadas/mapas;
- no cargar grandes módulos hasta que se visiten;
- revisar Recharts/map dependencies.

No sacrificar consistencia funcional por optimizar antes de tiempo.

---

# 20. Posible backend beta.11

No crear tablas nuevas por defecto.

Revisar primero:

- `executive_route_journeys_v2`;
- `executive_daily_employee_summary`;
- `calls`;
- `appointments`;
- `showroom_sessions`;
- `follow_ups`;
- `notifications`.

Cambios backend probables:

1. vista ejecutiva CRM/Showroom por empleado/día;
2. integración de `follow_ups` con próximas acciones;
3. campos/categorización de notificaciones si `type/entity_type` no bastan;
4. RPCs solo si mejoran consistencia/scoping.

Todas las nuevas vistas deben respetar RLS/scoping por empleado.

---

# 21. Criterios de aceptación beta.11

## Exactitud Calle

- [ ] Reportes y Jornadas muestran el mismo tiempo total de calle para el mismo filtro.
- [ ] `Horas en calle` no supera artificialmente un día por sesión vencida.
- [ ] Atención = suma real de visitas.
- [ ] Traslado/espera no se presenta como conducción exacta.
- [ ] Promedio por visita usa visitas válidas.

## Gestores

- [ ] Admin puede abrir `CRM / Showroom`.
- [ ] Gestor ve solo su propia gestión.
- [ ] llamadas, contactabilidad y duración se calculan correctamente.
- [ ] citas se clasifican correctamente.
- [ ] showroom muestra tiempo real cuando existe sesión.
- [ ] ventas se separan por canal.

## Follow-ups

- [ ] próxima acción puede generar tarea.
- [ ] Gestor ve pendientes/vencidos/hoy/completados.
- [ ] completar/reprogramar deja trazabilidad.

## UX

- [ ] no existen filas de KPI con huecos visuales grandes.
- [ ] Monto vendido no rompe el layout.
- [ ] tarjetas tienen hover/focus consistente.
- [ ] tarjeta accionable mantiene estado selected.
- [ ] filtros activos visibles como chips.
- [ ] filtros sobreviven drill-down/back.
- [ ] detalle lateral conserva contexto.

## Notificaciones

- [ ] categorías visibles.
- [ ] severidad visible por color + icono + texto.
- [ ] alerta abre objeto exacto.
- [ ] marcar todas como leídas funciona.
- [ ] deduplicación evita ruido.

## Seguridad

- [ ] Vendedor no ve datos ajenos.
- [ ] Gestor no ve datos ajenos.
- [ ] Admin/Supervisor conserva visión macro.
- [ ] exportaciones respetan el mismo alcance.

## Build/Deploy

- [ ] TypeScript SUCCESS.
- [ ] Vite SUCCESS.
- [ ] GitHub Actions SUCCESS.
- [ ] migraciones validadas si existen.
- [ ] deploy manual solo después de revisión.

---

# 22. Estrategia de implementación

No implementar todo directamente en `main`.

## Fase 0 — checkpoint

- documentación beta.11;
- merge docs-only.

## Fase 1 — data definitions

- corregir tiempos Calle;
- definir CRM metrics;
- validar follow-ups/notificaciones;
- crear vistas/RPC solo si son necesarias.

## Fase 2 — design system de KPI

- componente KPI unificado;
- hover/focus/selected;
- grupos semánticos;
- responsive.

## Fase 3 — Control Operativo

- Calle refinada;
- CRM / Showroom;
- drawer de detalle.

## Fase 4 — Reportes

- nuevas fuentes de tiempo;
- grupos de KPI;
- filtros persistentes;
- drill-down.

## Fase 5 — Alertas

- categorías;
- severidad;
- deep-link.

## Fase 6 — QA

- Admin;
- Vendedor;
- Gestor;
- desktop;
- tablet;
- móvil;
- Excel/PDF;
- seguridad.

## Fase 7 — merge/deploy

- PR;
- CI;
- merge;
- Fetch/Pull;
- build local;
- deploy manual Cloudflare;
- validación productiva.

---

# 23. Fuentes de verdad técnicas para beta.11

Antes de modificar código:

1. `PROJECT_HANDOFF.md`.
2. este documento.
3. `docs/V065_BETA10_REFINEMENT_STATUS.md`.
4. GitHub `main`.
5. Supabase remoto.
6. Cloudflare productivo.

---

# 24. Regla de calidad de beta.11

> Ningún KPI nuevo se implementará hasta poder responder con precisión: qué mide, de qué tablas/vistas proviene, cuál es su numerador/denominador o ventana temporal, cómo se comporta por rol y cómo se valida.

> Ningún refinamiento visual debe ocultar una inconsistencia lógica.

> Beta.11 se considerará completa solo cuando Calle y CRM/Showroom formen un sistema coherente y no dos pantallas independientes pegadas entre sí.
