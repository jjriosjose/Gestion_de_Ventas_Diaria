# Gestión de Ventas Diaria — Almacenes Karaka

Aplicación empresarial multiusuario para centralizar la operación comercial de calle, CRM, showroom, captación, planificación territorial, calidad geográfica y reportería ejecutiva de Almacenes Karaka.

**Versión de aplicación auditada:** `0.6.4`  
**Producción:** `https://gestion-de-ventas-diaria.jjriosjose.workers.dev`  
**Backend:** Supabase  
**Hosting:** Cloudflare Workers + Static Assets

> Para continuidad de desarrollo leer primero `PROJECT_HANDOFF.md` y luego `docs/REQUIREMENTS_STATUS.md`. Los servicios reales prevalecen sobre la documentación si existiera una discrepancia.

---

## Arquitectura

### Frontend

- React 19
- TypeScript
- Vite 7
- React Router
- Leaflet + OpenStreetMap
- Recharts
- ExcelJS
- jsPDF / jspdf-autotable

### Backend central

Supabase:

- PostgreSQL
- Auth
- Row Level Security (RLS)
- Storage privado para fotografías
- PostGIS
- Realtime
- Edge Functions

### Infraestructura

- GitHub como fuente de código.
- Cloudflare Workers + Static Assets para producción.
- Google Maps mediante URLs para navegación externa cuando corresponde.
- PWA con Service Worker en producción.

La persistencia operacional compartida vive en Supabase. No se debe utilizar `localStorage` como fuente de verdad para rutas, visitas, llamadas, agenda, clientes, asignaciones ni resultados multiusuario.

---

## Módulos actuales — mismo orden de la aplicación

### Operación

1. **Inicio** — dashboard ejecutivo, KPIs, distancia GPS estimada, rankings y gráficos separados por Vendedores/Gestores.
2. **Clientes** — maestro, filtros, responsables, tipo CADENA/REGULAR, GPS y edición autorizada.
3. **Mapa** — cartera completa, territorio maestro/oficial, calidad geográfica, zonas y navegación.
4. **Planificación** — rutas de visitas y captación, filtros territoriales/comerciales, mapa, polígono/radio y fecha operativa.
5. **Rutas** — secuencia, GPS puntual, visitas, eventualidades, cierre normal/parcial, cobertura real y cierre operativo.
6. **Captación** — tareas territoriales por vendedor, objetivos, GPS, fotografías y prospectos.

### Gestión

7. **Cobertura cartera** — frecuencia mensual de visitas/llamadas y jornada libre. La separación `actividad vs cumplimiento de meta` está priorizada para la siguiente iteración.
8. **Visitas** — llegada/salida GPS, resultado comercial, compra/no compra/pendiente, evidencia y seguimiento.
9. **Llamadas** — CRM, resultados, contacto, seguimiento y solicitudes showroom.
10. **Agenda / Showroom** — intención, validación, confirmación/reprogramación, atención y resultado comercial.
11. **Recepción** — citas, walk-ins, llegada física y relación con showroom.

### Inteligencia

12. **Reportes** — reporte ejecutivo/personal, jornada, cobertura, cierre operativo, atención, traslado/espera, distancia GPS, cronología, Excel/PDF.
13. **Calidad geográfica** — diagnóstico maestro/coordenada/GPS real y revisión administrativa.

### Sistema

14. **Administración** — importación de cartera, homologación y usuarios/permisos.
15. **Configuración** — temas, color principal, contraseña y perfil.

---

## Estado de datos auditado

Snapshot del 2026-08-25:

- Clientes: **1,997**.
- Empleados activos: **12**.
- CADENA: **135**.
- REGULAR: **1,862**.
- Clientes con GPS: **929**.
- Clientes sin GPS: **1,068**.
- Áreas administrativas oficiales activas: **593**.
  - 10 regiones.
  - 32 provincias.
  - 158 municipios.
  - 393 distritos municipales.

Los conteos de rutas, visitas, llamadas, citas y showroom son operacionales y cambian diariamente.

---

## Reglas de negocio importantes

