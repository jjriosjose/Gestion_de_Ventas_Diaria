# Changelog

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
