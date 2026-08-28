# PROJECT_HANDOFF.md
# Gestión de Ventas Diaria — Almacenes Karaka

> **Documento maestro de continuidad del proyecto.** Leer primero al retomar el desarrollo en otro chat o después de una pausa. GitHub `main`, Supabase y Cloudflare son la fuente de verdad si existiera una discrepancia con conversaciones anteriores.
>
> **Nunca incluir secretos, contraseñas, tokens, service keys ni credenciales sensibles.**

---

# 0. ESTADO ACTUAL — LEER PRIMERO

## Producción actual

- Aplicación: **Gestión de Ventas Diaria — Almacenes Karaka**.
- Repositorio: `jjriosjose/Gestion_de_Ventas_Diaria`.
- Rama estable: `main`.
- Versión desplegada y validada: **V0.6.5-beta.8**.
- `package.json`: `0.6.5-beta.8`.
- Commit de aplicación desplegado: `ee39f568bcab1d878d8795ce2b91f1b36ead2538`.
- URL productiva: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Cloudflare Current Version ID confirmado para beta.8: `149a6ff7-2bfb-46ff-9968-d88c6f61d182`.
- Deploy productivo: manual desde Windows mediante `npm run deploy` / Wrangler.
- Build local beta.8: **SUCCESS**.
- Build de GitHub Actions previo al merge: **SUCCESS**.

### Regla de continuidad

Un commit documental posterior al commit de aplicación no significa que Cloudflare ejecute ese commit. Antes de asumir la versión productiva, comprobar:

1. `package.json` en `main`.
2. commit de aplicación más reciente.
3. último deploy confirmado por Wrangler/Cloudflare.
4. comportamiento real en la URL productiva.

---

# 1. BACKEND / INFRAESTRUCTURA

## Supabase

- Backend central multiusuario: PostgreSQL + Auth + RLS + Storage + PostGIS + Edge Functions.
- No usar `localStorage` como fuente de persistencia operacional compartida.
- Las rutas, visitas, cierres, captaciones, asignaciones y cambios operativos deben persistir centralmente.
- Proyecto Supabase usado por la app: `ccvzosnhxitfeochnflr`.
- Las migraciones del repositorio son el historial técnico, pero **no hacer replay ciego** suponiendo que el ledger remoto y los archivos son 1:1.

Entidades operativas relevantes para el bloque actual:

- `route_plans`: planificación de rutas/jornadas.
- `route_stops`: paradas planificadas y su orden.
- `route_sessions`: ejecución real de la jornada.
- `visits`: visitas planificadas y adicionales.
- `operational_incidents`: eventualidades de jornada.
- vistas `executive_*`: fuentes ejecutivas de Inicio/Reportes/KPI.

## Cloudflare

- Producción servida por Cloudflare Workers.
- URL actual: `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`.
- Flujo probado: `npm run build` -> `npm run deploy`.
- No hacer deploy hasta que la rama correspondiente compile y haya sido revisada.

---

# 2. ESTADO FUNCIONAL VALIDADO HASTA V0.6.5-beta.8

## 2.1 Login

La pantalla de ingreso fue rediseñada con presentación comercial premium:

- propuesta visual aprobada por el usuario;
- panel de valor del producto;
- accesos de usuario/contraseña;
- recuperación administrada;
- responsive;
- versión visible.

La autenticación existente se mantuvo funcional después del rediseño.

## 2.2 Mapa territorial

El módulo Mapa fue estabilizado y validado en producción.

### División territorial oficial

- Región, Provincia, Municipio y Distrito Municipal funcionan de forma individual y en cascada.
- Se puede seleccionar Provincia sin elegir Región previamente.
- Se puede seleccionar Municipio sin elegir Provincia previamente.
- El sistema reconstruye automáticamente la jerarquía territorial superior.
- El mapa enfoca y resalta correctamente la geometría filtrada.
- Funciona tanto en Mapa, Planificación y Captación donde se reutiliza la cartografía oficial.

### Filtros y visualización

