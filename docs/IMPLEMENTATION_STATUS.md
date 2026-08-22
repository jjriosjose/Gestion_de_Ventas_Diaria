# Estado de implementación

## Backend — implementado

- Esquema operacional central en PostgreSQL.
- RLS colaborativo: lectura global autenticada y edición controlada.
- PostGIS y funciones de clientes cercanos / clientes por territorio.
- Storage privado `karaka-photos`.
- Auditoría y sellado automático de creador/editor.
- Perfiles de los 11 empleados actuales cargados.
- Credenciales iniciales protegidas mediante hash PBKDF2 para activación en primer acceso; no hay claves iniciales en texto plano dentro de tablas públicas.
- Login visible por nick, sin exigir correo real al usuario.
- Administración segura de usuarios mediante Edge Function.
- Recuperación de contraseña por WhatsApp OTP implementada en backend y UI, preparada pero desactivada hasta configurar Twilio/Twilio Verify.
- Importación maestra con preview/apply mediante Edge Function.
- Vistas `daily_global_summary` y `daily_employee_summary` para dashboards.
- Catálogos iniciales de visita, compra, citas, prospectos, fotos y prioridades.
- Flujo de calidad geográfica y revisión de diferencias territoriales.
- Estructura PostGIS para división administrativa y ventanas de atención.
- Excepciones de ruta con motivo obligatorio.

## Frontend — fundación funcional

- Shell responsive desktop/tablet/móvil.
- Menú lateral flotante y colapsable, drawer móvil y bottom navigation.
- Login, dashboard, clientes, mapas, planificación, rutas, captación, visitas, llamadas, agenda, reportes, administración y configuración.
- XLSX/PDF en módulos principales.
- Theme Manager.
- Manifest + Service Worker PWA.

## Pendientes posteriores a la publicación inicial

- Configurar Twilio/Twilio Verify para recuperación de contraseña por WhatsApp OTP.
- Validar en dispositivos reales la cámara, GPS y permisos de PWA.
- Cargar polígonos oficiales de Región/Provincia/Municipio para activar resolución territorial automática.
- Afinar reglas exactas de los resultados de visita/llamada con uso real.
- Añadir optimización avanzada del orden de rutas y análisis territorial H3.
- Restringir CORS de Edge Functions al dominio final una vez exista.
- Pruebas E2E y piloto con usuarios.

## Estado de datos al cierre de la fundación v0.3

- Perfiles de empleados cargados: **11**.
- Cuentas Supabase Auth enlazadas todavía: **0 de 11**; se crean de forma segura en el primer ingreso de cada empleado.
- Clientes cargados en la base operacional: **0**; la primera carga oficial queda intencionalmente pendiente para realizarse desde **Administración → Importar cartera** con vista previa antes de aplicar.
- Catálogos de operación iniciales: **41** opciones.
- Recuperación WhatsApp: código desplegado, **desactivada** hasta configurar Twilio/Twilio Verify.
- La hoja `Hoja2` se mantiene fuera del proceso y no debe cargarse ni publicarse.

## Limitaciones de validación en este entorno

El entorno local utilizado para generar esta fundación no tiene resolución DNS/salida de red para instalar dependencias npm ni invocar directamente endpoints externos. Por esa razón:

- no se ejecutó un `npm install` / build final dentro de este contenedor;
- no se hizo una prueba E2E contra el dominio Supabase desde el contenedor;
- las Edge Functions sí quedaron desplegadas y activas mediante la conexión oficial de Supabase;
- el primer build real debe ejecutarse al publicar en GitHub/Cloudflare o en un equipo con acceso a Internet.