- La aplicación procesa únicamente la hoja `cartera` en el importador maestro.
- Los valores originales de `V-CARTERA` y `G-CARTERA` se preservan literalmente.
- Las asignaciones manuales protegidas no deben ser revertidas por una reimportación automática.
- Ninguna discrepancia GPS corrige automáticamente Región/Provincia/Municipio o coordenadas del cliente.
- GPS es puntual en eventos; no existe tracking continuo obligatorio.
- Solo puede existir una visita abierta por empleado.
- Una ruta planificada no puede iniciarse fuera de su fecha programada.
- Una ruta no puede cerrarse con una visita abierta o eventualidad activa.
- V0.6.4 permite cierre parcial con motivo obligatorio cuando quedan pendientes.
- Cerrar jornada nunca convierte pendientes en visitas realizadas.
- `REPROGRAMADO` conserva su estado propio.
- **Cobertura real** = visitados / planificados.
- **Resolución / cierre operativo** = paradas con resultado / planificados.
- **Traslado / espera** es un residual estimado, no conducción pura.
- **Distancia GPS estimada** es geodésica entre puntos operativos disponibles, no odómetro ni distancia vial exacta.
- Visitas ligadas a ruta se reportan por `route_sessions.session_date` como día operativo.

---

## Supabase

Proyecto productivo: `ccvzosnhxitfeochnflr`.

Edge Functions históricamente relevantes:

- `login-by-username`
- `master-import`
- `admin-users`
- `request-password-reset`
- `verify-password-reset`

El frontend solo debe utilizar credenciales públicas apropiadas para cliente. No guardar `service_role`, secretos, contraseñas de base de datos ni tokens privados en el repositorio.

La recuperación automática por WhatsApp/OTP permanece deshabilitada hasta configurar y validar un proveedor compatible.

---

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Ejecutar Vite:

```bash
npm run dev
```

Para una prueba aislada en Windows también puede utilizarse:

```bash
npm run dev -- --host 127.0.0.1
```

V0.6.4 evita que el Service Worker productivo controle `localhost`/`127.0.0.1`; además limpia registros/cachés `gvd-shell-*` de desarrollo cuando corresponde.

Build:

```bash
npm run build
```

El warning de chunks mayores a 500 kB no bloquea actualmente el build; el code splitting queda como mejora técnica.

---

## Despliegue productivo actual

El flujo confirmado de producción es manual con Wrangler desde el repositorio local sincronizado:

```bash
npm run build
npm run deploy
```

La URL productiva actual es:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

No asumir que un merge a `main` desplegó automáticamente. Un release solo se considera productivo después de confirmar la salida de Wrangler/Cloudflare y registrar el Version ID.

Ver:

- `docs/DEPLOYMENT_CHECKLIST.md`
- `docs/CLOUDFLARE_DEPLOY.md`

---

## Documentación de continuidad

- `PROJECT_HANDOFF.md` — memoria maestra: producción, arquitectura, reglas, releases, datos de regresión y protocolo de continuidad.
- `docs/REQUIREMENTS_STATUS.md` — matriz viva de terminado/parcial/pendiente y roadmap.
- `docs/IMPLEMENTATION_STATUS.md` — estado técnico/funcional por módulo.
- `CHANGELOG.md` — historia de releases.
- `docs/GEOGRAPHY_SETUP.md` — estado de cartografía y reglas geográficas.
- `docs/TMS_ADAPTATIONS.md` — conceptos TMS adaptados deliberadamente a gestión comercial.

---

## Próxima iteración recomendada — V0.6.5

Prioridad funcional:

1. Cobertura cartera: separar **Gestionado** de **Cumplimiento de meta**.
2. Administración: usuarios conectados / historial y duración de sesiones.
3. Refinamiento de productividad: % atención, % traslado/espera y visitas por hora con interpretación de calidad.
4. Mejorar claridad de `Resolución` como `Cierre operativo` si se aprueba.

Pendientes futuros/técnicos:

- distancia vial estimada mediante motor de rutas, separada de la distancia GPS actual;
- recuperación WhatsApp OTP;
- code splitting;
- auditoría integral frontend permissions ↔ RLS;
- CORS restrictivo de Edge Functions;
- revisión Storage/SECURITY DEFINER;
- protección formal de `main`.
