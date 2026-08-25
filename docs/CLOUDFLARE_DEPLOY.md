# Despliegue Cloudflare — Gestión de Ventas Diaria

Baseline auditado: **V0.6.4**.

El proyecto usa Cloudflare Workers + Static Assets mediante `@cloudflare/vite-plugin`, `wrangler.jsonc` y Wrangler.

Backend de datos: **Supabase**. Cloudflare no sustituye PostgreSQL/Auth/RLS/Storage/PostGIS.

---

## Producción actual

URL:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último Version ID V0.6.4 confirmado antes de esta actualización documental:

`9ec25487-eee2-432e-8d13-1c0b09c52028`

Deploy observado:

- Windows.
- Wrangler `4.125.0` en el último release V0.6.4.
- ejecución manual desde repositorio local sincronizado.

---

## Flujo real recomendado

1. Desarrollar en rama feature.
2. Ejecutar build y pruebas.
3. Abrir PR.
4. Validar localmente con el usuario cuando corresponda.
5. Merge aprobado a `main`.
6. GitHub Desktop → `main` → `Fetch origin` / `Pull origin` si aparece.
7. Confirmar working tree limpio.
8. En CMD, dentro del repositorio:

```bash
npm run build
```

9. Si el build finaliza correctamente:

```bash
npm run deploy
```

10. Registrar la URL y el `Current Version ID` entregado por Wrangler.
11. Hacer smoke test de producción.
12. Actualizar `PROJECT_HANDOFF.md`, `CHANGELOG.md` y `docs/REQUIREMENTS_STATUS.md` cuando sea un release funcional.

---

## Importante: no asumir autodeploy

Aunque el repositorio pueda estar conectado a Cloudflare, el proceso productivo confirmado actualmente es el deploy manual con Wrangler.

Por tanto:

- merge a `main` **no significa automáticamente producción**;
- un commit documental posterior puede existir en `main` sin que Cloudflare esté ejecutando ese commit;
- la versión productiva se confirma por la salida real de Wrangler/Cloudflare y su Version ID.

---

## Configuración redirigida de Wrangler

En builds Vite/Cloudflare actuales, Wrangler puede mostrar mensajes como:

```text
Using redirected Wrangler configuration.
Configuration being used: dist\wrangler.json
Original user's configuration: wrangler.jsonc
Deploy configuration file: .wrangler\deploy\config.json
```

Eso ha sido observado como comportamiento normal del flujo actual.

---

## PWA / caché después del deploy

En producción se mantiene Service Worker/PWA.

Después de actualizar frontend:

- usar `Ctrl + F5` si se sospecha caché anterior;
- o cerrar/reabrir la PWA/navegador.

En desarrollo local V0.6.4 evita que el Service Worker productivo controle `localhost`, `127.0.0.1` o `::1`.

---

## Cuándo detener operación

No todos los deploys requieren cerrar la app.

### Visual/frontend compatible

Los usuarios pueden continuar y refrescar después del deploy.

### Cambios de Auth/RLS/esquema/reglas críticas

Coordinar ventana breve y evitar operaciones críticas durante el cambio.

### Cambios profundos de rutas/visitas

Evitar desplegar mientras existan visitas abiertas o jornadas críticas activas, salvo compatibilidad confirmada.

---

## Rollback

Conservar siempre en `PROJECT_HANDOFF.md`:

- Version ID actual;
- Version ID anterior conocido;
- commit de aplicación desplegado;
- referencia de rollback si existe.

No hacer rollback improvisado únicamente desde un commit documental; primero identificar el **último artefacto de aplicación** que realmente estuvo desplegado.

---

## Seguridad

- No guardar tokens de Cloudflare en GitHub/documentación.
- No guardar secrets de Supabase.
- No guardar archivos `.env` privados.
- Cloudflare no necesita acceso a credenciales de base de datos si el frontend consume Supabase mediante configuración pública autorizada + RLS.

Ver también `docs/DEPLOYMENT_CHECKLIST.md`.
