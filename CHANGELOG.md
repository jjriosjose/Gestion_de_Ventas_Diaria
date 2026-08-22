# Changelog

## 0.5.0 — Operación comercial + cobertura de cartera

- Nuevo módulo **Cobertura cartera** para controlar visitas y llamadas obligatorias por cliente sin depender de una ruta planificada.
- Frecuencia configurable por cliente: visitas/mes, llamadas/mes y separación mínima recomendada.
- Asignación masiva de frecuencia usando los filtros territoriales/comerciales activos.
- Nueva **jornada libre** para vendedores: pueden iniciar jornada sin ruta y gestionar directamente clientes de su cartera.
- Workflow de visita corregido: inicio de ruta/salida → llegada al cliente → visita en curso → salida/finalización → siguiente cliente.
- Bloqueo de múltiples visitas abiertas por empleado.
- Una ruta no puede finalizar mientras existan visitas abiertas o paradas pendientes.
- Visitas registran contacto, resultado comercial, próxima acción, seguimiento y fotografías/evidencias.
- Solicitud de showroom desde visita o llamada, asignada automáticamente al V-Gestor homologado del cliente.
- Showroom con estados de validación: pendiente, contactando, confirmada, reprogramada, no confirmada, cancelada, asistió y no asistió.
- Alertas internas para el gestor cuando recibe una solicitud de showroom y para el solicitante cuando cambia el estado.
- Módulo **Llamadas** ampliado con filtros, resultados estructurados, seguimiento y creación de solicitud showroom.
- Agenda preparada para que el gestor valide la intención del cliente antes de convertirla en cita confirmada.
- Edición de clientes con desplegables de Vendedor y Gestor activos.
- Las asignaciones manuales quedan protegidas frente a futuras importaciones y cambios globales de homologación.
- Administración de usuarios confirmada dentro de la app: creación, edición, rol, tipo de empleado, teléfono, clave y activación/desactivación mediante backend seguro.
- Base de datos preparada para cobertura mensual, notificaciones, overrides manuales y analítica posterior.

## 0.4.0 — Planificación territorial + Mapa v2

- Planificación con mapa sincronizado y selección visual de clientes.
- Filtros en cascada: Región → Provincia → Municipio.
- Filtros adicionales por gestor, empresa, GPS, calidad geográfica, disponibilidad y zona guardada.
- La selección de vendedor mantiene el filtro de cartera homologada; Administrador/Supervisor puede incluir clientes externos de forma explícita.
- Selección individual desde mapa/lista, selección por polígono y selección por radio.
- Clustering propio sin dependencias adicionales para manejar cientos de georreferencias.
- Bandeja ordenada de clientes seleccionados y orden aproximado por cercanía.
- Mapa v2 con filtros territoriales/comerciales y visualización de zonas guardadas.
- Creación de zonas por polígono o radio y contador de clientes incluidos.
- Navegación a cada cliente mediante Google Maps.
- Eliminación segura de planificaciones de prueba que nunca hayan iniciado.
- Corrección del ciclo operativo: `VISITAS`, paradas `PENDIENTE` y rutas `ACTIVA`.
- Políticas RLS para que cada empleado pueda ejecutar su propia ruta/paradas manteniendo lectura global para todo el equipo.

## 0.3.0 — Calidad geográfica + TMS ligero

- Nuevo módulo **Calidad geográfica**.
- GPS de visitas alimenta validación territorial sin sobrescritura automática.
- Estados de calidad: SIN_GEO, SIN_VERIFICAR, VERIFICADA, POSIBLE_ERROR.
- Nuevas tablas `administrative_areas`, `geo_verification_events` y `client_visit_windows`.
- RPC PostGIS para resolver Región/Provincia/Municipio/Localidad.
- Flujo administrativo para aprobar/rechazar diferencias territoriales.
- Motivos de excepción para clientes planificados no realizados.
- Ventanas de atención preparadas en base de datos.
- Dashboard muestra cantidad de georreferencias verificadas.
- Exportación de calidad geográfica a XLSX/PDF.
- Documentación de adaptaciones útiles del TMS y configuración geográfica.

## 0.2.0

- Fundación React/TypeScript + Supabase.
- Login por nick, maestros, rutas, captación, visitas, llamadas, agenda, reportes, temas y PWA.
