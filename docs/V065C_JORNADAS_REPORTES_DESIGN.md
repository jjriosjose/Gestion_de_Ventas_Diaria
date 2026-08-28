# V0.6.5C — Jornadas y Reportería Multiperíodo

> Diseño funcional/técnico aprobado como siguiente bloque después de V0.6.5-beta.8.
>
> Este documento NO sustituye `PROJECT_HANDOFF.md`; lo complementa y define criterios de implementación/aceptación.

---

# 1. Objetivo

Resolver dos necesidades estructurales:

1. Una jornada de calle debe pertenecer exclusivamente a su fecha operativa y no puede continuar ejecutándose días posteriores.
2. Administración/Supervisión necesita un centro profesional de control de jornadas y reportería histórica filtrable por período, colaborador, estado y territorio.

El diseño debe conservar las responsabilidades de los módulos existentes:

- **Planificación**: construir el plan.
- **Rutas**: ejecutar la ruta/jornada del día.
- **Jornadas**: controlar el ciclo de vida de las jornadas.
- **Reportes**: analizar resultados históricos.
- **Inicio**: estado ejecutivo de hoy.

---

# 2. Regla temporal crítica

## 2.1 Regla de negocio

Una `route_session` solo puede ejecutar actividad cuando:

```text
session_date == fecha operativa local actual
status == ACTIVA
ended_at IS NULL
```

Si `session_date < hoy` y la sesión sigue abierta:

```text
Estado derivado de UX: VENCIDA / PENDIENTE DE CIERRE
```

No se permite:

- registrar llegada a cliente;
- iniciar nueva visita;
- finalizar una visita como si perteneciera al día posterior;
- registrar una nueva eventualidad de recorrido;
- reprogramar/no realizar desde una ejecución vencida;
- continuar secuencia;
- agregar visita adicional a esa sesión;
- presentarla como jornada activa normal.

Sí se permite:

- consultar historial;
- revisar paradas y resultados ya registrados;
- consultar GPS/eventualidades históricas;
- realizar un cierre administrativo trazable;
- exportar/analizar.

## 2.2 Protección en frontend y backend

La regla no puede depender únicamente de botones deshabilitados.

Frontend:

- `Routes.tsx` y cualquier entrada de visitas adicionales deben validar día operativo.
- Jornada vencida no debe renderizar acciones de ejecución.

Backend:

- crear RPC/trigger/función de guardia o reforzar operaciones críticas para rechazar mutaciones operativas sobre sesiones de fecha anterior.
- la excepción aceptada es el cierre administrativo de sesión vencida.

## 2.3 Sesiones que cruzan medianoche

No extender artificialmente la jornada al día siguiente.

Para reportería, una sesión vencida abierta debe dejar de acumular tiempo después del límite del día operativo o de la regla de corte definida en backend.

Objetivo: evitar jornadas ficticias de 24/48/72 horas por falta de cierre manual.

La implementación debe documentar explícitamente el cutoff utilizado.

---

# 3. Estados de jornada

Estados persistidos existentes se respetan; la UI puede derivar estados adicionales.

## 3.1 Estados principales

- `PLANIFICADA`: plan creado, no iniciado.
- `ACTIVA`: sesión abierta y ejecutable hoy.
- `FINALIZADA`: cierre normal o cierre registrado.
- `FINALIZADA PARCIAL`: presentación UX cuando `closure_mode = PARCIAL`.

## 3.2 Estado derivado

- `PENDIENTE DE CIERRE`: sesión abierta con `session_date < hoy`.

No es obligatorio añadir una columna nueva si puede derivarse de forma inequívoca.

## 3.3 Prioridad visual

- Activa hoy: verde/activo.
- Planificada: neutro.
- Finalizada: completado.
- Finalizada parcial: ámbar.
- Pendiente de cierre: alerta fuerte, no confundir con activa.

La forma/icono/texto debe comunicar estado además del color.

