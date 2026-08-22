# Gestion de Ventas Diaria — Almacenes Karaka

Aplicación empresarial nueva para centralizar la gestión comercial de calle y showroom de Almacenes Karaka.

## Arquitectura

- **Frontend:** React + TypeScript + Vite
- **Hosting objetivo:** Cloudflare Workers + Static Assets
- **Backend central:** Supabase
  - PostgreSQL
  - Auth
  - Row Level Security (RLS)
  - Storage privado para fotografías
  - PostGIS
  - Realtime
  - Edge Functions
- **Mapas internos:** Leaflet + OpenStreetMap
- **Navegación vehicular:** Google Maps URLs
- **Exportación:** XLSX y PDF
- **Código fuente:** GitHub

## Módulos incluidos en la fundación v0.3

- Login por nick + contraseña
- Dashboard global y por empleado
- Clientes: consulta, filtros, edición administrativa, navegación Google Maps
- Mapa operativo de clientes
- Creación de zonas de captación dibujando polígonos
- Planificación de rutas de visitas
- Planificación de jornadas de captación por zona
- Inicio/final de ruta con GPS puntual
- Inicio/final de visita con GPS puntual
- Captación de prospectos con GPS y fotografías
- Gestión de llamadas
- Agenda / showroom
- Reportes XLSX / PDF
- Administración de usuarios
- Importación controlada del maestro de cartera
- Temas Karaka / claro / oscuro / ejecutivo y color principal configurable
- Cambio de contraseña del usuario
- Recuperación por WhatsApp OTP preparada (se habilita al configurar Twilio/Twilio Verify)
- PWA básica
- Calidad geográfica de cartera basada en GPS real de visitas
- Revisión administrativa de diferencias Región/Provincia/Municipio
- Estructura de ventanas de atención por cliente
- Excepciones de ruta con motivos configurables

## Regla de maestros

La aplicación solo procesa la hoja `cartera` en el importador de cartera. La administración de usuarios se realiza dentro del sistema. Otras hojas del libro maestro no participan del proceso operacional.

Los valores originales de `V-CARTERA` y `G-CARTERA` se preservan literalmente. No se limpian sufijos o estados durante la carga.

## Supabase

Proyecto remoto configurado: `Gestion de Ventas Diaria`.

Edge Functions desplegadas:

- `login-by-username`
- `master-import`
- `admin-users`
- `request-password-reset`
- `verify-password-reset`

El frontend solo contiene la **publishable key**, que es una credencial pública diseñada para aplicaciones cliente y está protegida por RLS. No existe ninguna `service_role`, secret key ni contraseña de base de datos en este repositorio.

## Primer arranque

1. Publicar el proyecto en Cloudflare.
2. Ingresar con un usuario administrador existente del maestro.
3. Ir a **Administración → Importar cartera**.
4. Seleccionar el maestro XLSX vigente.
5. Revisar la vista previa: nuevos, actualizaciones, sin cambios, GPS y errores.
6. Confirmar la importación.

La base operacional inicia sin histórico previo.

## Desarrollo local

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

Despliegue directo con Wrangler, si se desea:

```bash
npm run deploy
```

Para producción se recomienda Cloudflare Git integration apuntando al repositorio oficial.

## Checklist de publicación

Ver `docs/DEPLOYMENT_CHECKLIST.md` para el orden exacto de GitHub → Cloudflare → primer login → importación de cartera → piloto.

La resolución automática de Región/Provincia/Municipio requiere además cargar los límites territoriales oficiales; ver `docs/GEOGRAPHY_SETUP.md`.