- `Maestro comercial` y `División territorial oficial` se mantienen conceptualmente separados.
- Los límites oficiales se dibujan sobre Leaflet/OpenStreetMap.
- Al filtrar territorio se resalta la zona correspondiente.
- Se corrigieron regresiones anteriores donde Planificación/Captación no enfocaban o resaltaban correctamente.

### Listado de clientes

Mapa incluye un listado desplegable inferior que responde a los filtros activos.

El listado permite revisar los clientes filtrados y ubicar un cliente en mapa sin perder el contexto territorial.

### Análisis territorial

Mapa incluye panel **Análisis territorial** basado en la **División territorial oficial**.

Permite distribución por:

- Región.
- Provincia.
- Municipio.
- Distrito.

Muestra cantidades y porcentajes sobre el conjunto filtrado. El análisis respeta los filtros actuales del mapa y permite volver a `Todo RD`.

## 2.3 Planificación

Planificación crea únicamente rutas de visita. La asignación de Captación vive en el módulo Captación y no debe duplicarse en Planificación.

### Selección territorial y comercial

- filtros por Vendedor, tipo, territorio, gestor, empresa, GPS, coherencia y otros criterios;
- selección mediante lista, mapa, polígono o radio;
- el perímetro siempre opera sobre los clientes elegibles por los filtros activos;
- las zonas guardadas sirven como criterio/filtro, no sustituyen la selección de ruta.

### V0.6.5-beta.8 — Preparación profesional de la ruta

Se validó en producción el nuevo panel inferior **Preparación de la ruta**.

Dos conjuntos separados:

- **Disponibles**: clientes candidatos según filtros.
- **Seleccionados**: clientes que realmente integrarán `route_stops`.

Comportamiento validado:

- selección por radio/polígono actualiza `selected`;
- el panel cambia a seleccionados;
- muestra cantidad seleccionada, dentro del filtro actual y fuera del filtro actual;
- cambiar filtros no elimina silenciosamente la selección existente;
- permite `Ubicar`, `Quitar`, añadir disponibles, limpiar y ordenar por cercanía;
- `Crear planificación` reutiliza la misma función de creación y guarda exactamente la selección final;
- el orden seleccionado se conserva como `stop_order`.

Prueba real beta.8 validada:

- 16 clientes seleccionados;
- 16 con GPS;
- 0 fuera de filtro;
- ruta creada correctamente;
- los 16 clientes aparecen posteriormente en Rutas para el Vendedor asignado.

## 2.4 Rutas

Rutas ya incluye:

- plan vs ejecución;
- mapa y secuencia;
- cobertura real;
- visitados / en visita / pendientes / no realizados / reprogramados / resueltos;
- inicio de ruta;
- cierre de jornada;
- cierre parcial con motivo;
- eventualidades;
- GPS de inicio/cierre cuando está disponible;
- exportación Excel/PDF;
- visibilidad por rol.

### Regla ya existente

Una ruta planificada solo puede iniciarse en su `route_date`. `start()` valida que `selected.route_date === today()`.

### Limitación descubierta y pendiente de corregir

Una `route_session` ya iniciada y que quedó sin `ended_at` continúa siendo técnicamente `ACTIVA` en días posteriores. El Vendedor no puede iniciar otra ruta porque existe una sesión abierta, pero la UX actual puede obligarlo a buscar fechas anteriores para entender qué jornada quedó abierta.

**Esta limitación es el siguiente bloque prioritario y NO debe mantenerse como comportamiento final.**

## 2.5 Captación

Captación quedó centralizada en su propio módulo.

- Admin/Supervisor asigna tareas territoriales de captación.
- El Vendedor ve sus tareas.
- Las tareas usan División territorial oficial.
- Captación libre existe para Vendedor cuando no tiene una tarea activa aplicable.
- Al registrar un prospecto se captura GPS y contexto territorial.
- Se corrigió el caso de prospectos guardados `sin zona` mediante resolución contextual.

## 2.6 Inicio / Dashboard

Inicio sigue siendo el **centro de operaciones de hoy**, no un reporte histórico.

Métricas existentes incluyen, según rol:

- Clientes.
- Planificados.
- Visitados.
- Distancia GPS estimada.
- Clientes que compraron / monto vendido cuando exista información.
- Llamadas.
- Citas.
- Captaciones.
- Rutas cerradas.
- ranking de Vendedores y Gestores.

Mantener Inicio orientado a **hoy**; no convertirlo en histórico mensual.

## 2.7 Reportes

Reportes ya posee vista ejecutiva diaria, detalle y cronología basada en fuentes `executive_*`.

Limitación actual: el diseño está orientado principalmente a una sola fecha (`day = date`).

La próxima evolución debe admitir filtros por período y agregación matemática correcta, sin promediar porcentajes diarios de manera ingenua.

---

# 3. REGLAS DE NEGOCIO CONSOLIDADAS

## 3.1 Cobertura vs cierre operativo

- **Cobertura real** = `visitados / planificados`.
- **Resueltos** = paradas con resultado final operativo.
- **Cierre operativo / Resolución** = `resueltos / planificados`.

Nunca interpretar resolución 100% como cobertura 100%.

## 3.2 Jornada y tiempos

- Jornada = inicio de `route_session` hasta cierre efectivo.
- Atención = suma del tiempo de visitas.
- Eventualidades = tiempo de incidencias.
- Traslado/espera estimado = tiempo residual no explicado por atención/eventualidad.
- Distancia GPS estimada = distancia geodésica entre eventos GPS disponibles; no es odómetro ni ruta vial exacta.

## 3.3 Una jornada pertenece a un solo día operativo — NUEVA DECISIÓN IRREVERSIBLE

**Decisión confirmada por el usuario el 27/08/2026:**

> Si una ruta/jornada no se culminó en su fecha correspondiente, NO se puede continuar ejecutando en días posteriores.

Regla objetivo:

- Una jornada puede registrar ejecución solamente cuando `session_date === fecha local operativa actual`.
- A partir del día siguiente queda **VENCIDA / PENDIENTE DE CIERRE**.
- En una jornada vencida no se permitirán nuevas visitas, reprogramaciones operativas, eventualidades nuevas ni continuación del recorrido.
- Debe conservarse historial íntegro de lo realizado ese día.
- El Vendedor debe poder **revisar y cerrar**, pero nunca `Continuar jornada` de fecha anterior.
- Administración/Supervisión debe poder detectar y gestionar jornadas vencidas.
- Nunca cerrar automáticamente una jornada de forma silenciosa sin dejar trazabilidad.
- Las métricas no deben seguir acumulando horas indefinidamente después de cambiar el día operativo.

Esta regla debe quedar protegida **en frontend y backend**, no solo en la interfaz.

---

# 4. SIGUIENTE BLOQUE PRIORITARIO — JORNADAS + REPORTERÍA MULTIPERÍODO

Documento funcional detallado: `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.

Objetivo: transformar el seguimiento actual de rutas en un sistema profesional de control de jornadas sin duplicar Rutas ni Reportes.

## 4.1 Nuevo módulo: Jornadas

### Vendedor — Mis jornadas

Debe mostrar:

- Jornada de hoy activa, si existe.
- Planificaciones de hoy/futuras según permisos.
- **Pendientes de cierre** de días anteriores.
- Finalizadas.

Una jornada vencida:

- se identifica de forma visible;
- muestra cobertura y pendientes;
- permite revisar/cerrar;
- **no permite continuar ejecución**.

### Admin/Supervisor — Control de jornadas

Debe funcionar como centro operacional macro:

- planificadas;
- iniciadas;
- activas hoy;
- finalizadas;
- finalizadas parciales;
- vencidas pendientes de cierre;
- cobertura agregada;
- cierre operativo;
- horas de jornada;
- atención;
- traslado/espera;
- distancia GPS;
- eventualidades;
- ventas/compras cuando corresponda.

Debe incluir tabla detallada y apertura de una jornada individual.

## 4.2 Alertas y acceso

Una jornada vencida no debe descubrirse solamente al intentar iniciar otra ruta.

Añadir visibilidad mediante:

- módulo Jornadas;
- banner contextual en Rutas;
- resumen/alerta en Inicio cuando aplique;
- campana operativa si la arquitectura actual lo permite sin duplicar lógica.

## 4.3 Reportes administrativos multidimensionales

Reportes debe evolucionar a filtros desplegables combinables.

Filtros objetivo:

- Período: Día / Semana / Mes / Rango personalizado.
- Año.
- Mes.
- Desde / Hasta.
- Tipo de colaborador: Vendedor / Gestor / Todos cuando sea válido.
- Colaborador específico.
- Estado de jornada.
- Tipo de cliente.
- Región oficial.
- Provincia.
- Municipio.
- Otros criterios solo si agregan valor real y existen datos confiables.

### Regla matemática

No promediar porcentajes diarios directamente.

Ejemplo:

- Día 1: 1/2 = 50%.
- Día 2: 90/100 = 90%.
- Cobertura real del período = `91 / 102 = 89.2%`, no 70%.

Los KPI de período deben calcularse con numeradores/denominadores agregados reales.

## 4.4 Separación conceptual de módulos

```text
PLANIFICACIÓN
  crea el plan
       ↓
