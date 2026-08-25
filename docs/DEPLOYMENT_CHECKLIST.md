# Checklist de publicación — Gestión de Ventas Diaria

Baseline actual: **V0.6.4**.

> Este checklist refleja el flujo productivo real usado actualmente. No asumir autodeploy desde `main`: un release solo se considera productivo después de confirmar Wrangler/Cloudflare.

---

# 1. Antes de desarrollar

- Confirmar versión productiva actual.
- Leer `PROJECT_HANDOFF.md`.
- Leer `docs/REQUIREMENTS_STATUS.md`.
- Verificar `main` real en GitHub.
- Verificar Supabase si el cambio toca datos, vistas, funciones, RLS, migraciones o autenticación.
- Crear rama feature desde `main` estable.
- No modificar directamente `main` para cambios funcionales.

Si el cambio afecta rutas, visitas, cierre de jornada, Auth o RLS, coordinar una ventana segura y evitar pruebas destructivas con usuarios en operación.

---

# 2. Validación de desarrollo

Antes del PR:

- ejecutar build;
- revisar errores TypeScript/Vite;
- probar localmente el flujo afectado;
- validar responsive cuando aplique;
- revisar permisos por perfil;
- comprobar que no se agregaron secretos;
- comprobar que no se modificaron datos maestros accidentalmente.

Comando:

```bash
npm run build
```

Para desarrollo local:

```bash
npm run dev
```

Prueba aislada opcional:

```bash
npm run dev -- --host 127.0.0.1
```

V0.6.4 desregistra/limpia el Service Worker productivo en localhost para evitar que una caché vieja intercepte Vite.

El warning actual de chunks >500 kB no bloquea build; el code splitting es deuda técnica no crítica.

---

# 3. Cambios Supabase

Si NO hay cambios de base de datos, omitir esta sección.

Si hay DDL/migración:

1. inspeccionar objetos reales de Supabase;
2. revisar columnas, constraints, triggers, funciones, vistas y RLS afectadas;
3. revisar `supabase_migrations.schema_migrations`;
4. comparar con archivos GitHub;
5. crear solo una migración incremental;
6. validar compatibilidad con producción vigente;
7. aplicar de forma controlada;
8. comprobar grants y `security_invoker/security_definer`;
9. comprobar que no se rompió RLS;
10. documentar el resultado.

**Nunca hacer replay ciego, recreación destructiva o `db push` masivo solo porque los nombres de archivo no coincidan exactamente con el ledger.**

---

# 4. Pull Request

El PR debe indicar:

- objetivo;
- módulos afectados;
- si cambia Supabase;
- si cambia RLS/Auth;
- migraciones aplicadas;
- riesgos;
- pruebas realizadas;
- qué debe validar el usuario;
- si requiere cerrar/actualizar la app durante el release.

Antes de merge:

- CI/build SUCCESS;
- validación local;
- validación funcional del usuario cuando corresponda;
- no dejar archivos temporales, datos sensibles ni artefactos innecesarios.

---

# 5. Merge y sincronización local

Después de aprobar el PR:

1. merge a `main`;
2. GitHub Desktop → cambiar a `main`;
3. `Fetch origin`;
4. usar `Pull origin` si aparece;
5. confirmar `0 changed files` antes del build productivo.

Entorno Windows observado:

`C:\Users\KARAKA-PC\Documents\GitHub\Gestion_de_Ventas_Diaria`

En ese equipo `git` no está disponible en PATH desde CMD; usar GitHub Desktop para ramas/fetch/pull. `npm`/Wrangler sí forman parte del flujo operativo observado.

Existe un stash histórico relacionado con `package-lock.json`; no restaurarlo/eliminarlo/commitearlo incidentalmente durante un release.

---

# 6. Build productivo

En CMD abierto en la carpeta correcta:

```bash
npm run build
```

Debe terminar con `built in ...` sin error.

Comprobar que el encabezado de npm muestre la versión esperada, por ejemplo:

```text
> gestion-de-ventas-diaria@0.6.4 build
```

No continuar con deploy si el build falla.

---

# 7. Deploy Cloudflare

Después del build exitoso:

```bash
npm run deploy
```

Wrangler usa el `dist/wrangler.json` generado por el build cuando corresponde.

Confirmar en la salida:

- assets cargados;
- `Uploaded gestion-de-ventas-diaria`;
- `Deployed gestion-de-ventas-diaria triggers`;
- URL productiva;
- **Current Version ID**.

URL actual:

`https://gestion-de-ventas-diaria.jjriosjose.workers.dev`

Último Version ID V0.6.4 confirmado antes de este bloque documental:

`9ec25487-eee2-432e-8d13-1c0b09c52028`

No considerar un release desplegado solo por hacer merge en GitHub.

---

# 8. Smoke test de producción

Después del deploy:

- abrir URL productiva;
- usar `Ctrl + F5` o reabrir si cambió frontend/PWA;
- comprobar versión visible;
- login;
- Inicio;
- módulo modificado;
- permisos del rol relevante;
- PDF/Excel si fueron afectados;
- responsive si aplica.

No ejecutar pruebas destructivas en producción innecesariamente.

Para cambios de rutas/visitas validar especialmente:

- no hay visita duplicada;
- ruta correcta para la fecha;
- cierre no permite visita/eventualidad activa;
- pendientes mantienen semántica correcta;
- `ended_at` congela la jornada;
- cobertura real no se confunde con cierre operativo.

---

# 9. Cuándo pedir a usuarios cerrar o actualizar

## Cambio visual/frontend normal

- usuarios pueden seguir trabajando;
- después del deploy actualizar página o reabrir app;
- normalmente no requiere logout.

## Auth/RLS/base/reglas críticas

- coordinar ventana breve;
- evitar operaciones críticas durante cambio;
- puede requerir logout/login.

## Rutas/visitas activas

Evitar deploy profundo de lógica operativa mientras existan visitas/rutas críticas activas, salvo que el cambio esté confirmado como compatible.

Antes de cada release comunicar claramente uno de estos mensajes:

- `Pueden seguir trabajando; solo actualicen la página al terminar el deploy.`
- `Eviten iniciar nuevas operaciones durante la actualización.`
- `Cierren sesión/app temporalmente antes del cambio.`

---

# 10. Documentación de cierre del release

Después de un release productivo:

- actualizar `PROJECT_HANDOFF.md`;
- actualizar `docs/REQUIREMENTS_STATUS.md`;
- actualizar `CHANGELOG.md`;
- actualizar `docs/IMPLEMENTATION_STATUS.md` si cambió estado funcional;
- registrar versión y Cloudflare Version ID;
- registrar migraciones nuevas;
- registrar bugs conocidos/regresión útil;
- mover requerimientos completados desde Pendiente → Terminado.

No es necesario actualizar el handoff por cada clic o microcambio; sí al cerrar releases y cambios importantes de arquitectura/reglas.

---

# 11. Seguridad y secretos

Nunca incluir en commits/documentación:

- contraseñas de usuarios;
- tokens;
- service role;
- claves privadas;
- secrets de Cloudflare/Supabase;
- archivos maestros con datos de clientes;
- `.env` privados.

La clave pública/publishable del frontend debe estar protegida por RLS y nunca sustituye controles backend.

Pendientes técnicos de seguridad a mantener visibles:

- auditoría `access_profile/permission_overrides` vs `app_role/RLS`;
- CORS restrictivo de Edge Functions al dominio productivo;
- revisión Storage/SECURITY DEFINER;
- protección formal de `main`.