---

# 4. Nuevo módulo `Jornadas`

Ruta sugerida: `/jornadas`.

Ubicación de navegación sugerida:

```text
Operación
  Inicio
  Clientes
  Mapa
  Planificación
  Rutas
  Jornadas   <- nuevo
  Captación
```

Puede ajustarse el grupo si Layout utiliza otra clasificación, pero debe estar cerca de Rutas.

---

# 5. UX por rol

## 5.1 Vendedor — `Mis jornadas`

Objetivo: que el Vendedor entienda inmediatamente qué debe ejecutar/cerrar sin buscar fecha por fecha.

### Cabecera

KPI simples:

- Jornada de hoy: activa / sin iniciar / no planificada.
- Pendientes de cierre.
- Finalizadas en período seleccionado.
- Cobertura período.

### Secciones

#### A. Jornada activa de hoy

Mostrar:

- fecha;
- hora inicio;
- duración actual;
- planificados;
- visitados;
- pendientes;
- cobertura;
- cierre operativo;
- eventualidad activa si existe.

Acción:

- `Ir a ruta` / `Continuar jornada` SOLO si es de hoy.

#### B. Pendientes de cierre

Para sesiones anteriores abiertas:

- fecha;
- planificados;
- visitados;
- pendientes;
- cobertura;
- motivo pendiente;
- antigüedad.

Acción:

- `Revisar y cerrar`.

Nunca `Continuar`.

#### C. Programadas

Rutas futuras o del día todavía no iniciadas.

#### D. Finalizadas

Historial personal filtrable por período.

### Filtros Vendedor

- período rápido: Hoy / 7 días / Mes / Rango;
- estado;
- opcional tipo de cliente si existe valor real.

No mostrar selector de otros Vendedores.

---

# 6. Admin/Supervisor — `Control de jornadas`

Objetivo: centro operativo macro y drill-down individual.

## 6.1 Filtros superiores

- Período: Hoy / Semana / Mes / Rango.
- Año.
- Mes.
- Vendedor.
- Estado de jornada.
- Tipo de cliente.
- Región oficial.
- Provincia.
- Municipio.

Los filtros deben ser combinables y resetearse con `Limpiar filtros`.

## 6.2 KPI principales

- Jornadas planificadas.
- Jornadas iniciadas.
- Activas hoy.
- Finalizadas.
- Finalizadas parciales.
- Pendientes de cierre.
- Planificados.
- Visitados.
- Cobertura real.
- Cierre operativo / resolución.
- Distancia GPS estimada.
- Horas de jornada.
- Horas de atención.
- Traslado/espera estimado.
- Eventualidades.
- Clientes con venta / monto vendido cuando exista fuente válida.

No todos deben ocupar tarjetas grandes simultáneamente; priorizar jerarquía visual y resumen ejecutivo.

## 6.3 Tabla de jornadas

Columnas recomendadas:

| Fecha | Vendedor | Estado | Planificados | Visitados | Cobertura | Resueltos | Cierre op. | Inicio | Fin | Jornada | GPS km | Eventualidades |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|---:|

Características:

- ordenable;
- paginada/virtualizada si crece;
- clic en fila abre detalle;
- badges de estado;
- exportación Excel/PDF del filtro actual.

---

# 7. Detalle de jornada

Una jornada individual debe abrirse desde Jornadas/Reportes y reutilizar la lógica existente de Rutas tanto como sea posible.

Secciones:

## 7.1 Resumen

- Vendedor.
- Fecha operativa.
- Estado.
- Inicio.
- Fin.
- Duración.
- Cierre normal/parcial.
- Motivo de cierre.
- Planificados / visitados / resueltos.
- Cobertura / cierre operativo.

## 7.2 Ejecución

- secuencia de paradas;
- estado de cada parada;
- visitas planificadas;
- visitas adicionales;
- no realizadas;
- reprogramadas;
- canceladas.