RUTAS
  ejecuta la jornada del día
       ↓
JORNADAS
  controla el ciclo de vida operacional
       ↓
REPORTES
  analiza historia y desempeño
```

Inicio sigue respondiendo: **¿Qué está ocurriendo hoy?**

---

# 5. CRITERIOS DE CALIDAD PARA EL DESARROLLO SIGUIENTE

1. No romper beta.8 ni los mapas ya estabilizados.
2. No duplicar fórmulas entre Inicio, Jornadas y Reportes.
3. Preferir vistas/RPC en Supabase para agregaciones complejas y consistentes.
4. Mantener RLS y scoping por rol.
5. Proteger reglas críticas también en backend.
6. No falsear cobertura al cerrar jornadas.
7. No permitir ejecución de jornadas vencidas.
8. No hacer deploy automático sin build/validación.
9. Evitar crear tablas nuevas si el modelo actual ya permite resolver el problema con seguridad; crear migración solo cuando sea necesario.
10. Diseñar responsive para escritorio, tablet y móvil.

---

# 6. PROTOCOLO PARA UN NUEVO CHAT

Mensaje recomendado:

> **“Continúa el proyecto Gestión de Ventas Diaria. Revisa primero `PROJECT_HANDOFF.md` del repositorio `jjriosjose/Gestion_de_Ventas_Diaria`, luego `docs/REQUIREMENTS_STATUS.md`, `docs/V065_FUNCTIONAL_DESIGN.md` y `docs/V065C_JORNADAS_REPORTES_DESIGN.md`. Verifica después el estado real de GitHub `main`, Supabase y Cloudflare. No asumas que algo existe solo porque aparece en documentación. Explica el estado real antes de modificar código.”**

Orden obligatorio para reconstruir continuidad:

1. `PROJECT_HANDOFF.md`.
2. `docs/REQUIREMENTS_STATUS.md`.
3. `docs/V065_FUNCTIONAL_DESIGN.md`.
4. `docs/V065C_JORNADAS_REPORTES_DESIGN.md`.
5. GitHub `main` y `package.json`.
6. últimas migraciones Supabase y estado remoto cuando sea necesario.
7. versión/deploy real en Cloudflare.
8. recién entonces modificar código.

---

# 7. CHECKPOINT DE ESTA ACTUALIZACIÓN DOCUMENTAL

Fecha de decisión: **27/08/2026**.

Baseline productivo antes del nuevo desarrollo:

- **V0.6.5-beta.8**.
- commit desplegado `ee39f568bcab1d878d8795ce2b91f1b36ead2538`.
- Cloudflare Version ID `149a6ff7-2bfb-46ff-9968-d88c6f61d182`.
- Mapas territoriales validados.
- Captación validada.
- Planificación beta.8 validada end-to-end hasta aparición de los 16 clientes en Rutas.
- Próximo trabajo: **Jornadas + bloqueo temporal fuerte + Reportes multiperíodo**.

Este documento reemplaza como checkpoint activo el antiguo estado V0.6.4. Para historia detallada anterior consultar Git/GitHub y documentos de versiones previas.
