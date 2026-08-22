# Estado de implementación

## Backend — implementado

- Esquema operacional central en PostgreSQL/Supabase.
- RLS colaborativo: **lectura global autenticada** para todo el equipo y edición controlada por responsabilidad.
- PostGIS y funciones de clientes por territorio.
- Storage privado `karaka-photos`.
- Auditoría y sellado automático de creador/editor.
- Perfiles de los 11 empleados actuales cargados.
- Login por nick, sin exigir correo real al usuario.
- Administración segura de usuarios mediante Edge Function.
- Recuperación de contraseña por WhatsApp OTP preparada pero desactivada hasta configurar proveedor.
- Importación maestra con preview/apply mediante Edge Function.
- Homologación persistente V-CARTERA/G-CARTERA sin modificar el texto original del maestro.
- Vistas `daily_global_summary` y `daily_employee_summary` para dashboards.
- Flujo de calidad geográfica y revisión de diferencias territoriales.
- Estructura PostGIS para división administrativa y ventanas de atención.
- Zonas por polígono y por radio.
- Eliminación segura de planificaciones no iniciadas.
- El empleado asignado puede ejecutar su propia ruta/paradas; el resto del equipo mantiene visibilidad global.

## Frontend — v0.4.0 funcional

- Shell responsive desktop/tablet/móvil.
- Menú lateral flotante y colapsable, drawer móvil y bottom navigation.
- Login, dashboard, clientes, mapas, planificación, rutas, captación, visitas, llamadas, agenda, reportes, administración y configuración.
- Planificación Territorial v2 con mapa y lista sincronizados.
- Filtros en cascada Región → Provincia → Municipio.
- Filtros por vendedor, gestor, empresa, GPS, calidad geográfica, disponibilidad y zona guardada.
- Selección de clientes desde lista, mapa, polígono o radio.
- Clustering de clientes sin dependencia externa adicional.
- Orden inicial aproximado por cercanía.
- Mapa v2 con zonas guardadas, filtros y navegación Google Maps.
- Creación de zonas por polígono/radio con contador de clientes incluidos.
- XLSX/PDF en módulos principales.
- Theme Manager.
- Manifest + Service Worker PWA.

## Estado de datos v0.4.0

- Empleados cargados: **11**.
- Maestro de clientes operativo: **1,997**.
- Clientes con GPS: **927**.
- Clientes sin GPS: **1,070**.
- Primera cuenta Auth validada en operación: administrador `Jrios`.
- Homologación V/G-CARTERA activa; `P/ASIGNAR` se conserva como sin asignar/no aplica cuando corresponde.
- Planificaciones/rutas creadas al preparar v0.4.0: **0**; el módulo queda limpio para la primera prueba operativa.
- La hoja `Hoja2` continúa excluida del proceso de importación.

## Pendientes para cierre operativo

- Validar v0.4.0 con primera planificación de prueba y ejecución en teléfono.
- Cargar polígonos oficiales de Región/Provincia/Municipio para resolución territorial automática por GPS.
- Validar cámara, fotos, GPS y permisos PWA en dispositivos reales.
- Afinar resultados exactos de visita/llamada con uso real.
- Añadir optimización vial real (distancia/tiempo por carretera) sobre el orden aproximado por cercanía.
- Configurar proveedor WhatsApp OTP.
- Restringir CORS de Edge Functions al dominio final.
- Optimizar bundle con lazy loading/code splitting.
- Pruebas E2E y piloto multiusuario.

## Publicación

La aplicación ya fue compilada y desplegada previamente en Cloudflare Workers. Cada actualización de frontend debe pasar por `npm run build` y luego `npm run deploy` desde el repositorio local sincronizado.
