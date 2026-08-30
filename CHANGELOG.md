# Changelog

Historial funcional de **Gestión de Ventas Diaria — Almacenes Karaka**.

> La fuente de verdad técnica sigue siendo GitHub + Supabase + el estado productivo real. Este archivo resume releases, no sustituye `PROJECT_HANDOFF.md`.

---

## 0.6.5-beta.12.2.6 — Route Ordering UX

- Planificación sustituye el botón ambiguo `Ordenar` por `Cercanos primero` y `Lejanos primero`.
- El sentido inverso recorre la misma secuencia geográfica optimizada en orden contrario; no alterna hacia el cliente más lejano en cada paso.
- El origen predeterminado pasa a ser el centro geográfico de la selección, evitando depender silenciosamente de la ubicación física del administrador.
- Opción explícita `Mi ubicación actual` con lectura ligera, espera máxima de 2.5 s, cache de 2 minutos y fallback al centro de la selección.
- Feedback visible mientras se ordena y bloqueo de acciones concurrentes.
- Numeración de paradas `01..N` visible en lista y mapa durante la preparación.
- Clientes seleccionados permanecen fuera de clusters para preservar la secuencia visual.
- Clientes sin GPS quedan al final y el resultado lo informa.
- `route_stops.stop_order` conserva exactamente el orden aprobado en Planificación.
- QA manual validado con 11 clientes: secuencia, sentido inverso y persistencia de orden en Rutas.
- Sin migraciones Supabase, SQL ni cambios a Tracking/Jornadas/Visitas.

## 0.6.4 — Cierre de jornada + distancia GPS estimada

- Cierre transaccional de ruta/jornada desde backend.
- Cierre normal cuando no quedan pendientes.
- Cierre parcial con motivo obligatorio cuando quedan paradas pendientes.
- Pendientes pasan a `NO_VISITADO` o `REPROGRAMADO` según el motivo; nunca se convierten en visitados.
- Guarda `ended_at`, GPS final, `closure_mode`, motivo global, notas y cantidad de pendientes cerrados.
- Bloquea cierre con visita abierta o eventualidad activa.
- Congela la jornada después del cierre.
- Corrige reprogramación para conservar estado `REPROGRAMADO`.
- KPI de resueltos/cierre operativo reconoce estados terminales correctamente.
- Banner visible de jornada cerrada.
- Nueva vista `executive_daily_route_metrics` con distancia geodésica estimada por puntos GPS operativos.
- Distancia integrada en Inicio, Reportes, Excel y PDF.
- Visitas ligadas a ruta se alinean con `route_sessions.session_date` como día operativo.
- Inicio y Reportes quedan coherentes con Rutas cuando una operación cruza medianoche.
- PDF personal de vendedor actualizado con jornada, cobertura, resolución, atención, traslado/espera, distancia y tramos GPS.
- Service Worker productivo deja de controlar pruebas en localhost/127.0.0.1.
- Versión visible `0.6.4`; caché PWA `gvd-shell-v064`.

## 0.6.3 — Precisión de métricas y PDF ejecutivo

- Versión visible en login, sidebar y PDF.
- Separa **Cobertura real** de **Resolución de ruta**.
- Cobertura real = visitados / planificados.
- Resolución = paradas con resultado / planificados.
- Jornada de ruta explícita.
- Atención total a clientes y promedio por visita.
- Traslado/espera estimado rotulado como residual, no conducción pura.
- Dashboard y Reportes alineados con la misma semántica.
- PDF Ejecutivo rediseñado con métricas interpretables y vendedores/gestores separados.
- Versión `0.6.3`; caché PWA V063.

## 0.6.2 — Rediseño ejecutivo y correcciones UX

- Corrige superposición de Leaflet sobre modales.
- Login con placeholder neutro.
- Inicio rediseñado con KPIs, rankings y gráficos separados por función.
- Vendedores: planificados, visitados, compras y ventas.
- Gestores: llamadas, contactos, showroom, compras y ventas.
- Reporte Ejecutivo con KPI/medidores y tablas por función.
- Nuevos PDF corporativos para Inicio y Reporte Ejecutivo con identidad Karaka.
- Versión `0.6.2`; caché PWA V062.

## 0.6.1 — Estabilización operacional y PDF gerencial

- PDF gerencial legible.
- Dashboard migrado a vistas ejecutivas e integración de showroom, compras y ventas.
- Conserva solicitudes showroom aunque el cliente no tenga Gestor asignado.
- Escalamiento a Dirección/Administración y reasignación al asignar Gestor.
- Impide iniciar ruta en fecha distinta a la planificada.
- Impide registrar llegada anticipada mediante el flujo normal de una cita futura.
- Fecha local `America/Santo_Domingo` para jornada libre.
- Filtro común `CADENA / REGULAR` en módulos operativos principales.
- Rendimiento de rutas para Administración y Gestores.
- Versión `0.6.1`; caché PWA renovada.

## 0.6.0 — Inteligencia Operativa Ejecutiva

- Reporte Ejecutivo Diario para Dirección.
- Vistas ejecutivas por empleado y globales.
- Cronología operativa diaria.
- Horas/tiempos de visitas, llamadas, showroom y eventualidades.
- Compras y ventas de calle + showroom.
- Showroom registra quién fue asignado y quién atendió realmente.
- Resultado comercial de visita obligatorio; monto de compra opcional.
- Gestores pueden consultar sus clientes dentro de rutas de vendedores.
- Vendedor ve Gestor responsable por parada.
- Eventualidades de jornada con tipo, impacto, inicio/fin, GPS y evidencia opcional.
- Eventualidades separadas del tiempo de atención y del traslado/espera estimado.
- Versión `0.6.0`.

---