## 7.3 Mapa

- puntos GPS disponibles;
- inicio/cierre;
- visitas;
- trayectoria estimada entre puntos;
- distancia GPS estimada;
- disclaimer: no representa recorrido vial exacto.

## 7.4 Cronología

Usar `executive_activity_timeline` o fuente equivalente ya existente.

Ejemplo:

```text
08:04 Inicio de jornada
08:37 Llegada Cliente A
09:02 Fin visita Cliente A
10:14 Eventualidad
10:32 Fin eventualidad
17:46 Cierre
```

---

# 8. Rutas — cambios complementarios

Rutas continúa enfocada en ejecutar el día seleccionado.

## 8.1 Banner global de sesión pendiente

Al entrar a Rutas, consultar jornada abierta del Vendedor independientemente de `routeDate`.

Si es de hoy:

- mostrar `Jornada activa hoy` + `Ir a jornada`.

Si es anterior:

- mostrar `Jornada pendiente de cierre del DD/MM/YYYY`;
- resumen de cobertura;
- acción `Revisar y cerrar`;
- no permitir ejecución.

## 8.2 Mensaje al iniciar otra ruta

Sustituir alert genérico por contexto:

```text
No puedes iniciar esta ruta porque tienes una jornada del 26/08/2026 pendiente de cierre.
[Revisar jornada]
```

---

# 9. Inicio — integración mínima

Inicio continúa siendo `Resumen de hoy`.

Agregar solo indicadores accionables:

### Vendedor

- estado de jornada de hoy;
- alerta si existe pendiente de cierre.

### Admin

- activas ahora;
- pendientes de cierre;
- finalizadas hoy;
- cobertura de hoy.

Los indicadores deben enlazar a Jornadas.

No duplicar todo el dashboard de Jornadas en Inicio.

---

# 10. Reportes multiperíodo

## 10.1 Objetivo

Evolucionar la pantalla diaria actual a una herramienta ejecutiva histórica con filtros desplegables.

## 10.2 Selector de período

Modos:

- Día.
- Semana.
- Mes.
- Rango personalizado.

Controles derivados:

- Día -> fecha.
- Semana -> fecha/semana.
- Mes -> año + mes.
- Rango -> desde + hasta.

Defaults:

- Admin: Mes actual puede ser útil para histórico; conservar accesibilidad rápida a Hoy.
- Vendedor/Gestor: período personal con scoping propio.

## 10.3 Filtros

Admin/Supervisor:

- Tipo de colaborador.
- Colaborador.
- Estado de jornada.
- Tipo de cliente.
- Región oficial.
- Provincia.
- Municipio.
- Canal/origen cuando las ventas lo soporten correctamente.

Vendedor/Gestor:

- no permitir escapar el alcance de su identidad/permisos;
- filtros personales de período/estado/tipo válidos.

---

# 11. Matemática de KPI de período

## 11.1 Cobertura

```text
Cobertura período = SUM(visitados_plan) / SUM(planificados)
```

No usar promedio simple de `% cobertura` diarios.

## 11.2 Cierre operativo

```text
Cierre operativo período = SUM(resueltos) / SUM(planificados)
```

## 11.3 Compra/venta

- conteo de clientes/pedidos según fuente semántica correcta;
- monto = suma de monto confirmado;
- no confundir bandera `COMPRO` con venta monetaria si no hay monto confirmado.

## 11.4 Tiempo

- jornada total = suma de ventanas operativas congeladas;
- atención = suma de visitas;
- traslado/espera = suma residual validada;
- promedio visita = atención total / cantidad real de visitas.

## 11.5 Distancia

- sumar `estimated_distance_m` de jornadas válidas;
- mostrar como `Distancia GPS estimada`.

---

# 12. Backend recomendado

Antes de crear nuevas tablas, revisar fuentes existentes.

Preferencia:

