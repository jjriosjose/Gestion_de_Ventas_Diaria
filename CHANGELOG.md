# Changelog

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