## 0.5.12 — Navegación Google Maps por zona territorial

- Captación abre la división oficial por nombre en Google Maps para evitar interpretar el centro geométrico como un POI incorrecto.
- Mantiene acción adicional para navegar al centro de la zona.
- Mantiene mapa interno y prospecto asociado a tarea.

## 0.5.11 — Navegación visible a zona de captación

- Abrir tarea centra la división oficial asignada.
- Acción visible para ir a la zona en Google Maps.
- Prospecto continúa preasociado a tarea activa.

## 0.5.10 — Flujo operativo de captación por rol

- Rutas queda exclusiva para planes `VISITAS`.
- Vendedor dispone de “Mis tareas de captación”.
- Apertura directa de división oficial asignada.
- Registro de prospecto desde tarea activa.
- Vendedor ve sus prospectos recientes; administración conserva vista global.
- Respeta lunes-viernes y sábado opcional.
- Reconstruye jerarquía Región → Provincia → Municipio → Distrito desde área oficial.

## 0.5.9 — Cierre operativo inicial para rutas, captación y recepción

- Oculta valores maestros inválidos en filtros sin modificar clientes.
- Rutas con secuencia numerada, línea de orden, estados y lista sincronizada.
- Captación con vendedor + división oficial + rango de fechas + objetivo + sábado opcional.
- Prospectos vinculados a tarea de captación.
- Recepción con gestor opcional y separación visitante/prospecto.
- Recuperación WhatsApp oculta mientras el canal esté deshabilitado.
- PWA/versionado actualizado.

## 0.5.8 — UX, filtros territoriales y permisos por perfil

- Menú lateral y controles de vista corregidos.
- Clientes con filtros Vendedor → Gestor en cascada.
- Mapa y Planificación con territorio maestro vs división oficial.
- Región → Provincia → Municipio → Distrito Municipal.
- Uso de las 593 áreas oficiales.
- Captación con referencia territorial oficial.
- Perfiles base y `permission_overrides`.
- Administración de usuarios reservada a Administradores.

## 0.5.7 — Iconografía PWA

- Icono Karaka instalable y maskable.
- Manifest, favicon, nombre e identidad de la PWA corregidos.
- Renovación de caché shell.

## 0.5.6 — Carga completa de clientes

- Cargador paginado compartido para superar el límite práctico de 1,000 filas.
- Mapa carga la cartera completa.
- Planificación pagina carteras individuales y vista global.

## 0.5.5 — Coherencia territorial en Mapa y Planificación

- Filtros maestro = coordenada, maestro ≠ coordenada, sin GPS, fuera de división y verificado por visita.
- Contadores de diferencias territoriales.
- Marcadores diferenciados y popups con maestro/detectado.
- Diagnóstico territorial visible en Planificación.
- Carga paginada de evaluaciones geográficas.

## 0.5.4 — Vistas de mapa y límites oficiales

- Vistas calles/claro/oscuro/alto contraste.
- Overlay opcional de límites oficiales.
- Corrección posterior de provincias con fuente oficial/IDERD.
- Controles de mapa más compactos y responsive.

## 0.5.3 — CRM, Agenda y Recepción optimizados

- Corrige relaciones de empleados en citas showroom.
- Llamadas se convierte en CRM de cartera con contexto de llamadas/visitas/showroom.
- Registro inline de llamadas.
- Recepción con búsqueda/autocompletado de clientes.
- Citas confirmadas de hoy y próximos días visibles.

## 0.5.2 — Showroom medible y recepción

- Ciclo completo de showroom: validación, confirmación, reprogramación, llegada, atención, compra/no compra y salida.
- KPIs del embudo y recordatorios.
- Presencia física separada de atención comercial.
- Recepción preparada para citas y walk-ins.

## 0.5.1 — Visitas encadenadas, radio editable y CRM

- Radio de selección movible/redimensionable.
- Protección de una sola visita abierta por empleado.
- Orden libre de paradas.
- Fotos/evidencias y solicitud showroom en cierre de visita.
- CRM de llamadas con filtros Vendedor/Gestor, resultados y próxima acción.
- Correcciones de caché/PWA.

## 0.5.0 — Operación comercial + cobertura de cartera

- Nuevo módulo **Cobertura cartera**.
- Frecuencia configurable por cliente: visitas/mes, llamadas/mes y separación mínima.
- Frecuencia masiva sobre clientes filtrados.
- Jornada libre para vendedores sin ruta planificada.
- Flujo salida → llegada → visita → salida.
- Bloqueo de múltiples visitas abiertas.
- Visitas con resultado, siguiente acción, seguimiento y evidencias.
- Solicitud showroom desde visita o llamada.
- Agenda con validación previa a cita.
- Edición de cliente con Vendedor/Gestor y protección de asignaciones manuales.
- Administración segura de usuarios mediante Edge Function.

---

## 0.4.0 — Planificación territorial + Mapa v2

- Planificación con mapa sincronizado y selección visual.
- Filtros territoriales y comerciales.
- Polígono, radio, clustering y orden aproximado por cercanía.
- Zonas guardadas y navegación Google Maps.
- Eliminación segura de planificaciones no iniciadas.
- RLS para ejecución de rutas asignadas.

## 0.3.0 — Calidad geográfica + TMS ligero

- Módulo Calidad geográfica.
- GPS de visitas alimenta validación territorial sin sobrescritura automática.
- PostGIS y áreas administrativas.
- Revisión de diferencias territoriales.
- Excepciones de ruta y ventanas de atención preparadas.

## 0.2.0 — Fundación

- React/TypeScript + Supabase.
- Login por nick.
- Clientes, rutas, captación, visitas, llamadas, agenda, reportes, temas y PWA.