1. Derivar estado de jornada desde `route_plans` + `route_sessions`.
2. Crear una vista/RPC de resumen de jornadas por sesión/período si las vistas diarias actuales no permiten agregación segura.
3. Añadir índices solo si el volumen/plan de consulta lo requiere.
4. Añadir guardia backend para impedir ejecución de sesión vencida.

Posible vista conceptual:

```text
executive_route_journeys
- route_plan_id
- route_session_id
- session_date
- employee_id
- employee_name
- employee_role
- persisted_status
- derived_status
- started_at
- ended_at
- closure_mode
- closure_reason_code
- planned_count
- visited_count
- resolved_count
- pending_count
- coverage_pct
- resolution_pct
- route_window_seconds
- visit_seconds
- incident_seconds
- transit_wait_estimated_seconds
- estimated_distance_m
- gps_segments
- incident_count
```

Posible RPC para agregación:

```text
get_journey_report(p_from, p_to, p_employee_id, p_status, ...)
```

No definir la firma final hasta revisar RLS y las vistas existentes.

---

# 13. Seguridad / permisos

- Vendedor: solo sus jornadas/rutas según política existente.
- Gestor: visibilidad relacionada con sus clientes/gestión, sin habilitar ejecución de rutas ajenas.
- Admin/Supervisor: alcance macro según `can()`/permisos actuales.
- No usar parámetros frontend para saltar RLS.
- Exportaciones deben respetar el mismo alcance que la pantalla.

---

# 14. Responsive

Desktop:

- KPIs + tabla + filtros en una sola experiencia.

Tablet:

- filtros reordenados;
- KPI en grid reducido;
- tabla horizontal o tarjetas adaptativas.

Móvil Vendedor:

- prioridad a jornada activa/pendiente;
- acciones grandes;
- historial en tarjetas;
- evitar tablas densas.

---

# 15. Criterios de aceptación

## Bloque temporal

- [ ] Ruta planificada futura no puede iniciarse antes.
- [ ] Ruta pasada no iniciada no puede iniciarse después.
- [ ] Sesión iniciada ayer no permite registrar nueva visita hoy.
- [ ] Sesión iniciada ayer no permite nueva eventualidad operativa hoy.
- [ ] Sesión vencida aparece como `Pendiente de cierre`.
- [ ] Sesión vencida puede revisarse/cerrarse con trazabilidad.
- [ ] Jornada vencida deja de acumular duración indefinida en KPI.

## Vendedor

- [ ] Ve inmediatamente su jornada de hoy.
- [ ] Ve pendientes de cierre sin buscar fechas.
- [ ] Puede abrir historial finalizado.
- [ ] Nunca ve `Continuar` en una jornada vencida.

## Admin

- [ ] Ve KPI globales del período.
- [ ] Filtra por mes.
- [ ] Filtra por Vendedor.
- [ ] Filtra por estado.
- [ ] Puede combinar filtros.
- [ ] Abre detalle individual.
- [ ] Exporta filtro actual.

## Matemática

- [ ] Cobertura multiperíodo usa sumas de numerador/denominador.
- [ ] Resolución multiperíodo usa sumas de numerador/denominador.
- [ ] Distancia y tiempos no duplican jornadas.
- [ ] Inicio/Jornadas/Reportes usan definiciones compatibles.

---

# 16. Estrategia de entrega

1. Checkpoint documental en rama/PR y merge.
2. Rama feature desde `main` actualizado.
3. Auditar vistas/RLS existentes.
4. Implementar guardia temporal backend.
5. Implementar módulo Jornadas.
6. Integrar Rutas/Inicio.
7. Evolucionar Reportes multiperíodo.
8. Build TypeScript/Vite.
9. GitHub Actions.
10. Validación local/preview.
11. Merge a `main`.
12. Usuario hace `Fetch/Pull`, build local y deploy manual.
13. Validación productiva role-by-role.

No desplegar una migración destructiva ni modificar producción sin checkpoint y validación.
